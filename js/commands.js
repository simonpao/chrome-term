const VAR_MODE_NONE   = 0 ;
const VAR_MODE_EXPR   = 1 ;
const VAR_MODE_STRING = 2 ;
const VAR_MODE_VAR    = 3 ;

const availableFlags = {
    list:   ["--LIST",   "LIST",   "L"],
    recall: ["--RECALL", "RECALL", "R"],
    delete: ["--DELETE", "DELETE", "D"],
    modifiers: ["D", "L", "R"]
}

function registerDefaultCommands(terminal) {
    terminal.registerCmd( "ADD", {
        args: [ "addend", "addend" ],
        callback: addCmd.bind(terminal),
        help: "./man/commands.json"
    }) ;
    terminal.registerCmd( "ALIAS", {
        callback: aliasCmd.bind(terminal),
        help: "./man/commands.json"
    }) ;
    terminal.registerCmd( "ASSIGN", {
        args: [ "variableValue", "TO", "variableName" ],
        callback: assignmentCmd.bind(terminal),
        help: "./man/commands.json"
    }) ;
    terminal.registerCmd( "CLEAR", {
        callback: clrCmd.bind(terminal),
        help: "./man/commands.json"
    }) ;
    terminal.registerCmd( "CLR", {
        callback: clrCmd.bind(terminal),
        help: "./man/commands.json"
    }) ;
    terminal.registerCmd( "CLS", {
        callback: clrCmd.bind(terminal),
        help: "./man/commands.json"
    }) ;
    terminal.registerCmd( "COLOR", {
        args: [ "color" ],
        callback: colorCmd.bind(terminal),
        help: "./man/commands.json"
    }) ;
    terminal.registerCmd( "DELETE", {
        args: [ "line" ],
        callback: deleteCmd.bind(terminal),
        help: "./man/commands.json"
    }) ;
    terminal.registerCmd( "DIVIDE", {
        args: [ "dividend", "divisor" ],
        callback: divideCmd.bind(terminal),
        help: "./man/commands.json"
    }) ;
    terminal.registerCmd( "DOWNLOAD", {
        callback: downloadCmd.bind(terminal),
        help: "./man/commands.json"
    }) ;
    terminal.registerCmd( "EQUALS", {
        args: [ "operand", "operand" ],
        callback: equalsCmd.bind(terminal),
        help: "./man/commands.json"
    }) ;
    terminal.registerCmd( "EXIT", {
        callback: exitCmd.bind(terminal),
        help: "./man/commands.json"
    }) ;
    terminal.registerCmd( "EXP", {
        args: [ "base", "factor" ],
        callback: exponentCmd.bind(terminal),
        help: "./man/commands.json"
    }) ;
    terminal.registerCmd( "GOTO", {
        args: [ "line-number" ],
        callback: gotoCmd.bind(terminal)
    }) ;
    terminal.registerCmd( "GT", {
        args: [ "operand", "operand" ],
        callback: greaterThanCmd.bind(terminal),
        help: "./man/commands.json"
    }) ;
    terminal.registerCmd( "HELP", {
        args: [ "cmd" ],
        callback: helpCmd.bind(terminal),
        help: "./man/commands.json"
    }) ;
    terminal.registerCmd( "IF", {
        args: [ "conditional", "THEN", "expression", "ELSE", "expression" ],
        callback: ifCmd.bind(terminal),
        help: "./man/commands.json"
    }) ;
    terminal.registerCmd( "LIST", {
        args: [ "start", "end" ],
        callback: listCmd.bind(terminal),
        help: "./man/commands.json"
    }) ;
    terminal.registerCmd( "LOGARITHM", {
        args: [ "argument", "base" ],
        callback: logarithmCmd.bind(terminal),
        help: "./man/commands.json"
    }) ;
    terminal.registerCmd( "LT", {
        args: [ "operand", "operand" ],
        callback: lessThanCmd.bind(terminal),
        help: "./man/commands.json"
    }) ;
    terminal.registerCmd( "MOVE", {
        args: [ "from", "to" ],
        callback: moveCmd.bind(terminal),
        help: "./man/commands.json"
    }) ;
    terminal.registerCmd( "MULTIPLY", {
        args: [ "multiplicand", "multiplier" ],
        callback: multiplyCmd.bind(terminal),
        help: "./man/commands.json"
    }) ;
    terminal.registerCmd( "NEW", {
        callback: newCmd.bind(terminal),
        help: "./man/commands.json"
    }) ;
    terminal.registerCmd( "PRINT", {
        args: [ "text" ],
        callback: printCmd.bind(terminal),
        help: "./man/commands.json"
    }) ;
    terminal.registerCmd( "RND", {
        args: [ "max" ],
        callback: rndCmd.bind(terminal),
        help: "./man/commands.json"
    }) ;
    terminal.registerCmd( "RUN", {
        callback: runCmd.bind(terminal),
        help: "./man/commands.json"
    }) ;
    terminal.registerCmd( "SETCURSOR", {
        args: [ "x", "y" ],
        callback: setCursorCmd.bind(terminal),
        help: "./man/commands.json"
    }) ;
    terminal.registerCmd( "SAVE", {
        args: [ "name", "base" ],
        callback: saveCmd.bind(terminal),
        help: "./man/commands.json"
    }) ;
    terminal.registerCmd( "SQRT", {
        args: [ "radicand", "base" ],
        callback: squareRootCmd.bind(terminal),
        help: "./man/commands.json"
    }) ;
    terminal.registerCmd( "SUBTRACT", {
        args: [ "minuend", "subtrahend" ],
        callback: subtractCmd.bind(terminal),
        help: "./man/commands.json"
    }) ;
    terminal.registerCmd( "SYSTEM", {
        args: [ "parameter" ],
        callback: systemCmd.bind(terminal),
        help: "./man/commands.json"
    }) ;
    terminal.registerCmd( "VARS", {
        callback: listDeclaredVarsCmd.bind(terminal),
        help: "./man/commands.json"
    }) ;
}

