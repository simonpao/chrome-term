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
 - `tabgroup` (not implemented yet)
   - open / close tab group
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
 - `cp` to copy (not implemented yet)
 - `mv` to move (not implemented yet)
 - `rm` to remove
