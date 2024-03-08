class ChromeTerminal {
    terminal = {
        x: 0,
        y: 0,
        status: 0, // Response code set by returning program
        debugMode: false,
        defaultTimeout: 0,
        columns: 60,
        rows: 20,
        display: {
            prompt: "$\u0000",
            carrot: "█",
            color: "white",
            data: [],
        },
        program: {
            input: [],
            variables: {},
            suppressOutput: false,
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
            let jsTerminalProgramInputJson = localStorage.getItem(`${this.terminal.localStoragePrefix}--programInput`);
            let tmpProgramInput = JSON.parse(jsTerminalProgramInputJson) ;
            if( tmpProgramInput !== null) this.terminal.program.input = tmpProgramInput ;
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
                "<input id=\"terminal-input\" type=\"text\" inputmode=\"text\" style=\"display:block; width:100%;\"/>" +
                "</label>"
            );

        $terminalContainer.on("focus", () => {
            $('#terminal-input').focus();
        }) ;

        if(options.debugMode) {
            this.terminal.debugMode = true ;
            $terminalContainer.append(
                $("<pre id='debug-output'></pre>").css("width", (12*columns) + "px" )
            ) ;
        }

        for(let y = 0 ; y < rows ; y++) {
            $("#terminal-window").append(`<div class="char-row char-row-${y}"></div>`) ;
            let $charRow = $(`.char-row-${y}`) ;
            this.terminal.display.data[y] = [] ;
            for(let x = 0 ; x < columns ; x++) {
                $charRow.append(`<div class="char-box char-box-${x}"></div>`) ;
            }
        }
    }

    insertNewLine() {
        this.terminal.y++ ;
        if( this.terminal.y === this.terminal.rows ) {
            this.scrollTerminalContents() ;
        }
        this.terminal.x = 0 ;
    }

    backspace() {
        if(this.terminal.x === 0) {
            if(this.terminal.y === 0) return ;
            this.terminal.y-- ;
            this.terminal.x = this.terminal.columns ;
        }
        this.terminal.x-- ;
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
    }

    returnStatus() {
        return this.terminal.status ;
    }

    clr() {
        $(".char-box").text("") ;
        for(let y in this.terminal.display.data) {
            for(let x in this.terminal.display.data[y]) {
                this.terminal.display.data[y][x] = { char: "&nbsp;", color: this.terminal.display.color } ;
            }
        }
    }

    refresh() {
        for(let y = 0 ; y < this.terminal.rows ; y++) {
            let $charRow = $(`.char-row-${y}`) ;
            for(let x = 0 ; x < this.terminal.columns ; x++) {
                if( this.terminal.display.data[y] && this.terminal.display.data[y][x] )
                    $charRow.find(`.char-box-${x}`).html(
                        $(`<span style='color: ${this.terminal.display.data[y][x].color};'>${this.terminal.display.data[y][x].char}</span>`)
                    ) ;
                else
                    $charRow.find(`.char-box-${x}`).html("") ;
            }
        }
    }

    async incrementCharPos(timeout) {
        this.terminal.x++ ;
        if(this.terminal.x === this.terminal.columns)
            this.insertNewLine() ;
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

    insertCarrot(carrot) {
        $(`.char-row-${this.terminal.y} .char-box-${this.terminal.x}`).html(carrot);
    }

    async print(data, timeout) {
        timeout = typeof timeout === "number" && timeout >= 0 ? timeout : this.terminal.defaultTimeout ;
        if(this.terminal.program.suppressOutput) return ;

        let chars = data.split("") ;

        for( let c in chars ) {
            let $charBox = $(`.char-row-${this.terminal.y} .char-box-${this.terminal.x}`) ;

            switch(chars[c]) {
                case "\n":
                    this.insertNewLine() ;
                    break ;
                case " ":
                    this.terminal.display.data[this.terminal.y][this.terminal.x] = {
                        char: "&nbsp;",
                        color: this.terminal.display.color
                    } ;
                    $charBox.html("&nbsp;") ;
                    await this.incrementCharPos(timeout) ;
                    break ;
                default:
                    this.terminal.display.data[this.terminal.y][this.terminal.x] = {
                        char: chars[c],
                        color: this.terminal.display.color
                    } ;
                    $charBox.html($(`<span style='color: ${this.terminal.display.color};'></span>`).text(chars[c])) ;
                    await this.incrementCharPos(timeout) ;
                    break ;
            }
        }
    }

    async println(data, timeout) {
        data += "\n" ;
        await this.print(data, timeout) ;
    }

    async printAt(data, x, y, timeout) {
        this.setCharPos(x, y) ;
        await this.print(data, timeout) ;
    }

    async printlnAt(data, x, y, timeout) {
        data += "\n" ;
        await this.printAt(data, x, y, timeout) ;
    }

    async inputText(prompt) {
        prompt = prompt ? prompt : this.terminal.display.prompt ;

        await this.print(prompt) ;

        $(`.char-row-${this.terminal.y} .char-box-${this.terminal.x}`).html(this.terminal.display.carrot) ;

        return new Promise((resolve) => {
            let userIn = [] ;
            this.initListeners(this.parseInput.bind(this), userIn, resolve) ;
        });
    }

    initListeners(callback, userIn, resolve) {
        let $terminalInput = $("#terminal-input") ;

        $("#terminal-container").on("keydown", e => {
            if( $terminalInput.val() === "" ) {
                this.logDebugInfo("e.which = " + e.which + "; e.keyCode = " + e.keyCode);
                callback(e.keyCode, e.key, userIn, resolve, $terminalInput.is(":focus"));
            }
        }) ;

        // Mobile workaround
        $terminalInput.on("input", e => {
            let chars = $terminalInput.val().split("") ;
            this.logDebugInfo("charToKeyCode(chars[i]) = " + this.charToKeyCode(chars[0]) + "; chars[0] = " + chars[0]) ;
            for(let i in chars) {
                callback(this.charToKeyCode(chars[i]), chars[i], userIn, resolve);
            }
            $terminalInput.val("") ;
        }) ;
    }

    removeListeners() {
        $("#terminal-container").off("keydown") ;
        $("#terminal-input").off("input") ;
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

    async parseInput(keyCode, char, userIn, resolve, limit) {
        switch(keyCode) {
            case 13:
                this.removeListeners() ;
                this.insertCarrot("") ;
                await this.print("\n", 0) ;
                resolve(userIn.join("")) ;
                break ;
            case 8:
                this.insertCarrot("") ;
                this.backspace() ;
                this.insertCarrot(this.terminal.display.carrot);
                userIn.pop() ;
                break ;
            default:
                if( limit ) break ;
                if ((keyCode > 47  && keyCode < 58)    || // number keys
                    keyCode === 32                     || // space bar
                    (keyCode > 64  && keyCode < 91)    || // letter keys
                    (keyCode > 95  && keyCode < 112)   || // numpad keys
                    (keyCode > 185 && keyCode < 193)   || // ;=,-./` (in order)
                    (keyCode > 218 && keyCode < 223)) {   // [\]' (in order)
                    char = char.toUpperCase() ;
                    userIn.push(char);
                    await this.print(char, 0);
                    this.insertCarrot(this.terminal.display.carrot);
                }
                break ;
        }
    }

    /**
     * Takes a command, prints to screen, then returns output.
     *
     * @param command
     * @returns {Promise<string>}
     */
    async processCmd(command) {
        if( command === "" ) return "" ;

        this.logDebugInfo("Incoming command: " + command) ;

        let args = command.split(" ") ;

        let cmd = args[0].toUpperCase() ;
        if( typeof this.terminal.registeredCmd[cmd] !== "undefined" ) {
            return await this.terminal.registeredCmd[cmd].callback(args) ;
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
            command = await this.inputText() ;
            let output = await this.processCmd(command) ;
            if(this.returnStatus() !== 0)
                await this.println("Command returned non-zero status code: " + this.returnStatus()) ;
            this.logDebugInfo("Command output: " + output) ;
        }
        return this.returnStatus() ;
    }

    async setLocalStorage() {
        let jsonString = JSON.stringify(this.terminal.program.input) ;
        localStorage.setItem(`${this.terminal.localStoragePrefix}--programInput`, jsonString);
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
}