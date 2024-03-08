const VAR_MODE_NONE   = 0 ;
const VAR_MODE_EXPR   = 1 ;
const VAR_MODE_STRING = 2 ;
const VAR_MODE_VAR    = 3 ;

function registerDefaultCommands() {
    registerCmd( "ADD",       { args: [ "addend", "addend" ], callback: addCmd }) ;
    registerCmd( "ASSIGN",    { args: [ "variableValue", "TO", "variableName" ], callback: assignmentCmd }) ;
    registerCmd( "CLR",       { callback: clrCmd }) ;
    registerCmd( "COLOR",     { args: [ "color" ], callback: colorCmd }) ;
    registerCmd( "DELETE",    { args: [ "line" ], callback: deleteCmd }) ;
    registerCmd( "DIVIDE",    { args: [ "dividend", "divisor" ], callback: divideCmd }) ;
    registerCmd( "DOWNLOAD",  { callback: downloadCmd }) ;
    registerCmd( "EQUALS",    { args: [ "operand", "operand" ], callback: equalsCmd }) ;
    registerCmd( "EXIT",      { callback: exitCmd }) ;
    registerCmd( "EXP",       { args: [ "base", "factor" ], callback: exponentCmd }) ;
    registerCmd( "GT",        { args: [ "operand", "operand" ], callback: greaterThanCmd }) ;
    registerCmd( "HELP",      { args: [ "cmd" ], callback: helpCmd }) ;
    registerCmd( "IF",        { args: [ "conditional", "THEN", "expression", "ELSE", "expression" ], callback: ifCmd }) ;
    registerCmd( "LIST",      { args: [ "start", "end" ], callback: listCmd }) ;
    registerCmd( "LOGARITHM", { args: [ "argument", "base" ], callback: logarithmCmd }) ;
    registerCmd( "LT",        { args: [ "operand", "operand" ], callback: lessThanCmd }) ;
    registerCmd( "MOVE",      { args: [ "from", "to" ], callback: moveCmd }) ;
    registerCmd( "MULTIPLY",  { args: [ "multiplicand", "multiplier" ], callback: multiplyCmd }) ;
    registerCmd( "PRINT",     { args: [ "text" ], callback: printCmd }) ;
    registerCmd( "RESET",     { callback: resetCmd }) ;
    registerCmd( "RND",       { args: [ "max" ], callback: rndCmd }) ;
    registerCmd( "RUN",       { callback: runCmd }) ;
    registerCmd( "SETCURSOR", { args: [ "x", "y" ], callback: setCursorCmd }) ;
    registerCmd( "SQRT",      { args: [ "radicand", "base" ], callback: squareRootCmd }) ;
    registerCmd( "SUBTRACT",  { args: [ "minuend", "subtrahend" ], callback: subtractCmd }) ;
    registerCmd( "SYSTEM",    { args: [ "parameter" ], callback: systemCmd }) ;
    registerCmd( "VARS",      { callback: listDeclaredVarsCmd }) ;
}

async function assignmentCmd(args) {
    let name = "", value = "", variable = {} ;

    try {
        variable = extractVarFromArgs(args.slice(1,args.length-2)) ;
    } catch(e) {
        return await cmdErr( e, 1 ) ;
    }

    if(args.length < 4)
        return await cmdErr( "Syntax error; ASSIGN requires at least four arguments.", 1 ) ;
    if(args[args.length-2].toUpperCase() !== "TO")
        return await cmdErr( "Syntax error; second argument of ASSIGN must be TO.", 1 ) ;
    name = args[args.length-1] ;
    if(name.charAt(0) === "$")
        return await cmdErr( "Syntax error; variable name cannot begin with $.", 1 ) ;

    switch(variable.mode) {
        case VAR_MODE_NONE:
        case VAR_MODE_VAR:
            if(args.length > 4)
                return await cmdErr( "Syntax error; ASSIGN has too many arguments.", 1 ) ;
            break ;
    }

    try {
        value = await evalExpr(variable.value, variable.mode) ;
    } catch(e) {
        return await cmdErr( e, 1 ) ;
    }

    if( !name )
        return await cmdErr( "Syntax error; missing variable name.", 1 ) ;

    terminal.program.variables[name] = value ;
    terminal.status = 0 ;
    return value ;
}

