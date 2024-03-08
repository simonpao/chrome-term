let terminal = {
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
    registeredCmd: {}
} ;

function initWindow(columns, rows, timeout, debugMode) {
    if(columns < 30) throw "Minimum of 30 columns."
    if(columns > 100) throw "Maximum of 100 columns."
    if(rows < 15) throw "Minimum of 15 rows required."
    if(rows > 100) throw "Maximum of 100 rows."

    try {
        let jsTerminalProgramInputJson = localStorage.getItem('js-terminal--programInput');
        let tmpProgramInput = JSON.parse(jsTerminalProgramInputJson) ;
        if( tmpProgramInput !== null) terminal.program.input = tmpProgramInput ;
    } catch(e) {}

    terminal.columns = columns ;
    terminal.rows = rows ;
    if( timeout > 0 && typeof timeout === "number")
        terminal.defaultTimeout = timeout ;

    let $terminalContainer = $("#terminal-container") ;

    // Add required HTML elements
    $terminalContainer
        .attr("inputmode", "text")
        .attr("tabindex", "0")
        .attr("onfocus", "$('#terminal-input').focus();")
        .html(
            "<div id=\"terminal-window\"></div>" +
            "<label style=\"display: block; opacity: 0;\">" +
            "<input id=\"terminal-input\" type=\"text\" inputmode=\"text\" style=\"display:block; width:100%;\"/>" +
            "</label>"
        );

    if(debugMode) {
        terminal.debugMode = true ;
        $terminalContainer.append(
            $("<pre id='debug-output'></pre>").css("width", (12*columns) + "px" )
        ) ;
    }

    for(let y = 0 ; y < rows ; y++) {
        $("#terminal-window").append(`<div class="char-row char-row-${y}"></div>`) ;
        let $charRow = $(`.char-row-${y}`) ;
        terminal.display.data[y] = [] ;
        for(let x = 0 ; x < columns ; x++) {
            $charRow.append(`<div class="char-box char-box-${x}"></div>`) ;
        }
    }
}

function insertNewLine() {
    terminal.y++ ;
    if( terminal.y === terminal.rows ) {
        scrollTerminalContents() ;
    }
    terminal.x = 0 ;
}

function backspace() {
    if(terminal.x === 0) {
        if(terminal.y === 0) return ;
        terminal.y-- ;
        terminal.x = terminal.columns ;
    }
    terminal.x-- ;
}

function scrollTerminalContents() {
    for(let row in terminal.display.data) {
        if( row > 0 )
            terminal.display.data[row-1] = terminal.display.data[row] ;
    }
    terminal.display.data[terminal.display.data.length-1] = [] ;
    $(".char-box").text("") ;
    refresh() ;
    terminal.y-- ;
}

function returnStatus() {
    return terminal.status ;
}

function clr() {
    $(".char-box").text("") ;
    for(let y in terminal.display.data) {
        for(let x in terminal.display.data[y]) {
            terminal.display.data[y][x] = { char: "&nbsp;", color: terminal.display.color } ;
        }
    }
}

function refresh() {
    for(let y = 0 ; y < terminal.rows ; y++) {
        let $charRow = $(`.char-row-${y}`) ;
        for(let x = 0 ; x < terminal.columns ; x++) {
            if( terminal.display.data[y] && terminal.display.data[y][x] )
                $charRow.find(`.char-box-${x}`).html( $(`<span style='color: ${terminal.display.data[y][x].color};'>${terminal.display.data[y][x].char}</span>`) ) ;
            else
                $charRow.find(`.char-box-${x}`).html("") ;
        }
    }
}

async function incrementCharPos(timeout) {
    terminal.x++ ;
    if(terminal.x === terminal.columns)
        insertNewLine() ;
    if( timeout > 0 )
        await sleep( timeout ) ;
}

function setCharPos(x, y) {
    if( isNaN(x) || x >= terminal.columns ) throw "x coordinate "+x+" out of bounds."
    if( isNaN(y) || y >= terminal.rows )    throw "y coordinate "+y+" out of bounds."

    terminal.x = x ;
    terminal.y = y ;
}

function insertCarrot(carrot) {
    $(`.char-row-${terminal.y} .char-box-${terminal.x}`).html(carrot);
}

async function print(data, timeout) {
    timeout = typeof timeout === "number" && timeout >= 0 ? timeout : terminal.defaultTimeout ;
    if(terminal.program.suppressOutput) return ;

    let chars = data.split("") ;

    for( let c in chars ) {
        let $charBox = $(`.char-row-${terminal.y} .char-box-${terminal.x}`) ;

        switch(chars[c]) {
            case "\n":
                insertNewLine() ;
                break ;
            case " ":
                terminal.display.data[terminal.y][terminal.x] = { char: "&nbsp;", color: terminal.display.color } ;
                $charBox.html("&nbsp;") ;
                await incrementCharPos(timeout) ;
                break ;
            default:
                terminal.display.data[terminal.y][terminal.x] = { char: chars[c], color: terminal.display.color } ;
                $charBox.html($(`<span style='color: ${terminal.display.color};'></span>`).text(chars[c])) ;
                await incrementCharPos(timeout) ;
                break ;
        }
    }
}

