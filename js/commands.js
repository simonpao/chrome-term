const VAR_MODE_NONE   = 0 ;
const VAR_MODE_EXPR   = 1 ;
const VAR_MODE_STRING = 2 ;
const VAR_MODE_VAR    = 3 ;

function registerDefaultCommands(terminal) {
    terminal.registerCmd( "ADD",       { args: [ "addend", "addend" ], callback: addCmd.bind(terminal) }) ;
    terminal.registerCmd( "ASSIGN",    { args: [ "variableValue", "TO", "variableName" ], callback: assignmentCmd.bind(terminal) }) ;
    terminal.registerCmd( "CLR",       { callback: clrCmd.bind(terminal) }) ;
    terminal.registerCmd( "COLOR",     { args: [ "color" ], callback: colorCmd.bind(terminal) }) ;
    terminal.registerCmd( "DELETE",    { args: [ "line" ], callback: deleteCmd.bind(terminal) }) ;
    terminal.registerCmd( "DIVIDE",    { args: [ "dividend", "divisor" ], callback: divideCmd.bind(terminal) }) ;
    terminal.registerCmd( "DOWNLOAD",  { callback: downloadCmd.bind(terminal) }) ;
    terminal.registerCmd( "EQUALS",    { args: [ "operand", "operand" ], callback: equalsCmd.bind(terminal) }) ;
    terminal.registerCmd( "EXIT",      { callback: exitCmd.bind(terminal) }) ;
    terminal.registerCmd( "EXP",       { args: [ "base", "factor" ], callback: exponentCmd.bind(terminal) }) ;
    terminal.registerCmd( "GT",        { args: [ "operand", "operand" ], callback: greaterThanCmd.bind(terminal) }) ;
    terminal.registerCmd( "HELP",      { args: [ "cmd" ], callback: helpCmd.bind(terminal) }) ;
    terminal.registerCmd( "IF",        { args: [ "conditional", "THEN", "expression", "ELSE", "expression" ], callback: ifCmd.bind(terminal) }) ;
    terminal.registerCmd( "LIST",      { args: [ "start", "end" ], callback: listCmd.bind(terminal) }) ;
    terminal.registerCmd( "LOGARITHM", { args: [ "argument", "base" ], callback: logarithmCmd.bind(terminal) }) ;
    terminal.registerCmd( "LT",        { args: [ "operand", "operand" ], callback: lessThanCmd.bind(terminal) }) ;
    terminal.registerCmd( "MOVE",      { args: [ "from", "to" ], callback: moveCmd.bind(terminal) }) ;
    terminal.registerCmd( "MULTIPLY",  { args: [ "multiplicand", "multiplier" ], callback: multiplyCmd.bind(terminal) }) ;
    terminal.registerCmd( "PRINT",     { args: [ "text" ], callback: printCmd.bind(terminal) }) ;
    terminal.registerCmd( "RESET",     { callback: resetCmd.bind(terminal) }) ;
    terminal.registerCmd( "RND",       { args: [ "max" ], callback: rndCmd.bind(terminal) }) ;
    terminal.registerCmd( "RUN",       { callback: runCmd.bind(terminal) }) ;
    terminal.registerCmd( "SETCURSOR", { args: [ "x", "y" ], callback: setCursorCmd.bind(terminal) }) ;
    terminal.registerCmd( "SQRT",      { args: [ "radicand", "base" ], callback: squareRootCmd.bind(terminal) }) ;
    terminal.registerCmd( "SUBTRACT",  { args: [ "minuend", "subtrahend" ], callback: subtractCmd.bind(terminal) }) ;
    terminal.registerCmd( "SYSTEM",    { args: [ "parameter" ], callback: systemCmd.bind(terminal) }) ;
    terminal.registerCmd( "VARS",      { callback: listDeclaredVarsCmd.bind(terminal) }) ;
}