async function ifCmd(args) {
    let thenPos = 0, elsePos = 0, trueOrFalse = false, out = "" ;

    for( let i in args ) {
        if(args[i] === "THEN") thenPos = parseInt(i) ;
        if(args[i] === "ELSE") elsePos = parseInt(i) ;
    }

    if(thenPos === 0)
        return await cmdErr( "Syntax error; THEN argument is required for IF statement.", 1 ) ;
    if(thenPos === 1)
        return await cmdErr( "Syntax error; missing conditional after IF.", 1 ) ;
    if(thenPos === args.length-1)
        return await cmdErr( "Syntax error; missing expression after THEN argument.", 1 ) ;
    if(elsePos === args.length-1)
        return await cmdErr( "Syntax error; missing expression after ELSE argument.", 1 ) ;
    if(elsePos === 0) elsePos = args.length ;

    try {
        let condition = extractVarFromArgs(args.slice(1,thenPos)) ;
        let result    = await evalExpr(condition.value, condition.mode) ;
        if( result === "TRUE" || result > 0 ) trueOrFalse = true ;

        if( trueOrFalse ) {
            let expression = extractVarFromArgs(args.slice(thenPos+1,elsePos)) ;
            out = await evalExpr(expression.value, expression.mode) ;
        } else {
            if(elsePos !== args.length) {
                let expression = extractVarFromArgs(args.slice(elsePos + 1, args.length));
                out = await evalExpr(expression.value, expression.mode);
            }
        }
    } catch(e) {
        return await cmdErr( e, 1 ) ;
    }

    terminal.status = 0 ;
    return out.toString() ;
}

async function listDeclaredVarsCmd() {
    let list = "" ;
    for(let i in terminal.program.variables) {
        list += i + " = " + terminal.program.variables[i] + "\n";
    }
    await print(list) ;
    return list ;
}

async function addCmd(args) {
    try {
        await mathCommon("ADD", args) ;
    } catch(e) {
        return await cmdErr( e, 1 ) ;
    }

    let value = parseFloat(args[1]) + parseFloat(args[2]) ;
    terminal.status = 0 ;
    await println( value ) ;
    return value.toString() ;
}

async function subtractCmd(args) {
    try {
        await mathCommon("ADD", args) ;
    } catch(e) {
        return await cmdErr( e, 1 ) ;
    }

    let value = parseFloat(args[1]) - parseFloat(args[2]) ;
    terminal.status = 0 ;
    await println( value ) ;
    return value.toString() ;
}

async function multiplyCmd(args) {
    try {
        await mathCommon("ADD", args) ;
    } catch(e) {
        return await cmdErr( e, 1 ) ;
    }

    let value = parseFloat(args[1]) * parseFloat(args[2]) ;
    terminal.status = 0 ;
    await println( value ) ;
    return value.toString() ;
}

async function divideCmd(args) {
    try {
        await mathCommon("ADD", args) ;
    } catch(e) {
        return await cmdErr( e, 1 ) ;
    }
    if(parseFloat(args[2]) === 0)
        return await cmdErr( "Syntax error; cannot divide by zero.", 1 ) ;

    let value = parseFloat(args[1]) / parseFloat(args[2]) ;
    terminal.status = 0 ;
    await println( value ) ;
    return value.toString() ;
}

async function exponentCmd(args) {
    try {
        await mathCommon("ADD", args) ;
    } catch(e) {
        return await cmdErr( e, 1 ) ;
    }

    let value = Math.pow(parseFloat(args[1]), parseFloat(args[2]) ) ;
    terminal.status = 0 ;
    await println( value ) ;
    return value.toString() ;
}