async function assignmentCmd(args) {
    let name = "", value = "" ;

    try {
        let tokens = await tokenizeString(this, args.join(" ")) ;
        args = await evalTokens(this, tokens.args, tokens.tokens) ;
    } catch(e) {
        return await cmdErr( this,  `Runtime error; ${e}.`, 1 ) ;
    }

    if(args.length !== 4)
        return await cmdErr( this,  "Syntax error; ASSIGN takes four arguments.", 1 ) ;
    if(args[2].toUpperCase() !== "TO")
        return await cmdErr( this,  "Syntax error; second argument of ASSIGN must be TO.", 1 ) ;

    name = args[3] ;
    if(name.charAt(0) === "$")
        return await cmdErr( this,  "Syntax error; variable name cannot begin with $.", 1 ) ;
    if( !name )
        return await cmdErr( this,  "Syntax error; missing variable name.", 1 ) ;

    value = args[1] ;

    this.terminal.program.variables[name] = value ;
    await this.setLocalStorage() ;
    this.terminal.status = 0 ;
    return value ;
}

async function ifCmd(args) {
    let thenPos = 0, elsePos = 0, trueOrFalse = false, out = "" ;

    for( let i in args ) {
        if(args[i]?.toUpperCase() === "THEN") thenPos = parseInt(i) ;
        if(args[i]?.toUpperCase() === "ELSE") elsePos = parseInt(i) ;
    }

    if(thenPos === 0)
        return await cmdErr( this,  "Syntax error; THEN argument is required for IF statement.", 1 ) ;
    if(thenPos === 1)
        return await cmdErr( this,  "Syntax error; missing conditional after IF.", 1 ) ;
    if(thenPos === args.length-1)
        return await cmdErr( this,  "Syntax error; missing expression after THEN argument.", 1 ) ;
    if(elsePos === args.length-1)
        return await cmdErr( this,  "Syntax error; missing expression after ELSE argument.", 1 ) ;
    if(elsePos === 0) elsePos = args.length ;

    try {
        let condition = extractVarFromArgs(this, args.slice(1,thenPos)) ;
        let result    = await evalExpr( this, condition.value, condition.mode) ;
        if( result === "TRUE" || result > 0 ) trueOrFalse = true ;

        if( trueOrFalse ) {
            let expression = extractVarFromArgs(this, args.slice(thenPos+1,elsePos)) ;
            out = await evalExpr( this, expression.value, expression.mode) ;
        } else {
            if(elsePos !== args.length) {
                let expression = extractVarFromArgs(this, args.slice(elsePos + 1, args.length));
                out = await evalExpr( this, expression.value, expression.mode);
            }
        }
    } catch(e) {
        return await cmdErr( this,  e, 1 ) ;
    }

    this.terminal.status = 0 ;
    return out.toString() ;
}

async function listDeclaredVarsCmd() {
    let list = "" ;
    for(let i in this.terminal.program.variables) {
        list += i + " = " + this.terminal.program.variables[i] + "\n";
    }
    await this.print(list) ;
    return list ;
}

async function addCmd(args) {
    try {
        await mathCommon( this, "ADD", args) ;
    } catch(e) {
        return await cmdErr( this, e, 1 ) ;
    }

    let value = parseFloat(args[1]) + parseFloat(args[2]) ;
    this.terminal.status = 0 ;
    await this.println( value ) ;
    return value.toString() ;
}

async function subtractCmd(args) {
    try {
        await mathCommon( this, "SUBTRACT", args) ;
    } catch(e) {
        return await cmdErr( this,  e, 1 ) ;
    }

    let value = parseFloat(args[1]) - parseFloat(args[2]) ;
    this.terminal.status = 0 ;
    await this.println( value ) ;
    return value.toString() ;
}

async function multiplyCmd(args) {
    try {
        await mathCommon( this, "MULTIPLY", args) ;
    } catch(e) {
        return await cmdErr( this,  e, 1 ) ;
    }

    let value = parseFloat(args[1]) * parseFloat(args[2]) ;
    this.terminal.status = 0 ;
    await this.println( value ) ;
    return value.toString() ;
}

