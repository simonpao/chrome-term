# Chrome Terminal

## A "terminal" for chrome.

[Chrome Terminal - Chrome Web Store Page](https://chromewebstore.google.com/detail/chrome-terminal/ohejbgphpjcioiglmmpogdpffiacfkke)

Implements common chrome tasks as command line functions.

Examples include:
 - `tab`
   - open a new tab or bookmark
     - `tab new`
     - `tab new google.com`
   - close an open tab
     - `tab close Google`
     - `tab close -i 1652151025`
   - view info about open tabs
     - `tab ls`
     - `tab info Google`
     - `tab info -i 1652151025`
   - select a tab
     - `tab activate Google`
     - `tab activate -i 1652151025`
 - `tabgroup`
   - add ungrouped tabs to new or existing group
   - view open tab groups
 - `bookmark`
   - save a new bookmark
     - `bookmark new`
     - `bookmark new Google`
     - `bookmark new -rq Google`
       - Remove query params before saving
     - `bookmark new -i 1652151025`
       - Save new bookmark from tab ID
   - view existing bookmarks in current folder
     - `cd Bookmark bar/`
     - `ls -al`
   - delete a bookmark
     - `rm Google`
   - view details about a bookmark
     - `bookmark info Google`
     - `bookmark info -i 65`
 - `find`
   - find a bookmark based on given search term using asterisk (*) as a wildcard
     - `find Google/ *ana*ics*`
     - `find -s *analytics`
     - `find -i *analytics`
 - `history`
   - list recent history
     - `history ls`
     - `history ls google`
 - `reopen`
   - List recently closed tabs/windows
     - `reopen ls`
     - `reopen ls google`
   - Reopen recent tabs/windows
     - `reopen`
     - `reopen -s` (silent - does not activate the tab or remove from recent tab history)
     - `reopen Google`
     - `reopen -i 1234567890`
 - `google`
   - open a google search in new tab
     - `google search term`

Directory structure will be based on bookmark directories.
 - `cd` to move into folders
   - `cd Bookmarks bar/Folder`
   - `cd ~/Other bookmarks`
   - `cd ../Bookmarks bar/Folder`
 - `ls` to view folder contents
 - `mkdir` to create new folders
 - `rmdir` to delete a folder
 - `cp` to copy
 - `mv` to move
 - `rm` to remove

# Developer Guide

If you wish to extend the functionality of chrome terminal, the following should 
help get you started.

## Initialization

The terminal is initialized in ./js/popup.js with the specified number of rows and 
columns and the specified timeout interval (in milliseconds) that determines 
the speed at which each character is displayed on the terminal (0 for no delay).

To modify the default settings, 

```javascript
try {
    let terminal = new ChromeTerminal(
        numRows,
        numColumns,
        defaultTimeout,
        {
            promptChar,          // default: "$"
            printPath,           // default: true
            printAccount,        // default: true
            autoPauseOnOverflow, // default: true
            debugMode            // default: false
        }
    );
    registerDefaultCommands(terminal);
    await terminal.startInputLoop() ;
} catch(e) {
    console.error(e) ;
}
```

## How to Register a New Command

First, define the command handler:

```javascript
async function testCmd(args) {
    // Perform the action of the command
    await this.println(
        "This is a test command; here are your args: " +
        args.slice(1).join(", ")
    );
    return "";
}
```

Next, define a tab-completion function (optional):

```javascript
async function testCmdTab(args) {
    // Return the text that should be substituted on the command line
    return args[0] + " TEST_COMPLETION";
}
```

Finally, register the command:

```javascript
terminal.registerCmd("TEST", {
    args: ["args"],                   // The argument names this command accepts
    callback: testCmd.bind(terminal), // The command execution function
    ontab: testCmdTab.bind(terminal), // The on tab completion handler
    help: {                           // Command help text and properties
        location: "./man/help.json",
        hide: false,
        program: false
    }
});
```