async function assignmentCmd(args) {
    let name = "", value = "", variable = {} ;

    try {
        variable = extractVarFromArgs(this, args.slice(1,args.length-2)) ;
    } catch(e) {
        return await cmdErr( this,  e, 1 ) ;
    }

    if(args.length < 4)
        return await cmdErr( this,  "Syntax error; ASSIGN requires at least four arguments.", 1 ) ;
    if(args[args.length-2].toUpperCase() !== "TO")
        return await cmdErr( this,  "Syntax error; second argument of ASSIGN must be TO.", 1 ) ;
    name = args[args.length-1] ;
    if(name.charAt(0) === "$")
        return await cmdErr( this,  "Syntax error; variable name cannot begin with $.", 1 ) ;

    switch(variable.mode) {
        case VAR_MODE_NONE:
        case VAR_MODE_VAR:
            if(args.length > 4)
                return await cmdErr( this,  "Syntax error; ASSIGN has too many arguments.", 1 ) ;
            break ;
    }

    try {
        value = await evalExpr( this, variable.value, variable.mode) ;
    } catch(e) {
        return await cmdErr( this,  e, 1 ) ;
    }

    if( !name )
        return await cmdErr( this,  "Syntax error; missing variable name.", 1 ) ;

    this.terminal.program.variables[name] = value ;
    this.terminal.status = 0 ;
    return value ;
}

