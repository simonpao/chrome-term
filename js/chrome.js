class ChromeCommands {
    static flags = {
        open:  ["--OPEN",  "OPEN",  "-O", "O"],
        close: ["--CLOSE", "CLOSE", "-C", "C"],
        new:   ["--NEW",   "NEW",   "-N", "N"],
        list:  ["--LIST",  "LIST",  "-L", "L", "LS"],
        info:  ["--INFO",  "INFO",  "-I", "I"],
        modifiers: ["A", "F", "L"]
    }

    path = { text:"/", id: "0", parentId: null } ;
    settings = {
        account: "Chrome"
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
            ontab: this.rmdirTab.bind(this),
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
            args: [ "action", "name (optional)" ],
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
        return this.#insertCompletion(args) ;
    }

    async ls(args) {
        let dirs = this.#getDirContents(this.path.id);
        let flags = {} ;
        if(this.#isFlags(args[1]))
            flags = this.#parseFlags(args[1]) ;

        if(flags.A) {
            dirs.splice( 0, 0, {
                "title": "..",
                "id": "",
                "parentId": "",
                "dateAdded": 0,
                "type": "dir"
            }) ;
            dirs.splice( 0, 0, {
                "title": ".",
                "id": "",
                "parentId": "",
                "dateAdded": 0,
                "type": "dir"
            }) ;
        }

        if(!flags.L) {
            let out = this.#printList(dirs, "title", false);
            this.terminal.terminal.status = 0;
            return out;
        } else {
            let out = "" ;
            out += "T ID    PARENT DATE        TIME   NAME" ;
            await this.terminal.println(out) ;

            for(let dir of dirs) {
                let tmp = dir.type === "dir" ? "d" : "-" ;
                tmp += " " + this.#padWithSpaces( dir.id.toString(), 5) ;
                tmp += " " + this.#padWithSpaces( dir.parentId.toString(), 6) ;
                tmp += " " + this.#padWithSpaces( this.#getFormattedDate(dir.dateAdded), 18) ;
                tmp += " " + this.#padWithSpaces( dir.title, this.terminal.terminal.columns-36 ) ;

                out += tmp + "\n" ;
                await this.terminal.println(tmp, 0, this.#getColor(dir.type)) ;
            }

            this.terminal.terminal.status = 0;
            return out;
        }
    }

    async su(args) {
        if(args.length < 2)
            return await cmdErr( this.terminal, "Syntax error; su requires a username.", 1 ) ;

        this.settings.account = args[1] ;

        this.#saveSettings() ;
    }

    async mkdir(args) {
        if(args.length < 2)
            return await cmdErr( this.terminal, "Syntax error; mkdir requires a directory name.", 1 ) ;

        let name = args.splice(1, args.length-1).join(" ") ;

        switch(name) {
            case ".":
            case "~":
            case "..":
                return await cmdErr( this.terminal, "Syntax error; mkdir name is invalid.", 1 ) ;
            default:
                try {
                    let newDir = await this.#createFolder(name, this.path.id);
                    this.bookmarks.push({
                        title: newDir.title,
                        id: newDir.id,
                        parentId: newDir.parentId,
                        index: newDir.index,
                        dateAdded: newDir.dateAdded,
                        dateGroupModified: newDir.dateGroupModified,
                        type: "dir"
                    });
                } catch(e) {
                    return await cmdErr( this.terminal, "Runtime error; " + e, 1 ) ;
                }
        }

        this.terminal.terminal.status = 0 ;
        return name ;
    }

    async rmdir(args) {if(args.length < 2)
        return await cmdErr( this.terminal, "Syntax error; rmdir requires a directory name.", 1 ) ;

        let name = args.splice(1, args.length-1).join(" ") ;

        switch(name) {
            case ".":
            case "~":
            case "..":
                return await cmdErr( this.terminal, "Syntax error; rmdir name is invalid.", 1 ) ;
            default:
                try {
                    let rmDir = await this.#getItemByName(name, this.path.id) ;
                    if(rmDir.length > 1) {
                        await this.#printList(rmDir, "title", false);
                        return await cmdErr( this.terminal, "Multiple directories; rmdir aborted.", 1 ) ;
                    } else {
                        await this.#deleteFolder(rmDir[0].id) ;
                    }
                } catch(e) {
                    return await cmdErr( this.terminal, "Runtime error; " + e, 1 ) ;
                }
        }

        this.terminal.terminal.status = 0 ;
        return name ;
    }

    async rmdirTab(args) {
        return this.#insertCompletion(args) ;
    }

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

        if(ChromeCommands.flags.list.includes(action)) {
            let allTabs = [] ;

            try {
                if(!name) {
                    allTabs = await this.#getAllTabs() ;
                } else {
                    allTabs = await this.#getAllTabs(
                        item =>
                            item.title?.toLowerCase()?.startsWith(name.toLowerCase())
                    ) ;
                }
            } catch (e) {
                return await cmdErr( this.terminal, e, 1 ) ;
            }

            for(let t in allTabs) {
                result += `[${t}] ${allTabs[t].id} ` ;
                result += `: ${allTabs[t].title}\n` ;
            }

            this.terminal.terminal.status = 0 ;
            await this.terminal.print( result ) ;
            return result ;
        }

        if(ChromeCommands.flags.info.includes(action)) {
            let tab ;
            try {
                if(!name) {
                    tab = await this.#getCurrentTab() ;
                } else {
                    tab = await this.#getTabById(parseInt(name)) ;
                }
            } catch (e) {
                return await cmdErr( this.terminal, e, 1 ) ;
            }

            result += `id: ${tab.id}\n` ;
            result += `groupId: ${tab.groupId === -1 ? "none" : tab.groupId}\n` ;
            result += `windowId: ${tab.windowId}\n` ;
            result += `title: ${tab.title}\n` ;
            result += `url: ${tab.url}` ;
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
            if(bookmark.length === 1 && bookmark[0].type === "bookmark")
                return args[0] + " " + args[1] + " " + bookmark[0].title ;
            if(bookmark.length > 1) {
                await this.#printList(bookmark) ;
                return args[0] + " " + args[1] + " " + name ;
            }
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

    async #printList(collection, attribute = "title", printPrompt = true) {
        if(printPrompt) await this.terminal.print("\n") ;

        let columns = this.terminal.terminal.columns ;
        let titles = [] ;
        let max = 0 ;
        let out = "" ;

        for(let c of collection) {
            titles.push({text: c[attribute], len: c[attribute].length, type: c.type});
            if(c[attribute].length > max)
                max = c[attribute].length ;
        }

        if(max < columns/4) {
            for(let t of titles) {
                out += t.text + this.#spaces((columns / 4) - t.len) ;
                await this.terminal.print(t.text + this.#spaces((columns / 4) - t.len), 0, this.#getColor(t.type));
            }
        }
        else if(max < columns/3) {
            for(let t of titles) {
                out += t.text + this.#spaces((columns / 3) - t.len) ;
                await this.terminal.print(t.text + this.#spaces((columns / 3) - t.len), 0, this.#getColor(t.type));
            }
        }
        else if(max < columns/2) {
            for(let t of titles) {
                out += t.text + this.#spaces((columns / 2) - t.len) ;
                await this.terminal.print(t.text + this.#spaces((columns / 2) - t.len), 0, this.#getColor(t.type));
            }
        }
        else {
            for(let t of titles) {
                out += t.text + "\n"
                await this.terminal.println(
                    this.#padWithSpaces( t.text, this.terminal.terminal.columns-1 ),
                    0,
                    this.#getColor(t.type)
                );
            }
        }

        await this.terminal.print("\n");
        if(printPrompt) {
            await this.terminal.printPrompt(this.terminal.terminal.display.prompt);
            this.terminal.insertCarrot(this.terminal.terminal.display.carrot);
        }
        return "" ;
    }

    async #insertCompletion(args) {
        let name = args.splice(1, args.length-1).join(" ") ;
        let item = this.#getItemByPartialName(name, this.path.id ) ;
        if(item.length === 1)
            return args[0] + " " + item[0].title ;
        if(item.length > 1) {
            await this.#printList(item) ;
            return args[0] + " " + name ;
        }
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

    async #deleteFolder(id) {
        return new Promise((resolve, reject) => {
            if(!id) {
                reject("Error deleting folder") ;
                return ;
            }
            chrome.bookmarks.remove(id, res => resolve(res));
            this.bookmarks.splice(
                this.bookmarks.findIndex( item => item.id === id ), 1
            );
        }) ;
    }

    async #getAllTabs(filter) {
        return new Promise((resolve, reject) => {
            chrome.tabs.query({}, tabs => {
                if (tabs.length) {
                    if(typeof filter === "function")
                        resolve(tabs.filter(filter)) ;
                    else
                        resolve(tabs) ;
                } else {
                    reject("Unable to get tabs") ;
                }
            });
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

    async #getTabById(id) {
        return new Promise((resolve, reject) => {
            chrome.tabs.get(id, tab => {
                if (tab) {
                    resolve(tab) ;
                } else {
                    reject(`ID ${id} not found.`) ;
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

    #getColor(type) {
        switch(type) {
            case "dir":
                return "blue" ;
            case "bookmark":
            default:
                return "white" ;
        }
    }

    #padWithSpaces(str, totalLen) {
        if( str.length === totalLen ) return str ;
        if( str.length < totalLen ) {
            str += this.#spaces(totalLen - str.length) ;
        } else {
            str = str.slice(0, totalLen-3) + "..."
        }
        return str ;
    }

    #padWithZeros(str, totalLen) {
        if( str.length === totalLen ) return str ;
        if( str.length < totalLen ) {
            str = this.#spaces(totalLen - str.length, "0") + str ;
        } else {
            str = str.slice(0, totalLen-1) + "-"
        }
        return str ;
    }

    #spaces(num, char = " ") {
        let spaces = "" ;
        while(num) {
            spaces += char ;
            num-- ;
        }
        return spaces ;
    }

    #isFlags(str) {
        return str?.startsWith("-") ;
    }

    #parseFlags(str) {
        // Initialize object with all possible modifiers
        let opts = {} ;
        for(let letter of ChromeCommands.flags.modifiers)
            opts[letter] = false ;

        // Set opts to true if they exist in string
        let flags = str.split("") ;
        for(let flag of flags) {
            flag = flag.toUpperCase() ;
            if(opts.hasOwnProperty(flag))
                opts[flag] = true ;
        }

        return opts ;
    }

    #getFormattedDate(timestamp) {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ];
        let date = new Date(timestamp) ;
        let str = date.getFullYear() + " " ;
        str += monthNames[date.getMonth()] + " " ;
        str += this.#padWithZeros((date.getDate()).toString(), 2) + " " ;
        str += this.#padWithZeros((date.getHours()).toString(), 2) + ":" ;
        str += this.#padWithZeros((date.getMinutes()).toString(), 2) + " " ;
        return str ;
    }
}