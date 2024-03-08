try {
    initWindow(60, 25, 0, false);
    registerDefaultCommands();
} catch(e) {
    alert(e) ;
}

registerCmd( "SNAKE", {
    args: [ "length", "maxLength" ],
    callback: snake
}) ;

$("#terminal-input").focus();

await startInputLoop() ;