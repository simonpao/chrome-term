class ChromeTerminal {
    terminal = {
        x: 0,
        y: 0,
        in: { x: 0, y: 0 },
        status: 0, // Response code set by returning program
        debugMode: false,
        defaultTimeout: 0,
        columns: 60,
        rows: 20,
        display: {
            prompt: "$\u0000",
            carrot: "█",
            color: "white",
            theme: "default",
            printPath: true,
            path: "/",
            printAccount: true,
            account: "Chrome",
            data: [],
            cmdHistory: new CommandHistoryStack(),
            printPrompt: true,
            printedLines: 0,
            autoPauseOnOverflow: true,
            stopPrinting: false,
            paused: false
        },
        program: {
            input: [],
            variables: {},
            suppressOutput: false,
            aliases: {},
            executing: false
        },
        registeredCmd: {},
        localStoragePrefix: "chrome-term"
    } ;

    constructor(columns, rows, timeout, options = {}) {
        if(columns < 30) throw "Minimum of 30 columns."
        if(columns > 100) throw "Maximum of 100 columns."
        if(rows < 15) throw "Minimum of 15 rows required."
        if(rows > 100) throw "Maximum of 100 rows."

        try {
            let jsTerminalProgramJson = localStorage.getItem(`${this.terminal.localStoragePrefix}--programInput`);
            let tmpProgram = JSON.parse(jsTerminalProgramJson) ;
            if( tmpProgram !== null)
                this.terminal.program = tmpProgram ;
            this.terminal.program.executing = false ;
        } catch(e) {}

        this.terminal.columns = columns ;
        this.terminal.rows = rows ;
        if( timeout > 0 && typeof timeout === "number")
            this.terminal.defaultTimeout = timeout ;

        let $terminalContainer = $("#terminal-container") ;

        // Add required HTML elements
        $terminalContainer
            .attr("inputmode", "text")
            .attr("tabindex", "0")
            .html(
                "<div id=\"terminal-window\"></div>" +
                "<label style=\"display: block; opacity: 0;\">" +
                "<input id=\"terminal-input\" type=\"text\" inputmode=\"text\" style=\"display:block;\"/>" +
                "</label>"
            );

        $terminalContainer.on("focus", () => {
            $('#terminal-input').focus();
        }) ;

        if(typeof options["debugMode"] === "boolean") {
            this.terminal.debugMode = options["debugMode"] ;
            if(this.terminal.debugMode)
                $terminalContainer.append(
                    $("<pre id='debug-output'></pre>").css("width", (12*columns) + "px" )
                ) ;
        }

        if(typeof options["promptChar"] === "string") {
            this.terminal.display.prompt = `${options["promptChar"]}\u0000` ;
        } else {
            this.terminal.display.prompt = "$\u0000" ;
        }

        if(typeof options["printPath"] === "boolean") {
            this.terminal.display.printPath = options["printPath"] ;
        } else {
            this.terminal.display.printPath = true ;
        }

        if(typeof options["printAccount"] === "boolean") {
            this.terminal.display.printAccount = options["printAccount"] ;
        } else {
            this.terminal.display.printAccount = true ;
        }

        if(typeof options["autoPauseOnOverflow"] === "boolean") {
            this.terminal.display.autoPauseOnOverflow = options["autoPauseOnOverflow"] ;
        } else {
            this.terminal.display.autoPauseOnOverflow = true ;
        }

        for(let y = 0 ; y < rows ; y++) {
            $("#terminal-window").append(`<div class="char-row char-row-${y}"></div>`) ;
            let $charRow = $(`.char-row-${y}`) ;
            this.terminal.display.data[y] = [] ;
            for(let x = 0 ; x < columns ; x++) {
                $charRow.append(`<div class="char-box char-box-${x}"></div>`) ;
            }
        }

        try {
            let jsTerminalDisplayJson = localStorage.getItem(`${this.terminal.localStoragePrefix}--display`);
            let tmpDisplay = JSON.parse(jsTerminalDisplayJson) ;
            if( tmpDisplay.display && typeof tmpDisplay.x === "number" &&
                typeof tmpDisplay.y === "number" && tmpDisplay.in ) {
                this.clr() ;
                let prompt = this.terminal.display.prompt ;
                let printPath = this.terminal.display.printPath ;
                let printAccount = this.terminal.display.printAccount ;
                let autoPauseOnOverflow = this.terminal.display.autoPauseOnOverflow ;
                this.terminal.display = tmpDisplay.display ;
                this.terminal.display.cmdHistory = new CommandHistoryStack(tmpDisplay.display.cmdHistory) ;
                this.terminal.display.prompt = prompt ;
                this.terminal.display.printPath = printPath ;
                this.terminal.display.printAccount = printAccount ;
                this.terminal.display.autoPauseOnOverflow = autoPauseOnOverflow ;
                this.terminal.display.printedLines = 0 ;
                this.terminal.display.stopPrinting = false ;
                this.terminal.display.paused = false ;
                if(typeof this.terminal.display.theme === "undefined")
                    this.terminal.display.theme = "default";
                $("#terminal-window").addClass(this.terminal.display.theme) ;
                this.terminal.x = tmpDisplay.x ;
                this.terminal.y = tmpDisplay.y ;
                this.terminal.in = tmpDisplay.in ;
                this.refresh() ;
                this.setCharPos(this.terminal.x, this.terminal.y) ;
            }
        } catch(e) {}
    }

    async pauseInput(keyCode, char, userIn, resolve) {
        switch(keyCode) {
            case 13: // Carriage Return
                this.removeListeners({ namespace: "pauseInput" }) ;
                this.insertCarrot("") ;
                await this.print("\n", 0) ;
                resolve(userIn.join("")) ;
                this.saveUserInput([]) ;
                break ;
            case 8: // Backspace
                this.insertCarrot("") ;
                this.backspace() ;
                this.insertCarrot(this.terminal.display.carrot);
                userIn.pop() ;
                this.saveUserInput(userIn) ;
                break ;
            case 89: // Y
            case 78: // N
                if (userIn.length) return ;
                if (this.isValidAsciiCode(keyCode)) {
                    userIn.push(char);
                    this.saveUserInput(userIn) ;
                    await this.print(char, 0);
                    this.insertCarrot(this.terminal.display.carrot);
                }
                break ;
        }
    }

    pauseConfirm() {
        this.saveDisplayInfo() ;
        this.insertCarrot(this.terminal.display.carrot) ;
        this.terminal.display.paused = true ;

        return new Promise((resolve) => {
            let userIn = [] ;
            this.initListeners(this.pauseInput.bind(this), userIn, resolve, null, { namespace: "pauseInput" }) ;
        });
    }

    async pausePrinting() {
        this.terminal.display.printedLines = 0 ;
        if(!this.terminal.display.autoPauseOnOverflow) return "" ;
        await this.print("Continue? (Y/N)" + this.terminal.display.prompt) ;
        let input = await this.pauseConfirm() ;
        this.terminal.display.paused = false ;
        return input ;
    }

    async insertNewLine() {
        this.terminal.display.printedLines++;
        this.terminal.y++ ;
        if( this.terminal.y === this.terminal.rows ) {
            this.scrollTerminalContents() ;
        }
        this.terminal.x = 0 ;

        if(this.terminal.display.printedLines >= this.terminal.rows-1) {
            let input = await this.pausePrinting() ;
            this.terminal.display.printedLines = 0 ;
            if(input.toUpperCase() === "N")
                this.terminal.display.stopPrinting = true ;
        }
    }

    backspace() {
        let { x, y } = this.getPreviousCharLoc() ;

        if(this.terminal.display.data[y][x].char === "\u0000")
            return false ;

        this.terminal.display.data[y][x].char = "&nbsp;" ;
        this.terminal.x = x ;
        this.terminal.y = y ;
        return true ;
    }

    getPreviousCharLoc() {
        let x = this.terminal.x ;
        let y = this.terminal.y ;


        if(x === 0) {
            if(y === 0) return { x, y } ;
            y-- ;
            x = this.terminal.columns ;
        }
        x-- ;

        return { x, y } ;
    }

    scrollTerminalContents() {
        for(let row in this.terminal.display.data) {
            if( row > 0 )
                this.terminal.display.data[row-1] = this.terminal.display.data[row] ;
        }
        this.terminal.display.data[this.terminal.display.data.length-1] = [] ;
        $(".char-box").text("") ;
        this.refresh() ;
        this.terminal.y-- ;
        this.terminal.in.y-- ;
    }

    returnStatus() {
        return this.terminal.status ;
    }

    clr() {
        $(".char-box").text("") ;
        for(let y in this.terminal.display.data) {
            for(let x in this.terminal.display.data[y]) {
                this.terminal.display.data[y][x] = new TerminalCharacter(
                    "&nbsp;", this.terminal.display.color
                ) ;
            }
        }
    }

    getColor(color) {
        switch(this.terminal.display.theme.toUpperCase()) {
            case "GREEN":
                return "--green-phosphor" ;
            case "AMBER":
                return "--amber-phosphor" ;
            case "DEFAULT":
            default:
                return '--'+color ;
        }
    }

    getCharColor( x, y ) {
        switch(this.terminal.display.theme.toUpperCase()) {
            case "GREEN":
            case "AMBER":
                return this.getColor() ;
            case "DEFAULT":
            default:
                return '--'+this.terminal.display.data[y][x].color ;
        }
    }

    refresh() {
        for(let y = 0 ; y < this.terminal.rows ; y++) {
            let $charRow = $(`.char-row-${y}`) ;
            for(let x = 0 ; x < this.terminal.columns ; x++) {
                if( this.terminal.display.data[y] && this.terminal.display.data[y][x] )
                    $charRow.find(`.char-box-${x}`).html(
                        $(`<span style='color: var(${this.getCharColor(x,y)});'>${this.terminal.display.data[y][x].char}</span>`)
                    ) ;
                else
                    $charRow.find(`.char-box-${x}`).html("") ;
            }
        }
    }

    async incrementCharPos(timeout) {
        this.terminal.x++ ;
        if(this.terminal.x === this.terminal.columns)
            await this.insertNewLine() ;
        if( timeout > 0 )
            await this.sleep( timeout ) ;
    }

    setCharPos(x, y) {
        if( isNaN(x) || x >= this.terminal.columns )
            throw "x coordinate "+x+" out of bounds."
        if( isNaN(y) || y >= this.terminal.rows )
            throw "y coordinate "+y+" out of bounds."

        this.terminal.x = x ;
        this.terminal.y = y ;
    }

    insertCarrot(carrot, backup = false) {
        let $char = $(`.char-row-${this.terminal.y} .char-box-${this.terminal.x}`);

        if(backup) {
            $char.html('');
            let { x, y } = this.getPreviousCharLoc() ;
            $char = $(`.char-row-${y} .char-box-${x}`);
            $char.html(`<span class="blink">${carrot}</span>`);
        } else {
            $char.html(`<span class="blink">${carrot}</span>`);
        }
    }

    insertChar(y, x, char) {
        if(typeof this.terminal.display.data[y] === "undefined")
            this.terminal.display.data[y] = [] ;
        this.terminal.display.data[y][x] = char ;
    }

    async print(data, timeout, color) {
        timeout = typeof timeout === "number" && timeout >= 0 ? timeout : this.terminal.defaultTimeout ;
        if(this.terminal.program.suppressOutput) return ;
        if(this.terminal.display.stopPrinting) return ;

        if(typeof color === "undefined")
            color = this.terminal.display.color ;

        let chars = data.split("") ;

        for( let c in chars ) {
            if(this.terminal.display.stopPrinting) return ;
            let $charBox = $(`.char-row-${this.terminal.y} .char-box-${this.terminal.x}`) ;

            switch(chars[c]) {
                case "\n":
                    await this.insertNewLine() ;
                    break ;
                case " ":
                    this.insertChar(this.terminal.y, this.terminal.x, new TerminalCharacter(
                        "&nbsp;", color
                    )) ;
                    $charBox.html("&nbsp;") ;
                    await this.incrementCharPos(timeout) ;
                    break ;
                default:
                    this.insertChar(this.terminal.y, this.terminal.x, new TerminalCharacter(
                        chars[c], color
                    )) ;
                    $charBox.html($(`<span style='color: var(${this.getColor(color)});'></span>`).text(chars[c])) ;
                    await this.incrementCharPos(timeout) ;
                    break ;
            }
        }

        this.saveDisplayInfo() ;
    }

    async println(data, timeout, color) {
        data += "\n" ;
        await this.print(data, timeout, color) ;
    }

    async printAt(data, x, y, timeout, color) {
        this.setCharPos(x, y) ;
        await this.print(data, timeout, color) ;
    }

    async printlnAt(data, x, y, timeout, color) {
        data += "\n" ;
        await this.printAt(data, x, y, timeout, color) ;
    }

    async inputText(prompt) {
        if(this.terminal.display.printPrompt) {
            await this.printPrompt(prompt) ;
        } else {
            this.terminal.display.printPrompt = true ;
        }

        this.saveDisplayInfo() ;
        this.insertCarrot(this.terminal.display.carrot) ;

        return new Promise((resolve) => {
            let userIn = this.loadUserInput() ;
            this.saveUserInput(userIn) ;
            this.initListeners(this.parseInput.bind(this), userIn, resolve, this.specialKey.bind(this)) ;
        });
    }

    async printPrompt(prompt) {
        prompt = prompt ? prompt : this.terminal.display.prompt ;
        if(this.terminal.display.printAccount) {
            await this.print(`${this.terminal.display.account}`, this.terminal.defaultTimeout, "green");
            if(this.terminal.display.printPath)
                await this.print(":", 0, "white");
        }
        if(this.terminal.display.printPath) {
            await this.print(`~${this.terminal.display.path}`, this.terminal.defaultTimeout, "blue");
        }
        await this.print(prompt);
        this.terminal.in = { x: this.terminal.x, y: this.terminal.y } ;
    }

    initListeners(callback, userIn, resolve, specialKey, options = {}) {
        let $terminalInput = $("#terminal-input") ;
        let namespace = options?.namespace || "parseInput" ;

        $("#terminal-container").on(`keydown.${namespace}`, e => {
            if( $terminalInput.val() === "" ) {
                this.logDebugInfo("e.which = " + e.which + "; e.keyCode = " + e.keyCode);
                callback(e.keyCode, e.key, userIn, resolve, $terminalInput.is(":focus"), specialKey);
                this.saveUserInput(userIn) ;
                this.saveDisplayInfo() ;
                if(e.keyCode === 9) e.preventDefault() ;
            }
        }) ;

        // Mobile workaround
        $terminalInput.on(`input.${namespace}`, e => {
            let chars = $terminalInput.val().split("") ;
            this.logDebugInfo("charToKeyCode(chars[i]) = " + this.charToKeyCode(chars[0]) + "; chars[0] = " + chars[0]) ;
            for(let i in chars) {
                callback(this.charToKeyCode(chars[i]), chars[i], userIn, resolve, false, specialKey);
            }
            $terminalInput.val("") ;
            this.saveUserInput(userIn) ;
            this.saveDisplayInfo() ;
        }) ;

    }

    removeListeners(options) {
        let namespace = options?.namespace || "parseInput" ;
        $("#terminal-container").off(`.${namespace}`) ;
        $("#terminal-input").off(`.${namespace}`) ;
    }

    charToKeyCode(char) {
        let asciiCode = char.toUpperCase().charCodeAt(0) ;
        if ((asciiCode > 47  && asciiCode < 58) || // number keys
            asciiCode === 32                    || // space bar
            (asciiCode > 64  && asciiCode < 91)) { // [\]' (in order)
            return asciiCode ;
        }

        let keyVals = {
            "!": 49, "@": 50, "#": 51, "$": 52, "%": 53, "^": 54, "&": 55, "*": 56,
            "(": 57, ")": 48, "-": 189, "=": 187, "[": 219, "]": 221, "\\": 220, ";": 186,
            "'": 222, ",": 188, ".": 190, "/": 191, "`": 192, "~": 192, "{": 219, "}": 221,
            "|": 220, ":": 186, "\"": 222, "<": 188, ">": 190, "?": 191
        }
        return keyVals[char] ;
    }

    async parseInput(keyCode, char, userIn, resolve, limit, specialKey) {
        if(this.terminal.display.paused) return ;
        switch(keyCode) {
            case 13: // Carriage Return
                this.removeListeners() ;
                this.insertCarrot("") ;
                await this.print("\n", 0) ;
                resolve(userIn.join("")) ;
                this.saveUserInput([]) ;
                break ;
            case 8: // Backspace
                this.insertCarrot("") ;
                this.backspace() ;
                this.insertCarrot(this.terminal.display.carrot);
                userIn.pop() ;
                this.saveUserInput(userIn) ;
                break ;
            case 9:  // Tab
            case 38: // Up Arrow
            case 40: // Down Arrow
                if(typeof specialKey === "function")
                    await specialKey(userIn.join(""), userIn, keyCode) ;
                break ;
            default:
                if( limit ) break ;
                if (this.isValidAsciiCode(keyCode)) {
                    userIn.push(char);
                    this.saveUserInput(userIn) ;
                    await this.print(char, 0);
                    this.insertCarrot(this.terminal.display.carrot);
                }
                break ;
        }
    }

    isValidAsciiCode(keyCode) {
        return (keyCode > 47  && keyCode < 58)    || // number keys
                keyCode === 32                    || // space bar
               (keyCode > 64  && keyCode < 91)    || // letter keys
               (keyCode > 95  && keyCode < 112)   || // numpad keys
               (keyCode > 185 && keyCode < 193)   || // ;=,-./` (in order)
               (keyCode > 218 && keyCode < 223) ;    // [\]' (in order)
    }

    /**
     * On special key, will attempt to evaluate the partial command and
     *  perform some action on it
     */
    async specialKey(command, userIn, keyCode) {
        let result = "" ;
        this.terminal.display.printedLines = 0 ;

        switch(keyCode) {
            case 9: // Tab
                if( command === "" ) return "" ;

                this.logDebugInfo("Incoming partial command: " + command) ;

                let args = command.split(" ") ;

                let cmd = args[0].toUpperCase() ;
                if( typeof this.terminal.registeredCmd[cmd]?.ontab !== "undefined" ) {
                    result = await this.terminal.registeredCmd[cmd].ontab(args, userIn, keyCode) ;
                } else if( args.length === 1 || (!isNaN(args[0]) && args.length === 2)) {
                    let commands = this.#filterCommands(args[args.length-1]) ;
                    if(commands.length === 1) {
                        result = args.length === 2 ? args[0] + " " + commands[0] : commands[0] ;
                    }
                    if(commands.length > 1) {
                        this.insertCarrot("") ;
                        if(commands.length > 100) {
                            await this.println(`\n${commands.length} matches.`) ;
                            await this.printPrompt(this.terminal.display.prompt);
                            this.insertCarrot(this.terminal.display.carrot);
                        } else {
                            await printList(this, commands, "") ;
                        }
                        result = args.join(" ") ;
                    }
                }

                //this.terminal.display.stopPrinting = false ;
                if(typeof result === "string" && result !== "") {
                    userIn.splice( 0, userIn.length ) ;
                    userIn.push(...result.split("")) ;
                    this.setCharPos(this.terminal.in.x, this.terminal.in.y) ;
                    await this.print(result) ;
                    this.insertCarrot(this.terminal.display.carrot);
                }

                break ;
            case 38: // Up Arrow
            case 40: // Down Arrow
                if(keyCode === 40)
                    this.terminal.display.cmdHistory.unshift() ;
                else
                    this.terminal.display.cmdHistory.shift() ;

                let res = this.terminal.display.cmdHistory.stack ;
                this.insertCarrot("") ;
                this.setCharPos(this.terminal.in.x, this.terminal.in.y) ;
                await this.print(this.#spaces(userIn.length)) ;

                userIn.splice( 0, userIn.length ) ;
                userIn.push(...res.split("")) ;
                this.saveUserInput(userIn) ;

                this.setCharPos(this.terminal.in.x, this.terminal.in.y) ;
                await this.print(res) ;
                this.insertCarrot(this.terminal.display.carrot);

                break ;
        }
    }

    #filterCommands(partialCmd) {
        let commands = Object.keys( this.terminal.registeredCmd ) ;
        return commands.filter(item =>
            item?.toLowerCase()?.startsWith(partialCmd?.toLowerCase())
        ) ;
    }

    /**
     * Takes a command, prints to screen, then returns output.
     *
     * @param command
     * @returns {Promise<string>}
     */
    async processCmd(command) {
        if( command === "" ) return "" ;
        this.terminal.status = 0 ;

        if(!this.terminal.program.executing)
            this.terminal.display.printedLines = 0 ;

        this.logDebugInfo("Incoming command: " + command) ;

        let args = command.split(" ") ;
        this.terminal.display.cmdHistory.reset() ;

        let cmd = args[0].toUpperCase() ;
        if( typeof this.terminal.registeredCmd[cmd] !== "undefined" ) {
            if(!this.terminal.program.suppressOutput && !this.terminal.program.executing)
                this.terminal.display.cmdHistory.stack = command ;
            let response = await this.terminal.registeredCmd[cmd].callback(args) ;
            return response.toString() ;
        }

        // Check if it's an alias
        if( typeof this.terminal.program.aliases[cmd] !== "undefined" ) {
            if(!this.terminal.program.suppressOutput && !this.terminal.program.executing)
                this.terminal.display.cmdHistory.stack = command ;
            return await run( this, this.terminal.program.aliases[cmd] ) ;
        }

        // If this is a line number, add it to the program.input array
        if(!isNaN(args[0])) {
            let lineNum = parseInt(args[0]) ;
            this.terminal.program.input[lineNum] = args.slice(1).join(" ") ;
            await this.setLocalStorage() ;
            return args.slice(1).join(" ") ;
        }

        let out = "\"" + args[0] + "\" is not recognized as a valid command."
        await this.println( out ) ;
        return out ;
    }

    /**
     * Registers a new command with the terminal
     * @param name    - The command name
     * @param options - The command options
     *   example: { args: [ "x", "y" ], callback: setCursorCmd }
     */
    registerCmd(name, options) {
        this.terminal.registeredCmd[name] = options;
        this.terminal.registeredCmd = this.sortObject(this.terminal.registeredCmd) ;
    }

    async startInputLoop() {
        let command = ""
        while(command.toUpperCase() !== "EXIT") {
            this.terminal.in = { x: this.terminal.x, y: this.terminal.y } ;
            command = await this.inputText() ;
            let output = await this.processCmd(command) ;
            this.terminal.display.stopPrinting = false ;
            if(this.returnStatus() !== 0)
                await this.println("Command returned non-zero status code: " + this.returnStatus()) ;
            this.logDebugInfo("Command output: " + output) ;
        }
        return this.returnStatus() ;
    }

    async setLocalStorage() {
        this.terminal.program.suppressOutput = false ; // Make sure this is always false on save
        let jsonString = JSON.stringify(this.terminal.program) ;
        localStorage.setItem(`${this.terminal.localStoragePrefix}--programInput`, jsonString) ;
    }

    saveDisplayInfo() {
        this.terminal.display.printPrompt = false ;
        let jsonString = JSON.stringify({
            display: this.terminal.display,
            x: this.terminal.x,
            y: this.terminal.y,
            in: this.terminal.in
        }) ;
        localStorage.setItem(`${this.terminal.localStoragePrefix}--display`, jsonString);
        this.terminal.display.printPrompt = true ;
    }

    saveUserInput(userIn) {
        localStorage.setItem(`${this.terminal.localStoragePrefix}--userInput`, JSON.stringify(userIn));
    }

    loadUserInput() {
        try {
            let userIn = JSON.parse(
                localStorage.getItem(`${this.terminal.localStoragePrefix}--userInput`)
            ) ;
            return Array.isArray(userIn) ? userIn : [] ;
        } catch(e) {
            return [] ;
        }
    }

    async sleep(timeout) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve();
            }, timeout);
        });
    }

    sortObject(unordered) {
        return Object.keys(unordered).sort().reduce(
            (obj, key) => {
                obj[key] = unordered[key];
                return obj;
            },
            {}
        );
    }

    rnd(max) {
        return Math.floor(Math.random() * (parseInt(max)+1));
    }

    logDebugInfo(msg) {
        if( !this.terminal.debugMode ) return ;
        $("#debug-output").prepend( msg + "\n" );
        console.debug(msg) ;
    }

    #spaces(num, char = " ") {
        let spaces = "" ;
        while(num) {
            spaces += char ;
            num-- ;
        }
        return spaces ;
    }
}

class TerminalCharacter {
    constructor(char, color) {
        this.char = char ;
        this.color = color ;
    }
}

class CommandHistoryStack {
    static MAX_COMMANDS = 50 ;
    #stack ;
    #pointer ;

    constructor(stack = []) {
        this.#stack = stack ;
        this.#pointer = -1 ;
    }

    set stack(command) {
        let length = this.#stack.unshift(command) ;
        if(length >= CommandHistoryStack.MAX_COMMANDS)
            this.#stack.splice(CommandHistoryStack.MAX_COMMANDS) ;
    }

    get stack() {
        if(this.#pointer < 0)
            return "" ;
        return this.#stack[this.#pointer] ;
    }

    shift() {
        this.#pointer ++ ;
        if(this.#pointer >= CommandHistoryStack.MAX_COMMANDS || this.#pointer >= this.#stack.length)
            this.#pointer -- ;
    }

    unshift() {
        this.#pointer -- ;
        if(this.#pointer < -1)
            this.#pointer ++ ;
    }

    reset() {
        this.#pointer = -1 ;
    }

    toJSON() {
        return this.#stack ;
    }
}
