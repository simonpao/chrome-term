try {
    let terminal = new ChromeTerminal(60, 25, 0) ;
    registerDefaultCommands(terminal);

    terminal.registerCmd( "SNAKE", {
        args: [ "length", "maxLength" ],
        callback: snake.bind(terminal)
    }) ;

    let bookmarks = await chrome.bookmarks.getTree() ;
    let chromeCmd = new ChromeCommands(terminal, bookmarks) ;

    $("#terminal-input").focus();

    await terminal.startInputLoop() ;
} catch(e) {
    console.error(e) ;
}