try {
    let terminal = new ChromeTerminal(60, 25, 0) ;
    registerDefaultCommands(terminal);

    terminal.registerCmd( "SNAKE", {
        args: [ "length", "maxLength" ],
        callback: snake.bind(terminal)
    }) ;

    $("#terminal-input").focus();

    await terminal.print("Simon", 0, "green") ;
    await terminal.print(":", 0, "white") ;
    await terminal.print("~/", 0, "blue") ;
    await terminal.startInputLoop() ;
} catch(e) {
    console.error(e) ;
}