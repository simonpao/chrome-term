class ChromeCommands {
    static flags = {
        open:  ["--OPEN",  "OPEN",  "O"],
        close: ["--CLOSE", "CLOSE", "C"],
        new:   ["--NEW",   "NEW",   "N"],
        list:  ["--LIST",  "LIST",  "L", "LS"],
        info:  ["--INFO",  "INFO",  "I"],
        edit:  ["--EDIT",  "EDIT",  "E"],
        save:  ["--SAVE",  "SAVE",  "S"],
        activate: ["--ACTIVATE", "ACTIVATE", "A"],
        modifiers: ["A", "F", "I", "L"]
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
            ontab: this.cpTab.bind(this),
            help: "./man/chrome.json"
        });
        terminal.registerCmd("MV", {
            args: [ "source-bookmark", "destination-bookmark" ],
            callback: this.mv.bind(this),
            ontab: this.mvTab.bind(this),
            help: "./man/chrome.json"
        });
        terminal.registerCmd("TAB", {
            args: [ "action", "[-i]", "[name (or id with -i flag)]" ],
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
            args: [ "action", "[-i]", "[name (or id with -i flag)]" ],
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
                dir = this.#getItemFromPath(name) ;
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
        return await this.#insertCompletion(args, "dir") ;
    }

    async ls(args) {
        let dirs = this.#getDirContents(this.path.id);
        let flags = {} ;
        if(isFlags(args[1]))
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
                tmp += " " + padWithSpaces( dir.id.toString(), 5) ;
                tmp += " " + padWithSpaces( dir.parentId.toString(), 6) ;
                tmp += " " + padWithSpaces( getFormattedDate(dir.dateAdded), 18) ;
                tmp += " " + padWithSpaces( dir.title, this.terminal.terminal.columns-36 ) ;

                out += tmp + "\n" ;
                await this.terminal.println(tmp, 0, getColor(dir.type)) ;
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
        return await this.#insertCompletion(args, "dir") ;
    }

    async cp(args) {}

    async cpTab(args) {
        return await this.#insertCompletion(args, "bookmark") ;
    }

    async mv(args) {}

    async mvTab(args) {
        return await this.#insertCompletion(args, "bookmark") ;
    }

    async tab(args) {
        let action = args[1]?.toUpperCase() ;

        let flags = {} ;
        let startPath = 2 ;
        if(isFlags(args[2])) {
            flags = this.#parseFlags(args[2]) ;
            startPath++ ;
        }

        let name = args.slice(startPath, args.length).join(" ") ;
        let result = "" ;

        if(ChromeCommands.flags.open.includes(action)) {
            if(!name)
                return await cmdErr( this.terminal, `No bookmark specified.`, 1 ) ;
            let bookmark ;
            if(flags.I)
                bookmark = this.#getItemById(name)[0] ;
            else
                bookmark = this.#getItemFromPath(name) ;

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

        if(ChromeCommands.flags.close.includes(action)) {
            if(!name)
                return await cmdErr( this.terminal, `No tab specified.`, 1 ) ;

            let id ;
            if(flags.I) {
                id = name ;
            } else {
                let tab = await this.#getTabByName(name) ;
                if(!tab || !tab.length)
                    return await cmdErr( this.terminal, `Tab "${name}" not found.`, 1 ) ;
                id = tab[0].id ;
            }

            if(!id)
                return await cmdErr( this.terminal, `Runtime error; could not close tab.`, 1 ) ;

            try {
                await this.#closeTab(id) ;
            } catch(e) {
                return await cmdErr( this.terminal, `Runtime error; could not close tab: ${e}`, 1 ) ;
            }
            this.terminal.terminal.status = 0 ;
            await this.terminal.println( `Tab ID ${id} closed.` ) ;
            return result ;
        }

        if(ChromeCommands.flags.new.includes(action)) {
            await this.#openNewTab(null) ;
        }

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

            result += "ID             TITLE\n" ;
            for(let t in allTabs) {
                result += padWithSpaces(allTabs[t].id.toString() + ": ", 15);
                result += padWithSpaces(allTabs[t].title, this.terminal.terminal.columns-16) + "\n" ;
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
                } else if(flags.I) {
                    tab = await this.#getTabById(parseInt(name)) ;
                } else {
                    tab = await this.#getTabByName(name) ;
                    if(!tab || !tab.length)
                        return await cmdErr( this.terminal, `Tab "${name}" not found.`, 1 ) ;
                    tab = tab[0] ;
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

        if(ChromeCommands.flags.activate.includes(action)) {
            if(!name)
                return await cmdErr( this.terminal, `No tab specified.`, 1 ) ;

            let id ;
            if(flags.I) {
                id = name ;
            } else {
                let tab = await this.#getTabByName(name) ;
                if(!tab || !tab.length)
                    return await cmdErr( this.terminal, `Tab "${name}" not found.`, 1 ) ;
                id = tab[0].id ;
            }

            if(!id)
                return await cmdErr( this.terminal, `Runtime error; could not activate tab.`, 1 ) ;

            try {
                await this.#activateTab(id) ;
            } catch(e) {
                return await cmdErr( this.terminal, `Runtime error; could not activate tab: ${e}`, 1 ) ;
            }

            this.terminal.terminal.status = 0 ;
            await this.terminal.println( `Tab ID ${id} activated.` ) ;
            return result ;
        }

        this.terminal.terminal.status = 1 ;
        await this.terminal.println( `Failed to process tab command.` ) ;
        return result ;
    }

    async tabTab(args) {
        let action = args[1]?.toUpperCase() ;

        let flags = {} ;
        let startPath = 2 ;
        if(isFlags(args[2])) {
            flags = this.#parseFlags(args[2]) ;
            startPath++ ;
        }

        if(ChromeCommands.flags.open.includes(action)) {
            if(flags.I)
                return await this.#insertIdCompletion(args, startPath) ;
            else
                return await this.#insertCompletion(args, "dir", startPath) ;
        }

        if(ChromeCommands.flags.close.includes(action) ||
           ChromeCommands.flags.info.includes(action) ||
           ChromeCommands.flags.activate.includes(action)) {
            return await this.#insertTabCompletion(args, startPath, flags) ;
        }

        return "" ;
    }

    async tabgroup(args) {}

    async tabgroupTab(args) {
        return "" ;
    }

    async bookmark(args) {
        let action = args[1]?.toUpperCase() ;

        let flags = {} ;
        let startPath = 2 ;
        if(isFlags(args[2])) {
            flags = this.#parseFlags(args[2]) ;
            startPath++ ;
        }

        let name = args.slice(startPath, args.length).join(" ") ;
        let result = "" ;

        if(ChromeCommands.flags.open.includes(action)) {
            if(!name)
                return await cmdErr( this.terminal, `No bookmark specified.`, 1 ) ;
            let bookmark ;
            if(flags.I)
                bookmark = this.#getItemById(name)[0] ;
            else
                bookmark = this.#getItemFromPath(name) ;

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

        if(ChromeCommands.flags.new.includes(action)) {
            if(this.path.id === "0")
                return await cmdErr( this.terminal, `Bookmark cannot be saved to the root directory.`, 1 ) ;

            let tab ;
            try {
                if(!name) {
                    tab = await this.#getCurrentTab() ;
                } else if(flags.I) {
                    tab = await this.#getTabById(parseInt(name)) ;
                } else {
                    tab = await this.#getTabByName(name) ;
                    if(!tab || !tab.length)
                        return await cmdErr( this.terminal, `Tab "${name}" not found.`, 1 ) ;
                    tab = tab[0] ;
                }

                await this.#createBookmark(tab.title, tab.url, this.path.id) ;
                this.terminal.terminal.status = 0 ;
                await this.terminal.println( `Bookmark saved as ${tab.title}.` ) ;
                return result ;
            } catch (e) {
                return await cmdErr( this.terminal, e, 1 ) ;
            }
        }

        if(ChromeCommands.flags.info.includes(action)) {}

        if(ChromeCommands.flags.edit.includes(action)) {}

    }

    async bookmarkTab(args) {
        let action = args[1]?.toUpperCase() ;

        let flags = {} ;
        let startPath = 2 ;
        if(isFlags(args[2])) {
            flags = this.#parseFlags(args[2]) ;
            startPath++ ;
        }

        if(ChromeCommands.flags.open.includes(action) ||
           ChromeCommands.flags.info.includes(action) ||
           ChromeCommands.flags.edit.includes(action)) {
            if(flags.I)
                return await this.#insertIdCompletion(args, startPath) ;
            else
                return await this.#insertCompletion(args, "dir", startPath) ;
        }

        if(ChromeCommands.flags.new.includes(action)) {
            return await this.#insertTabCompletion(args, startPath, flags) ;
        }

        return "" ;
    }

    async #printList(collection, attribute, printPrompt) {
        return await printList(this.terminal, collection, attribute, printPrompt) ;
    }

    async #insertCompletion(args, type, start = 1) {
        let begin = args.slice(0, start).join(" ") ;
        let name = args.slice(start, args.length).join(" ") ;
        let item = this.#getItemByPartialName(name, this.path.id, type ) ;
        let path = item[0]?.title || "" ;

        if(item.length === 0 && type === "dir") {
            let nameParts = name.split("/") ;
            let id = this.path.id ;
            let save = "" ;
            for(let i in nameParts) if(nameParts.hasOwnProperty(i)) {
                let part = nameParts[i] ;

                if(parseInt(i)+1 === nameParts.length)
                    item = this.#getItemByPartialName((save !== "" ? save : part), id ) ;
                else
                    item = this.#getItemByName((save !== "" ? save + part : part), id ) ;

                if(!item || !item.length)
                    save += part + "/" ;
                else {
                    save = "" ;
                    id = item[0]?.id ;
                    path += item[0]?.title + "/" ;
                }
            }
        }
        if(item.length === 1) {
            if(path.endsWith("/") && item[0]?.type !== "dir")
                path = path.slice(0, path.length-1) ;
            if(!path.endsWith("/") && item[0]?.type === "dir")
                path += "/" ;
            return begin + " " + path ;
        }
        if(item.length > 1) {
            if(item.length > 100) {
                await this.terminal.println(`\n${items.length} matches.`) ;
                await this.terminal.printPrompt(this.terminal.terminal.display.prompt);
                this.terminal.insertCarrot(this.terminal.terminal.display.carrot);
                return begin + " " + name ;
            }
            await this.#printList(item) ;
            return begin + " " + name ;
        }
        return "" ;
    }

    async #insertIdCompletion(args, start = 1) {
        let begin = args.slice(0, start).join(" ") ;
        let name = args.slice(start, args.length).join(" ") ;
        let items = this.#filterItemsById(name) ;

        if(items.length === 1)
            return begin + " " + items[0].id ;
        if(items.length > 1) {
            if(items.length > 100) {
                await this.terminal.println(`\n${items.length} matches.`) ;
                await this.terminal.printPrompt(this.terminal.terminal.display.prompt);
                this.terminal.insertCarrot(this.terminal.terminal.display.carrot);
                return begin + " " + name ;
            }
            await this.#printList(items, "id") ;
            return begin + " " + name ;
        }
    }

    async #insertTabCompletion(args, start = 1, flags = {}) {
        let begin = args.slice(0, start).join(" ") ;
        let name = args.slice(start, args.length).join(" ") ;

        let tabs ;
        if(flags.I)
            tabs = await this.#getAllTabs(item =>
                item.id?.toString()?.startsWith(name)
            ) ;
        else
            tabs = await this.#getAllTabs(item =>
                item.title?.toLowerCase()?.startsWith(name.toLowerCase())
            ) ;

        let attr = flags.I ? "id" : "title" ;
        if(tabs.length === 1)
            return begin + " " + tabs[0][attr] ;
        if(tabs.length > 1) {
            if(tabs.length > 100) {
                await this.terminal.println(`\n${items.length} matches.`) ;
                await this.terminal.printPrompt(this.terminal.terminal.display.prompt);
                this.terminal.insertCarrot(this.terminal.terminal.display.carrot);
                return begin + " " + name ;
            }
            await this.#printList(tabs, attr) ;
            return begin + " " + name ;
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

    // Folder operations
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

    #getItemFromPath(path) {
        if(path.endsWith("/"))
            path = path.slice(0, path.length-1) ;
        let item = this.#getItemByName(path, this.path.id )[0] ;
        if(!item) {
            let pathParts = path.split("/") ;
            let id = this.path.id ;
            let save = "" ;
            for(let part of pathParts) {
                item = this.#getItemByName((save !== "" ? save + part : part), id )[0] ;
                if(!item) save += part + "/" ;
                else {
                    save = "" ;
                    id = item?.id ;
                }
            }
        }
        return item ;
    }

    // Tab operations
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

    async #getTabByName(name) {
        return new Promise((resolve, reject) => {
            chrome.tabs.query({
                title: name
            }, tabs => {
                resolve(tabs) ;
            })
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

    async #closeTab(id) {
        return new Promise((resolve, reject) => {
            id = parseInt(id) ;
            if(isNaN(id) || typeof id !== "number")
                reject("ID must be a number.") ;
            else
                chrome.tabs.remove(parseInt(id), res => {
                    resolve(res) ;
                })
        }) ;
    }

    async #activateTab(id) {
        return new Promise((resolve, reject) => {
            id = parseInt(id) ;
            if(isNaN(id) || typeof id !== "number")
                reject("ID must be a number.") ;
            else
                chrome.tabs.update(id, {
                    active: true,
                    highlighted: true
                }, res => {
                    resolve(res) ;
                })
        }) ;
    }

    // Utility functions
    #getDirContents(parentId) {
        return this.bookmarks.filter(item => item.parentId === parentId) ;
    }

    #getItemById(id) {
        return this.bookmarks.filter(item => item.id === id) ;
    }

    #filterItemsById(id) {
        return this.bookmarks.filter(item => item.id.toString().startsWith(id)) ;
    }

    #getItemByName(name, parentId) {
        return this.bookmarks.filter(
            item =>
                item.title?.toLowerCase() === name?.toLowerCase() &&
                item.parentId === parentId
        ) ;
    }

    #getItemByPartialName(part, parentId, type) {
        if(typeof type === "string")
            return this.bookmarks.filter(
                item =>
                    item.title?.toLowerCase()?.startsWith(part?.toLowerCase()) &&
                    item.parentId === parentId && item.type === type
            ) ;
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
}