async function divideCmd(args) {
    try {
        await mathCommon( this, "DIVIDE", args) ;
    } catch(e) {
        return await cmdErr( this,  e, 1 ) ;
    }
    if(parseFloat(args[2]) === 0)
        return await cmdErr( this,  "Syntax error; cannot divide by zero.", 1 ) ;

    let value = parseFloat(args[1]) / parseFloat(args[2]) ;
    this.terminal.status = 0 ;
    await this.println( value ) ;
    return value.toString() ;
}

async function exponentCmd(args) {
    try {
        await mathCommon( this, "EXP", args) ;
    } catch(e) {
        return await cmdErr( this,  e, 1 ) ;
    }

    let value = Math.pow(parseFloat(args[1]), parseFloat(args[2]) ) ;
    this.terminal.status = 0 ;
    await this.println( value ) ;
    return value.toString() ;
}

async function squareRootCmd(args) {
    if( typeof args[2] === "undefined" ) args[2] = "2" ;

    try {
        await mathCommon( this, "SQRT", args) ;
    } catch(e) {
        return await cmdErr( this,  e, 1 ) ;
    }
    if(parseFloat(args[2]) <= 0)
        return await cmdErr( this,  "Syntax error; base cannot be less than zero.", 1 ) ;

    let value = Math.pow(parseFloat(args[1]), 1/parseFloat(args[2]) ) ;
    this.terminal.status = 0 ;
    await this.println( value ) ;
    return value.toString() ;

}

async function logarithmCmd(args) {
    if( typeof args[2] === "undefined" ) args[2] = "" ;

    try {
        await mathCommon( this, "LOGARITHM", args) ;
    } catch(e) {
        return await cmdErr( this,  e, 1 ) ;
    }
    if(args[2] !== "" && parseFloat(args[2]) <= 0)
        return await cmdErr( this,  "Syntax error; base cannot be less than zero.", 1 ) ;

    let value = "" ;
    if(args[2] === "")
        value = Math.log(parseFloat(args[1])) ;
    else
        value = Math.log(parseFloat(args[1])) / Math.log(parseFloat(args[2]) ) ;
    this.terminal.status = 0 ;
    await this.println( value ) ;
    return value.toString() ;
}

async function mathCommon(terminal, name, args) {
    try {
        let tokens = await tokenizeString(this, args.join(" ")) ;
        args = await evalTokens(this, tokens.args, tokens.tokens) ;
    } catch(e) {
        return await cmdErr( this,  e, 1 ) ;
    }

    if(args.length !== 3)
        throw "Syntax error; " + name + " requires two arguments."
    if(isNaN(args[1]) || isNaN(args[2]))
        throw "Syntax error; " + name + " requires numeric arguments."
}

async function equalsCmd(args) {
    try {
        let tokens = await tokenizeString(this, args.join(" ")) ;
        args = await evalTokens(this, tokens.args, tokens.tokens) ;
    } catch(e) {
        return await cmdErr( this,  e, 1 ) ;
    }

    if(args.length !== 3)
        return await cmdErr( this,  "Syntax error; EQUALS requires two arguments.", 1 ) ;

    let out = "FALSE" ;
    if(args[1].toString() === args[2].toString())
        out = "TRUE" ;

    this.terminal.status = 0 ;
    await this.println( out ) ;
    return out ;
}

async function lessThanCmd(args) {
    try {
        let tokens = await tokenizeString(this, args.join(" ")) ;
        args = await evalTokens(this, tokens.args, tokens.tokens) ;
    } catch(e) {
        return await cmdErr( this,  e, 1 ) ;
    }

    if(args.length !== 3)
        return await cmdErr( this,  "Syntax error; LT requires two arguments.", 1 ) ;

    let out = "FALSE" ;
    if(args[1].toString() < args[2].toString())
        out = "TRUE" ;

    this.terminal.status = 0 ;
    await this.println( out ) ;
    return out ;
}

async function greaterThanCmd(args) {
    try {
        let tokens = await tokenizeString(this, args.join(" ")) ;
        args = await evalTokens(this, tokens.args, tokens.tokens) ;
    } catch(e) {
        return await cmdErr( this,  e, 1 ) ;
    }

    if(args.length !== 3)
        return await cmdErr( this,  "Syntax error; GT requires two arguments.", 1 ) ;

    let out = "FALSE" ;
    if(args[1].toString() > args[2].toString())
        out = "TRUE" ;

    this.terminal.status = 0 ;
    await this.println( out ) ;
    return out ;
}