async function ifCmd(args) {
    let thenPos = 0, elsePos = 0, trueOrFalse = false, out = "" ;

    for( let i in args ) {
        if(args[i] === "THEN") thenPos = parseInt(i) ;
        if(args[i] === "ELSE") elsePos = parseInt(i) ;
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
    args = await replaceVarsInArgs(terminal, args) ;
    if(args.length !== 3)
        throw "Syntax error; " + name + " requires two arguments."
    if(isNaN(args[1]) || isNaN(args[2]))
        throw "Syntax error; " + name + " requires numeric arguments."
}

async function equalsCmd(args) {
    try {
        args = await replaceVarsInArgs(this, args) ;
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
        args = await replaceVarsInArgs(this, args) ;
    } catch(e) {
        return await cmdErr( this,  e, 1 ) ;
    }

    if(args.length !== 3)
        return await cmdErr( this,  "Syntax error; EQUALS requires two arguments.", 1 ) ;

    let out = "FALSE" ;
    if(args[1].toString() < args[2].toString())
        out = "TRUE" ;

    this.terminal.status = 0 ;
    await this.println( out ) ;
    return out ;
}

async function greaterThanCmd(args) {
    try {
        args = await replaceVarsInArgs(this, args) ;
    } catch(e) {
        return await cmdErr( this,  e, 1 ) ;
    }

    if(args.length !== 3)
        return await cmdErr( this,  "Syntax error; EQUALS requires two arguments.", 1 ) ;

    let out = "FALSE" ;
    if(args[1].toString() > args[2].toString())
        out = "TRUE" ;

    this.terminal.status = 0 ;
    await this.println( out ) ;
    return out ;
}

async function helpCmd(args) {
    try {
        args = await replaceVarsInArgs(this, args) ;
    } catch(e) {
        return await cmdErr( this,  e, 1 ) ;
    }

    if(args[1]) {
        let cmd = args[1].toUpperCase() ;
        if( typeof this.terminal.registeredCmd[cmd] !== "undefined" && typeof this.terminal.registeredCmd[cmd].args !== "undefined" ) {
            let out = "Arguments for " + cmd + " are: " + this.terminal.registeredCmd[cmd].args.join(", ") + "."
            this.terminal.status = 0 ;
            await this.println( out ) ;
            return out ;
        } else if( typeof this.terminal.registeredCmd[cmd] === "undefined" ) {
            let out = "\"" + args[1] + "\" is not recognized as a valid command."
            return await cmdErr( this,  out, 1 ) ;
        } else {
            let out = "There are no arguments for " + cmd + "."
            this.terminal.status = 0 ;
            await this.println( out ) ;
            return out ;
        }
    }
    let out = "Available commands are: " + Object.keys(this.terminal.registeredCmd).join(", ") + ".\n" +
        "You can also specify a line number and commands to add to the stored program."
    this.terminal.status = 0 ;
    await this.println( out ) ;
    return out ;
}

async function printCmd(args) {
    try {
        args = await replaceVarsInArgs(this, args) ;
    } catch(e) {
        return await cmdErr( this,  e, 1 ) ;
    }

    let out = args.slice(1).join(" ") ;
    this.terminal.status = 0 ;
    await this.println( out ) ;
    return out ;
}

async function listCmd(args) {
    let out = "" ;
    for( let line in this.terminal.program.input) {
        if( this.terminal.program.input[line] ) {
            out += line + " " + this.terminal.program.input[line] + "\n" ;
            await this.println( line + " " + this.terminal.program.input[line] ) ;
        }
    }
    this.terminal.status = 0 ;
    await this.println( "End of Program." ) ;
    return out ;
}

async function runCmd(args) {
    for( let line in this.terminal.program.input) {
        if( this.terminal.program.input[line] ) {
            await this.processCmd(this.terminal.program.input[line]) ;
            if(this.returnStatus() !== 0) {
                return await cmdErr( this, "Execution error.", this.returnStatus());
            }
        }
    }
    this.terminal.status = 0 ;
    return "" ;
}

async function setCursorCmd(args) {
    try {
        args = await replaceVarsInArgs(this, args) ;
        this.setCharPos(args[1], args[2]);
        this.terminal.status = 0 ;
        return "["+this.terminal.x+","+this.terminal.y+"]" ;
    } catch(e) {
        return await cmdErr( this,  e, 1 ) ;
    }
}

async function colorCmd(args) {
    try {
        args = await replaceVarsInArgs(this, args) ;
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
        args = await replaceVarsInArgs(this, args) ;
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

async function resetCmd(args) {
    localStorage.removeItem(`${this.terminal.localStoragePrefix}--programInput`);
    location.reload();
    return "" ;
}

async function systemCmd(args) {
    try {
        args = await replaceVarsInArgs(this, args) ;
    } catch(e) {
        return await cmdErr( this,  e, 1 ) ;
    }

    if( typeof args[1] === "undefined") args[1] = "LIST" ;

    let out = "" ;
    switch(args[1]) {
        case "LIST":
            out = "ROWS, COLS, X, Y, STATUS, DEBUG, PROMPT" ; break ;
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
        default:
            return await cmdErr( this,  "Invalid SYSTEM parameter: " + args[1] + ".", 1 ) ;
    }

    this.terminal.status = 0 ;
    await this.println( out ) ;
    return out.toString() ;
}

async function moveCmd(args) {
    try {
        args = await replaceVarsInArgs(this, args) ;
    } catch(e) {
        return await cmdErr( this,  e, 1 ) ;
    }

    if(args.length !== 3)
        return await cmdErr( this,  "Syntax error; MOVE requires three arguments.", 1 ) ;

    if( typeof args[1] === "undefined" || isNaN(args[1]) || typeof args[2] === "undefined" || isNaN(args[2]) )
        return await cmdErr( this,  "Syntax error; MOVE command requires two integer arguments.", 1 ) ;

    args[1] = parseInt(args[1]) ;
    args[2] = parseInt(args[2]) ;

    if( args[1] < 0 || args[2] < 0 )
        return await cmdErr( this,  "Syntax error; MOVE arguments cannot be less than 0.", 1 ) ;

    let out = this.terminal.program.input[args[1]] ;
    delete this.terminal.program.input[args[1]] ;
    this.terminal.program.input[args[2]] = out ;

    this.terminal.status = 0 ;
    await this.println( args[2] + " " + out ) ;
    return args[2] + " " + out ;
}

async function deleteCmd(args) {
    try {
        args = await replaceVarsInArgs(this, args) ;
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

async function cmdErr(terminal, msg, code) {
    if( !code ) code = 1 ;
    terminal.terminal.status = code ;
    await terminal.println( msg ) ;
    return "ERROR" ;
}

async function replaceVarsInArgs(terminal, args) {
    terminal.logDebugInfo("replaceVarsInArgs(terminal, args); Input args = " + args) ;
    let variable = {}, i = 0 ;
    while(i < args.length) {
        variable = extractVarFromArgs(terminal, args.slice(i, args.length));
        i += variable.end-variable.start ;
        switch (variable.mode) {
            case VAR_MODE_STRING:
            case VAR_MODE_VAR:
                args.splice( variable.start, variable.end-variable.start+1, variable.value ) ;
                i -= variable.end-variable.start ;
                break;
            case VAR_MODE_EXPR:
                terminal.terminal.program.suppressOutput = true;
                variable.value = await terminal.processCmd(variable.value);
                terminal.terminal.program.suppressOutput = false;
                if (terminal.returnStatus() !== 0) {
                    throw "Runtime error; expression evaluation failed." ;
                }
                args.splice( variable.start, variable.end-variable.start+1, variable.value ) ;
                i -= variable.end-variable.start ;
                break;
            default:
                i = args.length ;
                break;
        }
    }
    terminal.logDebugInfo("replaceVarsInArgs(terminal, args); Output args = " + args) ;
    return args ;
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
        if(response.mode === VAR_MODE_EXPR && response.value.charAt(response.value.length-1) === ")")  {
            valid = true ;
            break ;
        }
        if(response.mode === VAR_MODE_STRING && response.value.charAt(response.value.length-1) === "\"") {
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