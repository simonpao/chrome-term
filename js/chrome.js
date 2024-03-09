class ChromeCommands {
    static flags = {
        open:  ["--OPEN",  "OPEN",  "-O", "O"],
        close: ["--CLOSE", "CLOSE", "-C", "C"],
        new:   ["--NEW",   "NEW",   "-N", "N"],
        list:  ["--LIST",  "LIST",  "-L", "L", "LS"],
        info:  ["--INFO",  "INFO",  "-I", "I"]
    }

    path = { text:"/", id: "0", parentId: null } ;
    settings = {
        account: "Chrome",
        aliases: []
    }

    constructor(terminal, bookmarks) {
        this.bookmarks = this.#processBookmarks(bookmarks) ;
        this.terminal = terminal ;

        this.#restorePath() ;
        this.#restoreSettings() ;

        terminal.registerCmd("CD", {
            args: [ "folder-name" ],
            callback: this.cd.bind(this),
            ontab: this.cdTab.bind(this),
            help: "./man/chrome.json"
        });
        terminal.registerCmd("LS", {
            callback: this.ls.bind(this),
            help: "./man/chrome.json"
        });
        terminal.registerCmd("SU", {
            args: [ "username" ],
            callback: this.su.bind(this),
            help: "./man/chrome.json"
        });
        terminal.registerCmd("MKDIR", {
            args: [ "folder-name" ],
            callback: this.mkdir.bind(this),
            help: "./man/chrome.json"
        });
        terminal.registerCmd("RMDIR", {
            args: [ "folder-name" ],
            callback: this.rmdir.bind(this),
            help: "./man/chrome.json"
        });
        terminal.registerCmd("CP", {
            args: [ "source-bookmark", "destination-bookmark" ],
            callback: this.cp.bind(this),
            help: "./man/chrome.json"
        });
        terminal.registerCmd("MV", {
            args: [ "source-bookmark", "destination-bookmark" ],
            callback: this.mv.bind(this),
            help: "./man/chrome.json"
        });
        terminal.registerCmd("TAB", {
            args: [ "action", "name" ],
            callback: this.tab.bind(this),
            ontab: this.tabTab.bind(this),
            help: "./man/chrome.json"
        });
        terminal.registerCmd("TABGROUP", {
            args: [ "action", "group" ],
            callback: this.tabgroup.bind(this),
            ontab: this.tabgroupTab.bind(this),
            help: "./man/chrome.json"
        });
        terminal.registerCmd("BOOKMARK", {
            args: [ "action", "group-name" ],
            callback: this.bookmark.bind(this),
            ontab: this.bookmarkTab.bind(this),
            help: "./man/chrome.json"
        });
    }

    async cd(args) {
        if(args.length < 2)
            return await cmdErr( this.terminal, "Syntax error; cd requires a directory name.", 1 ) ;

        let name = args.splice(1, args.length-1).join(" ") ;

        let dir ;
        switch(name) {
            case ".":
                return ;
            case "~":
                dir = this.#getItemById( "0" )[0] ;
                if(!dir)
                    return await cmdErr( this.terminal, `Directory ${name} not found.`, 1 ) ;
                break ;
            case "..":
                if(!this.path.parentId)
                    return await cmdErr( this.terminal, "Cannot move out of root directory.", 1 ) ;
                dir = this.#getItemById( this.path.parentId )[0] ;
                if(!dir)
                    return await cmdErr( this.terminal, `Directory ${name} not found.`, 1 ) ;
                break ;
            default:
                dir = this.#getItemByName(name, this.path.id )[0] ;
                if(!dir)
                    return await cmdErr( this.terminal, `Directory ${name} not found.`, 1 ) ;
                if(dir.type !== "dir")
                    return await cmdErr( this.terminal, `${name} is not a directory.`, 1 ) ;

        }

        this.path.id = dir.id ;
        this.path.parentId = dir.parentId ;
        this.path.text = this.#constructPath() ;
        this.terminal.terminal.status = 0 ;

        this.#savePath() ;
        return this.path.text ;
    }

    async cdTab(args) {
        let name = args.splice(1, args.length-1).join(" ") ;
        let dir = this.#getItemByPartialName(name, this.path.id ) ;
        if(dir.length)
            return args[0] + " " + dir[0].title ;
        return "" ;
    }

    async ls() {
        let dirs = this.#getDirContents(this.path.id) ;
        let out = "" ;
        for(let dir of dirs) {
            await this.terminal.println(dir.title, 0, dir.type === "dir" ? "blue" : "white");
            out += dir.title + "\n" ;
        }
        this.terminal.terminal.status = 0 ;
        return out ;
    }

    async su(args) {
        if(args.length < 2)
            return await cmdErr( this.terminal, "Syntax error; su requires a username.", 1 ) ;

        this.settings.account = args[1] ;

        this.#saveSettings() ;
    }

    async mkdir(args) {}

    async rmdir(args) {}

    async cp(args) {}

    async mv(args) {}

    async tab(args) {
        let action = args[1]?.toUpperCase() ;
        let name = args.splice(2, args.length-1).join(" ") ;
        let result = "" ;

        if(ChromeCommands.flags.open.includes(action)) {
            if(!name)
                return await cmdErr( this.terminal, `No bookmark specified.`, 1 ) ;
            let bookmark = this.#getItemByName(name, this.path.id )[0] ;
            if(!bookmark)
                return await cmdErr( this.terminal, `Bookmark "${name}" not found.`, 1 ) ;
            if(bookmark.type !== "bookmark")
                return await cmdErr( this.terminal, `${name} is not a bookmark.`, 1 ) ;
            result = bookmark.url ;
            await this.#openNewTab(bookmark.url) ;
            this.terminal.terminal.status = 0 ;
            await this.terminal.println( `Bookmark opened in new tab.` ) ;
            return result ;
        }

        if(ChromeCommands.flags.close.includes(action)) {}
        if(ChromeCommands.flags.new.includes(action)) {}
        if(ChromeCommands.flags.list.includes(action)) {}

        if(ChromeCommands.flags.info.includes(action)) {
            if(!name) {
                try {
                    let currentTab = await this.#getCurrentTab() ;
                    result += `id: ${currentTab.id}\n` ;
                    result += `groupId: ${currentTab.groupId === -1 ? "none" : currentTab.groupId}\n` ;
                    result += `windowId: ${currentTab.windowId}\n` ;
                    result += `title: ${currentTab.title}\n` ;
                    result += `url: ${currentTab.url}` ;
                } catch (e) {
                    return await cmdErr( this.terminal, "Failed to get current tab: " + e, 1 ) ;
                }
            } else {
                // TODO: Get open tab by name
            }
            this.terminal.terminal.status = 0 ;
            await this.terminal.println( result ) ;
            return result ;
        }

        this.terminal.terminal.status = 1 ;
        await this.terminal.println( `Failed to process tab command.` ) ;
        return result ;
    }

    async tabTab(args) {
        let action = args[1]?.toUpperCase() ;
        let name = args.splice(2, args.length-1).join(" ") ;

        if(ChromeCommands.flags.open.includes(action)) {
            let bookmark = this.#getItemByPartialName(name, this.path.id ) ;
            if(bookmark.length && bookmark[0].type === "bookmark")
                return args[0] + " " + args[1] + " " + bookmark[0].title ;
        }

        return "" ;
    }

    async tabgroup(args) {}

    async tabgroupTab(args) {
        return "" ;
    }

    async bookmark(args) {}

    async bookmarkTab(args) {
        return "" ;
    }

    async #createBookmark(title, url, folderId) {
        return new Promise((resolve, reject) => {
            if(!folderId || !title || !url) {
                reject("Error creating bookmark") ;
                return ;
            }
            chrome.bookmarks.create({
                parentId: folderId.toString(),
                title: title,
                url: url,
            }, newBookmark => {
                resolve(newBookmark) ;
            });
        }) ;
    }

    async #createFolder(title, parentId) {
        return new Promise((resolve, reject) => {
            if(!title || !parentId) {
                reject("Error creating folder") ;
                return ;
            }
            chrome.bookmarks.create(
                {
                    parentId: parentId.toString(),
                    title: title
                }, newFolder => {
                    resolve(newFolder) ;
                },
            );
        }) ;
    }

    async #getCurrentTab() {
        return new Promise((resolve, reject) => {
            chrome.tabs.query({active: true, lastFocusedWindow: true}, tabs => {
                if (tabs.length) {
                    resolve(tabs[0]) ;
                } else {
                    reject("Unable to get current tab") ;
                }
            });
        }) ;
    }

    async #openNewTab(url, group) {
        return new Promise((resolve, reject) => {
            chrome.tabs.create({
                active: false,
                url: url
            }, async (tab) => {
                if(typeof group === "string") {
                    let tabGroup = await chrome.tabGroups.query( { title: group } ) ;
                    if(!tabGroup.length) {
                        const groupId = await chrome.tabs.group({ tabIds: tab.id });
                        await chrome.tabGroups.update(groupId, { title: group });
                    } else {
                        await chrome.tabs.group({ groupId: tabGroup[0].id, tabIds: tab.id });
                    }
                }
                resolve() ;
            }) ;
        }) ;
    }

    #getDirContents(parentId) {
        return this.bookmarks.filter(item => item.parentId === parentId) ;
    }

    #getItemById(id) {
        return this.bookmarks.filter(item => item.id === id) ;
    }

    #getItemByName(name, parentId) {
        return this.bookmarks.filter(
            item =>
                item.title?.toLowerCase() === name?.toLowerCase() &&
                item.parentId === parentId
        ) ;
    }

    #getItemByPartialName(part, parentId) {
        return this.bookmarks.filter(
            item =>
                item.title?.toLowerCase()?.startsWith(part?.toLowerCase()) &&
                item.parentId === parentId
        ) ;
    }

    #constructPath() {
        let path = "" ;
        let id = this.path.id ;
        do {
            let item = this.#getItemById(id)[0] ;
            path = item.title + "/" + path ;
            id = item?.parentId || false ;
        } while(id)
        return path ;
    }

    #processBookmarks(bookmarks) {
        let array = [] ;
        for(let item of bookmarks) {
            let obj = {
                title: item.title,
                id: item.id,
                parentId: item.parentId,
                index: item.index,
                dateAdded: item.dateAdded,
                dateGroupModified: item?.dateGroupModified
            } ;

            obj.type = "dir" ;
            if(item.url) {
                obj.url = item.url ;
                obj.type = "bookmark" ;
            }

            if(Array.isArray(item.children)) {
                array = [...array, ...this.#processBookmarks(item.children)] ;
            }

            if(typeof obj.title === "string")
                array.push(obj) ;
        }
        return array ;
    }

    #savePath() {
        this.terminal.terminal.display.path = this.path.text ;
        localStorage.setItem(`${this.terminal.localStoragePrefix}--cliPath`, JSON.stringify(this.path));
    }

    #restorePath() {
        let jsonString = localStorage.getItem(`${this.terminal.localStoragePrefix}--cliPath`);
        let tmpPath = JSON.parse(jsonString) ;
        if( tmpPath ) {
            this.path = tmpPath ;
            this.terminal.terminal.display.path = this.path.text ;
        }
    }

    #saveSettings() {
        this.terminal.terminal.display.account = this.settings.account ;
        localStorage.setItem(`${this.terminal.localStoragePrefix}--cliSettings`, JSON.stringify(this.settings));
    }

    #restoreSettings() {
        let jsonString = localStorage.getItem(`${this.terminal.localStoragePrefix}--cliSettings`);
        let tmpSettings = JSON.parse(jsonString) ;
        if( tmpSettings ) {
            this.settings = tmpSettings;
            this.terminal.terminal.display.account = this.settings.account ;
        }
    }
}