async function helpCmd(args) {
    try {
        let tokens = await tokenizeString(this, args.join(" ")) ;
        args = await evalTokens(this, tokens.args, tokens.tokens) ;
    } catch(e) {
        return await cmdErr( this,  e, 1 ) ;
    }

    if(args[1]) {
        let cmd = args[1].toUpperCase() ;

        if( typeof this.terminal.registeredCmd[cmd] !== "undefined" ) {
            let out = "" ;
            if( this.terminal.registeredCmd[cmd].help ) {
                let helpText = await $.getJSON( this.terminal.registeredCmd[cmd].help ) ;
                out += helpText[cmd] ;
            }

            if( typeof this.terminal.registeredCmd[cmd].args !== "undefined" ) {
                if(out !== "") out += "\n" ;
                out += "Arguments for " + cmd + " are: " + this.terminal.registeredCmd[cmd].args.join(", ") + "."
            } else {
                if(out !== "") out += "\n" ;
                out += "There are no arguments for " + cmd + "."
            }
            this.terminal.status = 0 ;
            await this.println( out ) ;
            return out ;
        } else {
            return await cmdErr( this,  "\"" + args[1] + "\" is not recognized as a valid command.", 1 ) ;
        }
    }
    let out = "Available commands are:"
    await this.println( out ) ;
    out += await printList( this, Object.keys(this.terminal.registeredCmd), "", false ) ;
    let tmp = "You can also specify a line number and commands to add to the stored program." ;
    tmp += "\nFor example:"
    tmp += "\n  10 PRINT HELLO WORLD!"
    await this.println( tmp ) ;
    out += tmp ;

    this.terminal.status = 0 ;
    return out ;
}

async function printCmd(args) {
    try {
        let tokens = await tokenizeString(this, args.join(" ")) ;
        args = await evalTokens(this, tokens.args, tokens.tokens) ;
    } catch(e) {
        return await cmdErr( this,  e, 1 ) ;
    }

    let out = args.slice(1).join(" ") ;
    this.terminal.status = 0 ;
    await this.println( out ) ;
    return out ;
}

async function listCmd(args) {
    let out = await list(this, this.terminal.program.input) ;
    this.terminal.status = 0 ;
    await this.println( "End of Program." ) ;
    return out ;
}

async function list(term, program) {
    let out = "" ;
    for( let line in program) {
        if( program[line] ) {
            out += line + " " + program[line] + "\n" ;
            await term.println( line + " " + program[line] ) ;
        }
    }
    return out ;
}

async function runCmd(args) {
    await run(this, this.terminal.program.input) ;
    await this.setLocalStorage() ;
    this.terminal.status = 0 ;
    return "" ;
}

async function run(term, program) {
    let stackLimit = 100 ;
    for( let line = 0; line < program.length; line++ ) {
        if(program.hasOwnProperty(line) &&
           program[line] ) {
            if(program[line].toUpperCase().startsWith("RUN") ||
               program[line].toUpperCase().startsWith("SAVE"))
                return await cmdErr( term, "Cannot execute control command within a program.", term.returnStatus());

            let control = await term.processCmd(program[line]) ;
            if(control?.startsWith("GOTO:")) {
                line = parseInt( control.split(":")[1] )-1 ;
                stackLimit-- ;
                if(!stackLimit)
                    return await cmdErr( term, "Stack limit exceeded.", term.returnStatus());
            }
            if(term.returnStatus() !== 0) {
                return await cmdErr( term, "Execution error.", term.returnStatus());
            }
        }
    }
}

async function saveCmd(args) {
    if(args.length !== 2)
        return await cmdErr( this, "Syntax error; SAVE requires one argument.", 1 ) ;
    if(typeof this.terminal.registeredCmd[args[1].toUpperCase()] === "object")
        return await cmdErr( this, "Cannot SAVE an alias with the same name as built in command.", 1 ) ;

    this.terminal.program.aliases[args[1].toUpperCase()] = this.terminal.program.input ;
    await this.setLocalStorage() ;
    this.terminal.status = 0 ;
    return "" ;
}

async function aliasCmd(args) {
    if(args.length >= 2) {
        let { action, flags, name, start } = await tokenizeCommandLineInput(this, args) ;
        name = name?.toUpperCase() ;

        // Delete an alias
        if(availableFlags.delete.includes(action) || flags.D) {
            this.terminal.status = 0 ;
            if(!name)
                return await this.println(`Alias name required.`) ;
            let alias = this.terminal.program.aliases[name] ;
            if(!alias)
                return await this.println(`Alias ${args[2]} does not exist; nothing deleted.`) ;
            delete this.terminal.program.aliases[name] ;
            await this.setLocalStorage() ;
            await this.println(`Alias ${name} deleted.`) ;
            return "" ;
        }

        // List an alias
        if(availableFlags.list.includes(action) || flags.L) {
            this.terminal.status = 0 ;
            if(!name)
                return await this.println(`Alias name required.`) ;
            let alias = this.terminal.program.aliases[name] ;
            let out = ""
            if(!alias)
                return await this.println(`Alias ${args[2]} does not exist.`) ;
            else
                out = await list(this, alias) ;
            await this.println( "End of Program." ) ;
            return out ;
        }

        // Recall an alias
        if(availableFlags.recall.includes(action) || flags.R) {
            this.terminal.status = 0 ;
            if(!name)
                return await this.println(`Alias name required.`) ;
            let alias = this.terminal.program.aliases[name] ;
            if(!alias)
                return await this.println(`Alias ${args[2]} does not exist; nothing recalled.`) ;
            else
                this.terminal.program.input = this.terminal.program.aliases[args[2].toUpperCase()] ;
            await this.setLocalStorage() ;
            await this.println(`Alias ${name} recalled.`) ;
            return "" ;
        }

        // Execute an alias
        if(typeof this.terminal.program.aliases[args[1].toUpperCase()] === "object") {
            await run(this, this.terminal.program.aliases[args[1].toUpperCase()]) ;
            await this.setLocalStorage() ;
            this.terminal.status = 0 ;
            return "" ;
        }
    }

    let aliases = Object.keys(this.terminal.program.aliases) ;
    if(!aliases.length)
        await this.println("No available aliases yet") ;
    else {
        await this.println("Available aliases:") ;
        for(let alias of aliases) {
            await this.println(alias) ;
        }
    }

    this.terminal.status = 0 ;
    return "" ;
}