async function println(data, timeout) {
    data += "\n" ;
    await print(data, timeout) ;
}

async function printAt(data, x, y, timeout) {
    setCharPos(x, y) ;
    await print(data, timeout) ;
}

async function printlnAt(data, x, y, timeout) {
    data += "\n" ;
    await printAt(data, x, y, timeout) ;
}

async function inputText(prompt) {
    prompt = prompt ? prompt : terminal.display.prompt ;

    await print(prompt) ;

    $(`.char-row-${terminal.y} .char-box-${terminal.x}`).html(terminal.display.carrot) ;

    return new Promise((resolve) => {
        let userIn = [] ;
        initListeners(parseInput, userIn, resolve) ;
    });
}

function initListeners(callback, userIn, resolve) {
    let $terminalInput = $("#terminal-input") ;

    $("#terminal-container").keydown(e => {
        if( $terminalInput.val() === "" ) {
            logDebugInfo("e.which = " + e.which + "; e.keyCode = " + e.keyCode);
            callback(e.keyCode, e.key, userIn, resolve, $terminalInput.is(":focus"));
        }
    }) ;

    // Mobile workaround
    $terminalInput.on("input", e => {
        let chars = $terminalInput.val().split("") ;
        logDebugInfo("charToKeyCode(chars[i]) = " + charToKeyCode(chars[0]) + "; chars[0] = " + chars[0]) ;
        for(let i in chars) {
            callback(charToKeyCode(chars[i]), chars[i], userIn, resolve);
        }
        $terminalInput.val("") ;
    }) ;
}

function removeListeners() {
    $("#terminal-container").off("keydown") ;
    $("#terminal-input").off("input") ;
}

function charToKeyCode(char) {
    let asciiCode = char.toUpperCase().charCodeAt(0) ;
    if ((asciiCode > 47  && asciiCode < 58) || // number keys
         asciiCode === 32                   || // space bar
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

async function parseInput(keyCode, char, userIn, resolve, limit) {
    switch(keyCode) {
        case 13:
            removeListeners() ;
            insertCarrot("") ;
            await print("\n", 0) ;
            resolve(userIn.join("")) ;
            break ;
        case 8:
            insertCarrot("") ;
            backspace() ;
            insertCarrot(terminal.display.carrot);
            userIn.pop() ;
            break ;
        default:
            if( limit ) break ;
            if ((keyCode > 47  && keyCode < 58)    || // number keys
                 keyCode === 32                    || // space bar
                (keyCode > 64  && keyCode < 91)    || // letter keys
                (keyCode > 95  && keyCode < 112)   || // numpad keys
                (keyCode > 185 && keyCode < 193)   || // ;=,-./` (in order)
                (keyCode > 218 && keyCode < 223)) {   // [\]' (in order)
                char = char.toUpperCase() ;
                userIn.push(char);
                await print(char, 0);
                insertCarrot(terminal.display.carrot);
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
async function processCmd(command) {
    if( command === "" ) return "" ;

    logDebugInfo("Incoming command: " + command) ;

    let args = command.split(" ") ;

    let cmd = args[0].toUpperCase() ;
    if( typeof terminal.registeredCmd[cmd] !== "undefined" ) {
        return await terminal.registeredCmd[cmd].callback(args) ;
    }

    // If this is a line number, add it to the program.input array
    if(!isNaN(args[0])) {
        let lineNum = parseInt(args[0]) ;
        terminal.program.input[lineNum] = args.slice(1).join(" ") ;
        setLocalStorage() ;
        return args.slice(1).join(" ") ;
    }

    let out = "\"" + args[0] + "\" is not recognized as a valid command."
    await println( out ) ;
    return out ;
}

/**
 * Registers a new command with the terminal
 * @param name    - The command name
 * @param options - The command options
 *   example: { args: [ "x", "y" ], callback: setCursorCmd }
 */
function registerCmd(name, options) {
    terminal.registeredCmd[name] = options;
    terminal.registeredCmd = sortObject(terminal.registeredCmd) ;
}

async function startInputLoop() {
    let command = ""
    while(command.toUpperCase() !== "EXIT") {
        command = await inputText() ;
        let output = await processCmd(command) ;
        if(returnStatus() !== 0)
            await println("Command returned non-zero status code: " + returnStatus()) ;
        logDebugInfo("Command output: " + output) ;
    }
    return returnStatus() ;
}

async function setLocalStorage() {
    let jsonString = JSON.stringify(terminal.program.input) ;
    localStorage.setItem('js-terminal--programInput', jsonString);
}

async function sleep(timeout) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, timeout);
    });
}

function sortObject(unordered) {
    return Object.keys(unordered).sort().reduce(
        (obj, key) => {
            obj[key] = unordered[key];
            return obj;
        },
        {}
    );
}

function rnd(max) {
    return Math.floor(Math.random() * (parseInt(max)+1));
}

function logDebugInfo(msg) {
    if( !terminal.debugMode ) return ;
    $("#debug-output").prepend( msg + "\n" );
}