async function squareRootCmd(args) {
    if( typeof args[2] === "undefined" ) args[2] = "2" ;

    try {
        await mathCommon("ADD", args) ;
    } catch(e) {
        return await cmdErr( e, 1 ) ;
    }
    if(parseFloat(args[2]) <= 0)
        return await cmdErr( "Syntax error; base cannot be less than zero.", 1 ) ;

    let value = Math.pow(parseFloat(args[1]), 1/parseFloat(args[2]) ) ;
    terminal.status = 0 ;
    await println( value ) ;
    return value.toString() ;

}

async function logarithmCmd(args) {
    if( typeof args[2] === "undefined" ) args[2] = "" ;

    try {
        await mathCommon("ADD", args) ;
    } catch(e) {
        return await cmdErr( e, 1 ) ;
    }
    if(args[2] !== "" && parseFloat(args[2]) <= 0)
        return await cmdErr( "Syntax error; base cannot be less than zero.", 1 ) ;

    let value = "" ;
    if(args[2] === "")
        value = Math.log(parseFloat(args[1])) ;
    else
        value = Math.log(parseFloat(args[1])) / Math.log(parseFloat(args[2]) ) ;
    terminal.status = 0 ;
    await println( value ) ;
    return value.toString() ;
}

async function mathCommon(name, args) {
    args = await replaceVarsInArgs(args) ;
    if(args.length !== 3)
        throw "Syntax error; " + name + " requires two arguments."
    if(isNaN(args[1]) || isNaN(args[2]))
        throw "Syntax error; " + name + " requires numeric arguments."
}

async function equalsCmd(args) {
    try {
        args = await replaceVarsInArgs(args) ;
    } catch(e) {
        return await cmdErr( e, 1 ) ;
    }

    if(args.length !== 3)
        return await cmdErr( "Syntax error; EQUALS requires two arguments.", 1 ) ;

    let out = "FALSE" ;
    if(args[1].toString() === args[2].toString())
        out = "TRUE" ;

    terminal.status = 0 ;
    await println( out ) ;
    return out ;
}

async function lessThanCmd(args) {
    try {
        args = await replaceVarsInArgs(args) ;
    } catch(e) {
        return await cmdErr( e, 1 ) ;
    }

    if(args.length !== 3)
        return await cmdErr( "Syntax error; EQUALS requires two arguments.", 1 ) ;

    let out = "FALSE" ;
    if(args[1].toString() < args[2].toString())
        out = "TRUE" ;

    terminal.status = 0 ;
    await println( out ) ;
    return out ;
}

async function greaterThanCmd(args) {
    try {
        args = await replaceVarsInArgs(args) ;
    } catch(e) {
        return await cmdErr( e, 1 ) ;
    }

    if(args.length !== 3)
        return await cmdErr( "Syntax error; EQUALS requires two arguments.", 1 ) ;

    let out = "FALSE" ;
    if(args[1].toString() > args[2].toString())
        out = "TRUE" ;

    terminal.status = 0 ;
    await println( out ) ;
    return out ;
}

async function helpCmd(args) {
    try {
        args = await replaceVarsInArgs(args) ;
    } catch(e) {
        return await cmdErr( e, 1 ) ;
    }

    if(args[1]) {
        let cmd = args[1].toUpperCase() ;
        if( typeof terminal.registeredCmd[cmd] !== "undefined" && typeof terminal.registeredCmd[cmd].args !== "undefined" ) {
            let out = "Arguments for " + cmd + " are: " + terminal.registeredCmd[cmd].args.join(", ") + "."
            terminal.status = 0 ;
            await println( out ) ;
            return out ;
        } else if( typeof terminal.registeredCmd[cmd] === "undefined" ) {
            let out = "\"" + args[1] + "\" is not recognized as a valid command."
            return await cmdErr( out, 1 ) ;
        } else {
            let out = "There are no arguments for " + cmd + "."
            terminal.status = 0 ;
            await println( out ) ;
            return out ;
        }
    }
    let out = "Available commands are: " + Object.keys(terminal.registeredCmd).join(", ") + ".\n" +
        "You can also specify a line number and commands to add to the stored program."
    terminal.status = 0 ;
    await println( out ) ;
    return out ;
}