async function newCmd(args) {
    this.terminal.program.input = [] ;
    await this.println("Stored program cleared.") ;
    await this.setLocalStorage() ;
    this.terminal.status = 0 ;
    return "" ;
}

async function gotoCmd(args) {
    try {
        let tokens = await tokenizeString(this, args.join(" ")) ;
        args = await evalTokens(this, tokens.args, tokens.tokens) ;
    } catch(e) {
        return await cmdErr( this,  e, 1 ) ;
    }

    if(!this.terminal.program.input.hasOwnProperty(parseInt(args[1])) ||
       !this.terminal.program.input[parseInt(args[1])])
        return await cmdErr( this,  `Invalid program line ${args[1]} specified.`, 1 ) ;

    return `GOTO:${args[1]}` ;
}

async function setCursorCmd(args) {
    try {
        let tokens = await tokenizeString(this, args.join(" ")) ;
        args = await evalTokens(this, tokens.args, tokens.tokens) ;
        this.setCharPos(args[1], args[2]);
        this.terminal.status = 0 ;
        return "["+this.terminal.x+","+this.terminal.y+"]" ;
    } catch(e) {
        return await cmdErr( this,  e, 1 ) ;
    }
}

async function colorCmd(args) {
    try {
        let tokens = await tokenizeString(this, args.join(" ")) ;
        args = await evalTokens(this, tokens.args, tokens.tokens) ;
    } catch(e) {
        return await cmdErr( this,  e, 1 ) ;
    }

    let color = typeof args[1] === "string" ? args[1].toLowerCase() : "XXX" ;
    switch(color) {
        case "white":
        case "red":
        case "green":
        case "blue":
        case "yellow":
        case "orange":
            this.terminal.display.color = color ;
            this.terminal.status = 0 ;
            return "" ;
    }
    return await cmdErr( this,  "Invalid color selection.", 1 ) ;
}

async function clrCmd() {
    this.clr() ;
    this.setCharPos(0, 0) ;
    this.terminal.status = 0 ;
    return "[0,0]" ;
}

async function exitCmd() {
    let out = "Goodbye!" ;
    await this.println( out ) ;
    this.terminal.status = 0 ;
    return "EXIT" ;
}

async function rndCmd(args) {
    try {
        let tokens = await tokenizeString(this, args.join(" ")) ;
        args = await evalTokens(this, tokens.args, tokens.tokens) ;
    } catch(e) {
        return await cmdErr( this,  e, 1 ) ;
    }

    if( typeof args[1] === "undefined") args[1] = "10" ;

    if(isNaN(args[1]) || args[1] < 1) {
        let out = "Invalid maximum; must be integer value greater than 1."
        return await cmdErr( this,  out, 1 ) ;
    }

    let out = this.rnd(args[1]) ;
    this.terminal.status = 0 ;
    await this.println( out.toString() ) ;
    return out.toString() ;
}

async function systemCmd(args) {
    try {
        let tokens = await tokenizeString(this, args.join(" ")) ;
        args = await evalTokens(this, tokens.args, tokens.tokens) ;
    } catch(e) {
        return await cmdErr( this,  e, 1 ) ;
    }

    if( typeof args[1] === "undefined") args[1] = "LIST" ;

    let out = "" ;
    switch(args[1]?.toUpperCase()) {
        case "LIST":
            out = "ROWS,COLS,X,Y,STATUS,DEBUG,PROMPT,COLOR,VERSION" ;
            await printList( this, out.split(","), "", false ) ;
            return out ;
        case "ROWS":
            out = this.terminal.rows ; break ;
        case "COLS":
            out = this.terminal.columns ; break ;
        case "X":
            out = this.terminal.x ; break ;
        case "Y":
            out = this.terminal.y ; break ;
        case "STATUS":
            out = this.terminal.status ; break ;
        case "DEBUG":
            out = this.terminal.debugMode ? "TRUE" : "FALSE" ; break ;
        case "PROMPT":
            out = this.terminal.display.prompt ; break ;
        case "COLOR":
            out = this.terminal.display.color.toUpperCase() ; break ;
        case "VERSION":
            let manifest = await $.getJSON("./manifest.json") ;
            out = `${manifest.name} - version ${manifest.version}\n  ${manifest.description}` ;
            break ;
        default:
            return await cmdErr( this,  "Invalid SYSTEM parameter: " + args[1] + ".", 1 ) ;
    }

    this.terminal.status = 0 ;
    await this.println( out ) ;
    return out.toString() ;
}

