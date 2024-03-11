
try {
    let terminal = new ChromeTerminal(60, 25, 0) ;
    registerDefaultCommands(terminal);

    terminal.registerCmd( "SNAKE", {
        args: [ "length", "maxLength" ],
        callback: snake.bind(terminal)
    }) ;

    (async () => {
        let bookmarks = await chrome.bookmarks.getTree() ;
        let chromeCmd = new ChromeCommands(terminal, bookmarks) ;

        $("#terminal-input").focus();
        $("body").removeClass("loading") ;

        await terminal.startInputLoop() ;
    })() ;

} catch(e) {
    console.error(e) ;
}