async function printCmd(args) {
    try {
        args = await replaceVarsInArgs(args) ;
    } catch(e) {
        return await cmdErr( e, 1 ) ;
    }

    let out = args.slice(1).join(" ") ;
    terminal.status = 0 ;
    await println( out ) ;
    return out ;
}

async function listCmd(args) {
    let out = "" ;
    for( let line in terminal.program.input) {
        if( terminal.program.input[line] ) {
            out += line + " " + terminal.program.input[line] + "\n" ;
            await println( line + " " + terminal.program.input[line] ) ;
        }
    }
    terminal.status = 0 ;
    await println( "End of Program." ) ;
    return out ;
}

async function runCmd(args) {
    for( let line in terminal.program.input) {
        if( terminal.program.input[line] ) {
            await processCmd(terminal.program.input[line]) ;
            if(returnStatus() !== 0) {
                return await cmdErr("Execution error.", returnStatus());
            }
        }
    }
    terminal.status = 0 ;
    return "" ;
}

async function setCursorCmd(args) {
    try {
        args = await replaceVarsInArgs(args) ;
        setCharPos(args[1], args[2]);
        terminal.status = 0 ;
        return "["+terminal.x+","+terminal.y+"]" ;
    } catch(e) {
        return await cmdErr( e, 1 ) ;
    }
}

async function colorCmd(args) {
    try {
        args = await replaceVarsInArgs(args) ;
    } catch(e) {
        return await cmdErr( e, 1 ) ;
    }

    let color = typeof args[1] === "string" ? args[1].toLowerCase() : "XXX" ;
    switch(color) {
        case "white":
        case "red":
        case "green":
        case "blue":
        case "yellow":
        case "purple":
            terminal.display.color = color ;
            terminal.status = 0 ;
            return "" ;
    }
    return await cmdErr( "Invalid color selection.", 1 ) ;
}

async function clrCmd() {
    clr() ;
    setCharPos(0, 0) ;
    terminal.status = 0 ;
    return "[0,0]" ;
}

async function exitCmd() {
    let out = "Goodbye!" ;
    await println( out ) ;
    terminal.status = 0 ;
    return "EXIT" ;
}

async function rndCmd(args) {
    try {
        args = await replaceVarsInArgs(args) ;
    } catch(e) {
        return await cmdErr( e, 1 ) ;
    }

    if( typeof args[1] === "undefined") args[1] = "10" ;

    if(isNaN(args[1]) || args[1] < 1) {
        let out = "Invalid maximum; must be integer value greater than 1."
        return await cmdErr( out, 1 ) ;
    }

    let out = rnd(args[1]) ;
    terminal.status = 0 ;
    await println( out.toString() ) ;
    return out.toString() ;
}

async function resetCmd(args) {
    localStorage.removeItem('js-terminal--programInput');
    location.reload();
    return "" ;
}

async function systemCmd(args) {
    try {
        args = await replaceVarsInArgs(args) ;
    } catch(e) {
        return await cmdErr( e, 1 ) ;
    }

    if( typeof args[1] === "undefined") args[1] = "LIST" ;

    let out = "" ;
    switch(args[1]) {
        case "LIST":
            out = "ROWS, COLS, X, Y, STATUS, DEBUG, PROMPT" ; break ;
        case "ROWS":
            out = terminal.rows ; break ;
        case "COLS":
            out = terminal.columns ; break ;
        case "X":
            out = terminal.x ; break ;
        case "Y":
            out = terminal.y ; break ;
        case "STATUS":
            out = terminal.status ; break ;
        case "DEBUG":
            out = terminal.debugMode ? "TRUE" : "FALSE" ; break ;
        case "PROMPT":
            out = terminal.display.prompt ; break ;
        case "COLOR":
            out = terminal.display.color.toUpperCase() ; break ;
        default:
            return await cmdErr( "Invalid SYSTEM parameter: " + args[1] + ".", 1 ) ;
    }

    terminal.status = 0 ;
    await println( out ) ;
    return out.toString() ;
}