async function moveCmd(args) {
    try {
        let tokens = await tokenizeString(this, args.join(" ")) ;
        args = await evalTokens(this, tokens.args, tokens.tokens) ;
    } catch(e) {
        return await cmdErr( this,  e, 1 ) ;
    }

    if(args.length !== 3)
        return await cmdErr( this,  "Syntax error; MOVE requires two arguments.", 1 ) ;

    if( typeof args[1] === "undefined" || isNaN(args[1]) || typeof args[2] === "undefined" || isNaN(args[2]) )
        return await cmdErr( this,  "Syntax error; MOVE command requires two integer arguments.", 1 ) ;

    args[1] = parseInt(args[1]) ;
    args[2] = parseInt(args[2]) ;

    if( args[1] < 0 || args[2] < 0 )
        return await cmdErr( this,  "Syntax error; MOVE arguments cannot be less than 0.", 1 ) ;

    let out = this.terminal.program.input[args[1]] ;
    delete this.terminal.program.input[args[1]] ;
    this.terminal.program.input[args[2]] = out ;

    await this.setLocalStorage() ;
    this.terminal.status = 0 ;
    await this.println( args[2] + " " + out ) ;
    return args[2] + " " + out ;
}

async function deleteCmd(args) {
    try {
        let tokens = await tokenizeString(this, args.join(" ")) ;
        args = await evalTokens(this, tokens.args, tokens.tokens) ;
    } catch(e) {
        return await cmdErr( this,  e, 1 ) ;
    }

    if(args.length !== 2)
        return await cmdErr( this,  "Syntax error; DELETE requires two arguments.", 1 ) ;

    if( typeof args[1] === "undefined" || isNaN(args[1]) )
        return await cmdErr( this,  "Syntax error; DELETE command requires one integer argument.", 1 ) ;

    args[1] = parseInt(args[1]) ;

    if( args[1] < 0 )
        return await cmdErr( this,  "Syntax error; DELETE argument cannot be less than 0.", 1 ) ;

    let out = this.terminal.program.input[args[1]] ;
    delete this.terminal.program.input[args[1]] ;

    await this.setLocalStorage() ;
    this.terminal.status = 0 ;
    await this.println( args[1] + " " + out ) ;
    return args[1] + " " + out ;
}

async function downloadCmd() {
    let output = "" ;
    for(let i in this.terminal.program.input) {
        if( this.terminal.program.input[i] )
            output += i + " " + this.terminal.program.input[i] + "\n" ;
    }

    let element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(output));
    element.setAttribute('download', 'terminal-program.txt');

    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

// Utility functions
async function cmdErr(terminal, msg, code) {
    if( !code ) code = 1 ;
    terminal.terminal.status = code ;
    await terminal.println( msg ) ;
    return "ERROR" ;
}

function extractQuotes(string) {
    let response = {
        string: "",
        tokens: []
    } ;
    let index = 0 ;
    let match = string.match(/".*?"/g) ;
    if(match) for( let text of match) {
        let replace = `%quote%${index}%quote%` ;
        string = string.replace(text, replace) ;
        text = text.slice(1, text.length-1) ;
        response.tokens[index] = { replace, text, type: "quote" } ;
        index ++ ;
    }
    response.string = string ;
    return response ;
}