async function moveCmd(args) {
    try {
        args = await replaceVarsInArgs(args) ;
    } catch(e) {
        return await cmdErr( e, 1 ) ;
    }

    if(args.length !== 3)
        return await cmdErr( "Syntax error; MOVE requires three arguments.", 1 ) ;

    if( typeof args[1] === "undefined" || isNaN(args[1]) || typeof args[2] === "undefined" || isNaN(args[2]) )
        return await cmdErr( "Syntax error; MOVE command requires two integer arguments.", 1 ) ;

    args[1] = parseInt(args[1]) ;
    args[2] = parseInt(args[2]) ;

    if( args[1] < 0 || args[2] < 0 )
        return await cmdErr( "Syntax error; MOVE arguments cannot be less than 0.", 1 ) ;

    let out = terminal.program.input[args[1]] ;
    delete terminal.program.input[args[1]] ;
    terminal.program.input[args[2]] = out ;

    terminal.status = 0 ;
    await println( args[2] + " " + out ) ;
    return args[2] + " " + out ;
}

async function deleteCmd(args) {
    try {
        args = await replaceVarsInArgs(args) ;
    } catch(e) {
        return await cmdErr( e, 1 ) ;
    }

    if(args.length !== 2)
        return await cmdErr( "Syntax error; DELETE requires two arguments.", 1 ) ;

    if( typeof args[1] === "undefined" || isNaN(args[1]) )
        return await cmdErr( "Syntax error; DELETE command requires one integer argument.", 1 ) ;

    args[1] = parseInt(args[1]) ;

    if( args[1] < 0 )
        return await cmdErr( "Syntax error; DELETE argument cannot be less than 0.", 1 ) ;

    let out = terminal.program.input[args[1]] ;
    delete terminal.program.input[args[1]] ;

    terminal.status = 0 ;
    await println( args[1] + " " + out ) ;
    return args[1] + " " + out ;
}

async function downloadCmd() {
    let output = "" ;
    for(let i in terminal.program.input) {
        if( terminal.program.input[i] )
            output += i + " " + terminal.program.input[i] + "\n" ;
    }

    let element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(output));
    element.setAttribute('download', 'terminal-program.txt');

    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

async function cmdErr(msg, code) {
    if( !code ) code = 1 ;
    terminal.status = code ;
    await println( msg ) ;
    return "ERROR" ;
}

async function replaceVarsInArgs(args) {
    logDebugInfo("replaceVarsInArgs(args); Input args = " + args) ;
    let variable = {}, i = 0 ;
    while(i < args.length) {
        variable = extractVarFromArgs(args.slice(i, args.length));
        i += variable.end-variable.start ;
        switch (variable.mode) {
            case VAR_MODE_STRING:
            case VAR_MODE_VAR:
                args.splice( variable.start, variable.end-variable.start+1, variable.value ) ;
                i -= variable.end-variable.start ;
                break;
            case VAR_MODE_EXPR:
                terminal.program.suppressOutput = true;
                variable.value = await processCmd(variable.value);
                terminal.program.suppressOutput = false;
                if (returnStatus() !== 0) {
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
    logDebugInfo("replaceVarsInArgs(args); Output args = " + args) ;
    return args ;
}

function extractVarFromArgs(args) {
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
        if( typeof terminal.program.variables[varName] === "undefined" )
            throw "Reference error; variable " + varName + " does not exist." ;
        response.value = terminal.program.variables[varName] ;
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

async function evalExpr(expr, mode) {
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
            terminal.program.suppressOutput = true ;
            value = await processCmd(value) ;
            terminal.program.suppressOutput = false ;
            if(returnStatus() !== 0) {
                throw "Runtime error; expression evaluation failed." ;
            }
            break ;
        default:
            value = expr ;
            break ;
    }
    return value ;
}