function extractParens(string) {
    let response = {
        string: "",
        tokens: []
    } ;
    let match ;
    let index = 0 ;
    do {
        match = string.match(/\([^(]*?\)/g) ;
        if(match) for( let text of match) {
            let replace = `%paren%${index}%paren%` ;
            string = string.replace(text, replace) ;
            text = text.slice(1, text.length-1) ;
            response.tokens[index] = { replace, text, type: "paren" } ;
            index ++ ;
        }
    } while(match !== null) ;
    response.string = string ;
    return response ;
}

function extractVars(string) {
    let response = {
        string: "",
        tokens: []
    } ;
    let index = 0 ;
    let match = string.match(/(\$\w+)/g) ;
    if(match) for( let text of match) {
        let replace = `%var%${index}%var%` ;
        string = string.replace(text, replace) ;
        text = text.slice(1, text.length) ;
        response.tokens[index] = { replace, text, type: "var" } ;
        index ++ ;
    }
    response.string = string ;
    return response ;
}

async function tokenizeString(terminal, string) {
    let vars = extractVars(string) ;
    string = vars.string ;

    let quotes = extractQuotes(string) ;
    string = quotes.string ;

    if(string.match(/"/))
        throw "Unmatched opening double quote." ;

    let parens = extractParens(string) ;
    string = parens.string ;

    if(string.match(/\(/))
        throw "Unmatched opening parenthesis." ;

    if(string.match(/\)/))
        throw "Unmatched closing parenthesis." ;

    let args = string.split(" ") ;

    return {
        tokens: [
            ...parens.tokens,
            ...quotes.tokens,
            ...vars.tokens
        ],
        string,
        args
    } ;
}

async function evalTokens(terminal, args, tokens) {
    for(let i = 0; i < args.length; i++) {
        for(let j = 0; j < tokens.length; j++) {
            let regex = new RegExp(tokens[j].replace) ;
            if(args[i].match(regex)) {
                switch(tokens[j].type) {
                    case "var":
                        let name = tokens[j].text ;
                        if( typeof terminal.terminal.program.variables[name] === "undefined" )
                            throw "Reference error; variable " + name + " does not exist." ;
                        args[i] = args[i].replace(regex, terminal.terminal.program.variables[name]) ;
                        break ;
                    case "quote":
                        args[i] = (await evalTokens(terminal, [tokens[j].text], tokens))[0] ;
                        break ;
                    case "paren":
                        let command = (await evalTokens(terminal, tokens[j].text.split(" "), tokens)).join(" ") ;
                        terminal.terminal.program.suppressOutput = true;
                        args[i] = await terminal.processCmd(command);
                        terminal.terminal.program.suppressOutput = false;
                        if (terminal.returnStatus() !== 0) {
                            throw "Runtime error; expression evaluation failed." ;
                        }
                        break ;
                }
            }
        }
    }

    return args ;
}

async function tokenizeCommandLineInput(terminal, args, options = {}, possibleFlags = null) {
    if(!possibleFlags)
        possibleFlags = availableFlags ;

    let tokenOptions = {
        ...options,
        lookForAction: options.lookForAction !== false
    }

    // Command parts object
    let parsed = {
        cmd: args[0]?.toUpperCase(),
        action: "",
        flags: {},
        name: "",
        start: 1
    }

    try {
        let tokens = await tokenizeString(this, args.join(" ")) ;
        args = await evalTokens(this, tokens.args, tokens.tokens) ;
    } catch(e) {
        return await cmdErr( this,  `Runtime error; ${e}.`, 1 ) ;
    }

    // Start tokenization at index 1
    let startIndex = 1 ;

    // If index 1 is a known action, save it
    if(tokenOptions.lookForAction && isAction(args[startIndex]?.toUpperCase(), possibleFlags)) {
        parsed.action = args[startIndex]?.toUpperCase() ;
        startIndex++ ;
    }

    // Start processing flags
    for(let i = startIndex; i < args.length; i++) {
        if(isFlags(args[i], possibleFlags.modifiers)) {
            let newFlags = parseFlags(args, i, possibleFlags, tokenOptions) ;
            parsed.flags = mergeFlags(parsed.flags, newFlags.opts) ;
            startIndex++ ;
            if(newFlags.tookArgument) {
                startIndex++ ; i++ ;
            }
        }
    }

    // The rest should be a string being passed as an argument to the command
    parsed.start = startIndex ;
    parsed.name = args.slice(startIndex, args.length).join(" ") ;

    // console.log( parsed ) ;
    return parsed ;
}

function isAction(str, possibleFlags) {
    for(let action in possibleFlags) {
        if(action === "modifiers") continue ;
        if(possibleFlags[action].includes(str))
            return true ;
    }
    return false ;
}

function parseFlags(args, index, possibleFlags, options = {}) {
    // Initialize object with all possible modifiers
    let response = {
        opts: {},
        tookArgument: false
    } ;
    for(let letter of possibleFlags.modifiers)
        response.opts[letter] = false ;

    // Set response.opts to true if they exist in string
    let flags = args[index].split("") ;
    for(let flag of flags) {
        flag = flag.toUpperCase() ;
        if(response.opts.hasOwnProperty(flag)) {
            if(options[flag]?.lookForArgument) {
                response.opts[flag] = args[index + 1] ? args[index + 1] : "" ;
                response.tookArgument = true ;
            } else {
                response.opts[flag] = true;
            }
        }
    }

    return response ;
}

function mergeFlags(a, b) {
    let keys = Object.keys(b) ;
    for(let k of keys) {
        if(typeof b[k] === "string" || b[k] === true)
            a[k] = b[k] ;
    }
    return a ;
}

function extractVarFromArgs(terminal, args) {
    let response = { mode: VAR_MODE_NONE, name: "", value: "", start: 0, end: 0 }, valid = false, i ;
    for(i in args) {
        if(args[i].charAt(0) === "(")  response.mode = VAR_MODE_EXPR ;
        if(args[i].charAt(0) === "\"") response.mode = VAR_MODE_STRING ;
        if(args[i].charAt(0) === "$")  response.mode = VAR_MODE_VAR ;
        if(response.mode !== VAR_MODE_NONE) break ;
    }
    response.start = response.end = parseInt(i) ;
    if( response.mode === VAR_MODE_NONE ) { response.value = args[i] ; return response ; }
    if( response.mode === VAR_MODE_VAR ) {
        let varName = args[i].slice(1) ;
        if( typeof terminal.terminal.program.variables[varName] === "undefined" )
            throw "Reference error; variable " + varName + " does not exist." ;
        response.value = terminal.terminal.program.variables[varName] ;
        response.name = varName ;
        return response ;
    }
    for( ; i < args.length ; i++) {
        response.value += args[i] ;
        if(response.mode === VAR_MODE_EXPR &&
           !(parseInt(i) === response.start && response.value.length === 1) &&
           response.value.charAt(response.value.length-1) === ")")  {
            valid = true ;
            break ;
        }
        if(response.mode === VAR_MODE_STRING &&
           !(parseInt(i) === response.start && response.value.length === 1) &&
           response.value.charAt(response.value.length-1) === "\"") {
            valid = true ;
            break ;
        }
        response.value += " " ;
    }
    response.end = parseInt(i) ;
    if(!valid) {
        switch(response.mode) {
            case VAR_MODE_EXPR:
                throw "Syntax error; missing closing parenthesis." ;
            case VAR_MODE_STRING:
                throw "Syntax error; missing closing double quote." ;
            default:
                throw "Syntax error." ;
        }
    }
    response.name  = response.value ;
    response.value = response.value.slice(1,response.value.length-1) ;
    return response ;
}

async function evalExpr(terminal, expr, mode) {
    let value = "" ;
    switch(mode) {
        case VAR_MODE_NONE:
            value = expr ;
            break ;
        case VAR_MODE_VAR:
            value = expr ;
            break ;
        case VAR_MODE_EXPR:
            value = expr ;
            terminal.terminal.program.suppressOutput = true ;
            value = await terminal.processCmd(value) ;
            terminal.terminal.program.suppressOutput = false ;
            if(terminal.returnStatus() !== 0) {
                throw "Runtime error; expression evaluation failed." ;
            }
            break ;
        default:
            value = expr ;
            break ;
    }
    return value ;
}

async function printList(term, collection, attribute = "title", printPrompt = true) {
    if(printPrompt) await term.print("\n") ;

    let columns = term.terminal.columns ;
    let titles = [] ;
    let max = 0 ;
    let out = "" ;

    for(let c of collection) {
        let val = attribute !== "" ? c[attribute].toString() : c.toString() ;
        titles.push({text: val, len: val.length, type: c.type});
        if(val.length > max)
            max = val.length ;
    }

    if(max < columns/4) {
        for(let t of titles) {
            out += t.text + spaces((columns / 4) - t.len) ;
            await term.print(t.text + spaces((columns / 4) - t.len), 0, getColor(t.type));
        }
    }
    else if(max < columns/3) {
        for(let t of titles) {
            out += t.text + spaces((columns / 3) - t.len) ;
            await term.print(t.text + spaces((columns / 3) - t.len), 0, getColor(t.type));
        }
    }
    else if(max < columns/2) {
        for(let t of titles) {
            out += t.text + spaces((columns / 2) - t.len) ;
            await term.print(t.text + spaces((columns / 2) - t.len), 0, getColor(t.type));
        }
    }
    else {
        for(let t of titles) {
            out += t.text + "\n"
            await term.println(
                padWithSpaces( t.text, term.terminal.columns-1 ),
                0,
                getColor(t.type)
            );
        }
    }
    out += "\n" ;
    await term.print("\n");
    if(printPrompt) {
        await term.printPrompt(term.terminal.display.prompt);
        term.insertCarrot(term.terminal.display.carrot);
    }
    return out ;
}

function getColor(type) {
    switch(type) {
        case "dir":
            return "blue" ;
        case "bookmark":
        default:
            return "white" ;
    }
}

function padWithSpaces(str, totalLen) {
    if( str.length === totalLen ) return str ;
    if( str.length < totalLen ) {
        str += spaces(totalLen - str.length) ;
    } else if (str.length > 5) {
        str = str.slice(0, totalLen-3) + "..."
    } else {
        str = str.slice(0, totalLen)
    }
    return str ;
}

function maxLen(str, max) {
    if( str.length < max ) return str ;
    if (str.length > 3) {
        str = str.slice(0, max-1) + "-"
    } else {
        str = str.slice(0, max)
    }
    return str ;
}

function padWithZeros(str, totalLen) {
    if( str.length === totalLen ) return str ;
    if( str.length < totalLen ) {
        str = spaces(totalLen - str.length, "0") + str ;
    } else {
        str = str.slice(0, totalLen-1) + "-"
    }
    return str ;
}

function spaces(num, char = " ") {
    let spaces = "" ;
    while(num) {
        spaces += char ;
        num-- ;
    }
    return spaces ;
}

function isFlags(str, modifiers) {
    let letters = modifiers.join("") ;
    let regex = new RegExp(`^-[${letters}]+$`) ;
    return str?.toUpperCase()?.match(regex) ;
}

function getFormattedDate(timestamp) {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ];
    let date = new Date(timestamp) ;
    let str = date.getFullYear() + " " ;
    str += monthNames[date.getMonth()] + " " ;
    str += padWithZeros((date.getDate()).toString(), 2) + " " ;
    str += padWithZeros((date.getHours()).toString(), 2) + ":" ;
    str += padWithZeros((date.getMinutes()).toString(), 2) + " " ;
    return str ;
}

function getMillisFromDateStr(dateStr) {
    if(!dateStr.match(/^\d{4}-\d{2}-\d{2}(-\d{2}:\d{2}(:\d{2})?)?$/))
        throw `Date input ${dateStr} does not match the format YYYY-MM-DD-[HH:MM[:SS]]\n` +
              "Examples:\n  2024-03-15\n  2024-03-15-16:15\n  2024-03-15-16:15:30" ;
    return Date.parse(
        dateStr.replace(/^(\d{4}-\d{2}-\d{2})(-(\d{2}:\d{2})(:\d{2})?)?$/, "$1 $3$4")
    ) ;
}
