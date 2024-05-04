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
        modifiers: ["A", "D", "I", "L", "Q", "R", "S", "T"]
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
            args: [ "[folder-name]" ],
            callback: this.ls.bind(this),
            ontab: this.lsTab.bind(this),
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
        terminal.registerCmd("RM", {
            args: [ "source-bookmark", "destination-bookmark" ],
            callback: this.rm.bind(this),
            ontab: this.rmTab.bind(this),
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
        terminal.registerCmd("HISTORY", {
            args: [ "action", "[-d]", "[YYYY-MM-DD-HH:MM:SS]", "[name (or id with -i flag)]" ],
            callback: this.history.bind(this),
            ontab: this.historyTab.bind(this),
            help: "./man/chrome.json"
        });
        terminal.registerCmd("REOPEN", {
            args: [ "action", "[-is]", "[name (or id with -i flag)]" ],
            callback: this.reopen.bind(this),
            ontab: this.reopenTab.bind(this),
            help: "./man/chrome.json"
        });
        terminal.registerCmd("GOOGLE", {
            args: [ "search-term" ],
            callback: this.google.bind(this),
            ontab: this.googleTab.bind(this),
            help: "./man/chrome.json"
        });
    }

    async cd(args) {
        if(args.length < 2)
            return await cmdErr( this.terminal, "Syntax error; cd requires a directory name.", 1 ) ;

        let { name } = await this.#tokenizeCommandLineInput(args, {
            lookForAction: false
        }) ;

        let dir ;
        switch(name) {
            case ".":
                return ;
            case "~":
                dir = this.#getItemById( "0" ) ;
                if(!dir)
                    return await cmdErr( this.terminal, `Directory ${name} not found.`, 1 ) ;
                break ;
            case "..":
                if(!this.path.parentId)
                    return await cmdErr( this.terminal, "Cannot move out of root directory.", 1 ) ;
                dir = this.#getItemById( this.path.parentId ) ;
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
        return await this.#insertCompletion(args, "dir", {
            lookForAction: false, evalTokens: false
        }) ;
    }

    async ls(args) {
        let { flags, name } = await this.#tokenizeCommandLineInput(args) ;

        let id = this.path.id ;
        let partial = null ;
        if(name) {
            let item = this.#getItemFromPath(name) ;
            if(item) id = item.id ;
            else partial = name ;
        }

        let dirs = this.#getDirContents(id, partial);

        if(flags.A) {
            if(this.path.parentId) {
                let parent = this.#getItemById(this.path.parentId) ;
                dirs.splice( 0, 0, {
                    "title": "..",
                    "id": parent.id,
                    "parentId": parent.parentId,
                    "dateAdded": parent.dateAdded,
                    "type": "dir"
                }) ;
            }
            let thisItem = this.#getItemById(this.path.id) ;
            dirs.splice( 0, 0, {
                "title": ".",
                "id": thisItem.id,
                "parentId": thisItem.parentId,
                "dateAdded": thisItem.dateAdded,
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
                tmp += " " + padWithSpaces( dir.id?.toString() || "-", 5) ;
                tmp += " " + padWithSpaces( dir.parentId?.toString() || "-", 6) ;
                tmp += " " + padWithSpaces( getFormattedDate(dir.dateAdded), 18) ;
                tmp += " " + padWithSpaces( dir.title, this.terminal.terminal.columns-36 ) ;

                out += tmp + "\n" ;
                await this.terminal.println(tmp, 0, getColor(dir.type)) ;
            }

            this.terminal.terminal.status = 0;
            return out;
        }
    }

    async lsTab(args) {
        return await this.#insertCompletion(args, "dir", {
            lookForAction: false, evalTokens: false
        }) ;
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
                    let check = this.#getItemByName(name, this.path.id);
                    if(check.length)
                        return await cmdErr( this.terminal, "A directory with this name already exists.", 1 ) ;
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

    async rmdir(args) {
        if(args.length < 2)
            return await cmdErr( this.terminal, "Syntax error; rmdir requires a directory name.", 1 ) ;

        let name = args.splice(1, args.length-1).join(" ") ;

        switch(name) {
            case ".":
            case "~":
            case "..":
                return await cmdErr( this.terminal, "Syntax error; rmdir name is invalid.", 1 ) ;
            default:
                try {
                    let rmDir = this.#getItemFromPath(name) ;
                    if (!rmDir) {
                        return await cmdErr( this.terminal, "Directory not found.", 1 ) ;
                    } else {
                        if(rmDir.type !== "dir")
                            return await cmdErr( this.terminal, `${rmDir.title} is not a directory; rmdir aborted.`, 1 ) ;
                        let contents = this.#getDirContents(rmDir.id) ;
                        if(contents.length > 0)
                            return await cmdErr( this.terminal, "Directory is not empty; rmdir aborted.", 1 ) ;
                        await this.#deleteFolder(rmDir.id) ;
                    }
                } catch(e) {
                    return await cmdErr( this.terminal, "Runtime error; " + e, 1 ) ;
                }
        }

        this.terminal.terminal.status = 0 ;
        return name ;
    }

    async rmdirTab(args) {
        return await this.#insertCompletion(args, "dir", {
            lookForAction: false, evalTokens: false
        }) ;
    }

    async cp(args) {
        let { flags, name } = await this.#tokenizeCommandLineInput(args, {
            lookForAction: false
        }) ;

        try {
            let { to, toName, from, fromName } = this.#findFromAndToDirs(name) ;
            console.log({ to, toName, from, fromName }) ;
            await this.terminal.println(JSON.stringify({ to, toName, from, fromName })) ;
            return "" ;
        } catch(e) {
            return await cmdErr( this.terminal, e, 1 ) ;
        }
    }

    async cpTab(args) {
        return await this.#insertCompletion(args, "dir", {
            lookForAction: false, evalTokens: false,
            multipleDirs: true
        }) ;
    }

    async mv(args) {
        let { flags, name } = await this.#tokenizeCommandLineInput(args, {
            lookForAction: false
        }) ;

        try {
            let { to, toName, from, fromName } = this.#findFromAndToDirs(name) ;
            console.log({ to, toName, from, fromName }) ;
            await this.terminal.println(JSON.stringify({ to, toName, from, fromName })) ;
            return "" ;
        } catch(e) {
            return await cmdErr( this.terminal, e, 1 ) ;
        }
    }

    async mvTab(args) {
        return await this.#insertCompletion(args, "dir", {
            lookForAction: false, evalTokens: false,
            multipleDirs: true
        }) ;
    }

    async rm(args) {
        if(args.length < 2)
            return await cmdErr( this.terminal, "Syntax error; rm requires a bookmark name.", 1 ) ;

        let name = args.splice(1, args.length-1).join(" ") ;

        switch(name) {
            case ".":
            case "~":
            case "..":
                return await cmdErr( this.terminal, "Syntax error; rm name is invalid.", 1 ) ;
            default:
                try {
                    let rmBookmark = this.#getItemFromPath(name) ;
                    if (!rmBookmark) {
                        return await cmdErr( this.terminal, "Bookmark not found.", 1 ) ;
                    } else {
                        if(rmBookmark.type !== "bookmark")
                            return await cmdErr( this.terminal, `${rmBookmark.title} is not a bookmark; rm aborted.`, 1 ) ;
                        await this.#deleteBookmark(rmBookmark.id) ;
                    }
                } catch(e) {
                    return await cmdErr( this.terminal, "Runtime error; " + e, 1 ) ;
                }
        }

        this.terminal.terminal.status = 0 ;
        return name ;
    }

    async rmTab(args) {
        return await this.#insertCompletion(args, "dir", {
            lookForAction: false, evalTokens: false
        }) ;
    }

    async tab(args) {
        let { action, flags, name } = await this.#tokenizeCommandLineInput(args, {
            T: { lookForArgument: true }
        }) ;
        let result = "" ;

        if(ChromeCommands.flags.open.includes(action)) {
            if(!name)
                return await cmdErr( this.terminal, `No bookmark specified.`, 1 ) ;
            let bookmark ;
            if(flags.I)
                bookmark = this.#getItemById(name) ;
            else
                bookmark = this.#getItemFromPath(name) ;

            if(!bookmark)
                return await cmdErr( this.terminal, `Bookmark "${name}" not found.`, 1 ) ;
            if(bookmark.type !== "bookmark")
                return await cmdErr( this.terminal, `${name} is not a bookmark.`, 1 ) ;
            result = bookmark.url ;
            await this.#openNewTab(bookmark.url, flags.T) ;
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
            if(!name) {
                let tab = await this.#openNewTab(null, flags.T) ;
                await this.terminal.println( `New tab opened with ID ${tab.id}.` ) ;
                return tab.id ;
            }
            else {
                if(!name?.startsWith("http"))
                    name = "https://" + name ;
                try {
                    let url = new URL(name) ;
                    let tab = await this.#openNewTab(url.toString(), flags.T) ;
                    await this.terminal.println( `${url.toString()} opened with ID ${tab.id}.` ) ;
                    return tab.id ;
                } catch(e) {
                    return await cmdErr( this.terminal, `Invalid URL specified.`, 1 ) ;
                }
            }
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
        let { name, action, flags, start } = await this.#tokenizeCommandLineInput(args, {
            T: { lookForArgument: true },
            evalTokens: false
        }) ;

        if(ChromeCommands.flags.open.includes(action)) {
            if(flags.I)
                return await this.#insertIdCompletion(args) ;
            else
                return await this.#insertCompletion(args, "dir", {
                    T: { lookForArgument: true },
                    evalTokens: false
                }) ;
        }

        if(ChromeCommands.flags.close.includes(action) ||
           ChromeCommands.flags.info.includes(action) ||
           ChromeCommands.flags.activate.includes(action)) {
            return await this.#insertTabCompletion(args) ;
        }

        if(ChromeCommands.flags.new.includes(action)) {
            return await this.#insertUrlCompletion(args) ;
        }

        return "" ;
    }

    async tabgroup(args) {
        let { action, flags, name } = await this.#tokenizeCommandLineInput(args) ;
        let result = "" ;

        if(ChromeCommands.flags.new.includes(action)) {
            if(!name)
                return await cmdErr( this.terminal, `No tabgroup name specified.`, 1 ) ;
            return await this.#addUngroupedTabsToGroup(name) ;
        }

        this.terminal.terminal.status = 1 ;
        await this.terminal.println( `Failed to process tabgroup command.` ) ;
        return result ;
    }

    async tabgroupTab(args) {
        return "" ;
    }

    async bookmark(args) {
        let { action, flags, name } = await this.#tokenizeCommandLineInput(args, {
            T: { lookForArgument: true }
        }) ;
        let result = "" ;

        if(ChromeCommands.flags.open.includes(action)) {
            if(!name)
                return await cmdErr( this.terminal, `No bookmark specified.`, 1 ) ;
            let bookmark ;
            if(flags.I)
                bookmark = this.#getItemById(name) ;
            else
                bookmark = this.#getItemFromPath(name) ;

            if(!bookmark)
                return await cmdErr( this.terminal, `Bookmark "${name}" not found.`, 1 ) ;
            if(bookmark.type !== "bookmark")
                return await cmdErr( this.terminal, `${name} is not a bookmark.`, 1 ) ;
            result = bookmark.url ;
            await this.#openNewTab(bookmark.url, flags.T) ;
            this.terminal.terminal.status = 0 ;
            await this.terminal.println( `Bookmark opened in new tab.` ) ;
            return result ;
        }

        if(ChromeCommands.flags.new.includes(action) ||
           ChromeCommands.flags.save.includes(action)) {
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

                // Remove query string params
                if(flags.R && flags.Q) {
                    let url = new URL(tab.url) ;
                    tab.url = url.origin + url.pathname;
                }

                let check = this.#getItemByName(tab.title, this.path.id);
                if(check.length)
                    return await cmdErr( this.terminal, "A bookmark with this name already exists in this directory.", 1 ) ;

                let bookmark = await this.#createBookmark(tab.title, tab.url, this.path.id) ;

                this.bookmarks.push({
                    title: bookmark.title,
                    id: bookmark.id,
                    parentId: bookmark.parentId,
                    index: bookmark.index,
                    dateAdded: bookmark.dateAdded,
                    dateGroupModified: bookmark.dateGroupModified,
                    url: bookmark.url,
                    type: "bookmark"
                }) ;

                this.terminal.terminal.status = 0 ;
                await this.terminal.println( `Bookmark saved as ${tab.title}.` ) ;
                return result ;
            } catch (e) {
                return await cmdErr( this.terminal, e, 1 ) ;
            }
        }

        if(ChromeCommands.flags.info.includes(action) ||
           ChromeCommands.flags.edit.includes(action)) {
            if(!name)
                return await cmdErr( this.terminal, `No bookmark specified.`, 1 ) ;
            let bookmark ;
            if(flags.I)
                bookmark = this.#getItemById(name) ;
            else
                bookmark = this.#getItemFromPath(name) ;

            if(!bookmark)
                return await cmdErr( this.terminal, `Bookmark "${name}" not found.`, 1 ) ;

            if(ChromeCommands.flags.info.includes(action)) {
                result += `${padWithSpaces('id', 10)}: ${bookmark.id}\n` ;
                result += `${padWithSpaces('parentId', 10)}: ${bookmark.parentId}\n` ;
                result += `${padWithSpaces('title', 10)}: ${bookmark.title}\n` ;
                result += `${padWithSpaces('url', 10)}: ${bookmark.url || "N/A"}\n` ;
                result += `${padWithSpaces('dateAdded', 10)}: ${getFormattedDate(bookmark.dateAdded)}` ;

                this.terminal.terminal.status = 0 ;
                await this.terminal.println( result ) ;
                return result ;
            } else if(ChromeCommands.flags.edit.includes(action)) {
                try {
                    let editor = new EditBookmark(
                        this.terminal,
                        bookmark.title,
                        bookmark
                    ) ;
                    let updates = await editor.edit() ;
                    if(updates.result.updated) {
                        await this.#updateBookmark(bookmark.id, updates.contents);
                        result = `${bookmark.title} updated.`
                        await this.terminal.println(result);
                    } else {
                        result = `${bookmark.title} closed without updating.`
                        await this.terminal.println(result);
                    }
                    this.terminal.terminal.status = 0;
                    return result ;
                } catch(e) {
                    return await cmdErr( this.terminal, `Runtime error; ${e}`, 1 ) ;
                }
            }
        }

        this.terminal.terminal.status = 1 ;
        await this.terminal.println( `Failed to process bookmark command.` ) ;
        return result ;
    }

    async bookmarkTab(args) {
        let { action, flags, start } = await this.#tokenizeCommandLineInput(args, {
            T: { lookForArgument: true },
            evalTokens: false
        }) ;

        if(ChromeCommands.flags.open.includes(action) ||
           ChromeCommands.flags.info.includes(action) ||
           ChromeCommands.flags.edit.includes(action)) {
            if(flags.I)
                return await this.#insertIdCompletion(args) ;
            else
                return await this.#insertCompletion(args, "dir", {
                    T: { lookForArgument: true },
                    evalTokens: false
                }) ;
        }

        if(ChromeCommands.flags.new.includes(action)) {
            return await this.#insertTabCompletion(args) ;
        }

        return "" ;
    }

    async history(args) {
        let { action, flags, name } = await this.#tokenizeCommandLineInput(args, {
            D: { lookForArgument: true }
        }) ;

        let date = null ;
        if(typeof flags.D === "string") {
            try {
                date = getMillisFromDateStr(flags.D) ;
            } catch(e) {
                return await cmdErr( this.terminal, e, 1 ) ;
            }
        }

        if(ChromeCommands.flags.list.includes(action)) {
            let text = "" ;
            if(name)
                text = name ;

            let history = await this.#getRecentHistory(text, date) ;
            if(!history || !history?.length) {
                let out = "No recent history found" ;
                if(date) out += ` that for time period ending ${getFormattedDate(date)}` ;
                await this.terminal.println(out) ;
                this.terminal.terminal.status = 0;
                return out;
            }

            let out = "" ;
            out += "ID     DATE        TIME   VISITS TITLE" ;
            await this.terminal.println(out) ;

            for(let item of history) {
                let tmp = padWithSpaces( item.id?.toString() || "-", 6) ;
                tmp += " " + padWithSpaces( getFormattedDate(item.lastVisitTime), 18) ;
                tmp += " " + padWithSpaces( item.visitCount?.toString(), 6) ;
                tmp += " " + padWithSpaces( item.title, this.terminal.terminal.columns-36 ) ;

                out += tmp + "\n" ;
                await this.terminal.println(tmp, 0) ;
            }

            this.terminal.terminal.status = 0;
            return out;
        }
    }

    async historyTab(args) {}

    async reopen(args) {
        let { action, flags, name } = await this.#tokenizeCommandLineInput(args) ;

        if(ChromeCommands.flags.list.includes(action)) {
            let recents = await this.#getRecentlyClosed() ;
            let out = "" ;

            if(!recents || !recents?.length) {
                out = "No recent history found" ;
                await this.terminal.println(out) ;
                this.terminal.terminal.status = 0;
                return out;
            }

            out += "ID           DATE        TIME    TITLE" ;
            await this.terminal.println(out) ;

            let max = 20 ;
            for(let item of recents) {
                max-- ;
                let tmp = padWithSpaces( item.sessionId?.toString() || "-", 12) ;
                tmp += " " + padWithSpaces( getFormattedDate(item.lastModified), 18) ;
                tmp += " " + padWithSpaces( item.title, this.terminal.terminal.columns-34 ) ;
                out += tmp + "\n" ;
                await this.terminal.println(tmp, 0) ;
                if(max <= 0) break ;
            }

            this.terminal.terminal.status = 0;
            return out;
        }

        if(ChromeCommands.flags.open.includes(action) || !action) {
            try {
                let out ;
                if(name) {
                    if(!flags.S && flags.I) {
                        await this.terminal.printPrompt(this.terminal.terminal.display.prompt);
                        await this.#openRecentlyClosed(flags.S, name) ;
                    }

                    let recents = await this.#getRecentlyClosed() ;

                    if(!recents || !recents?.length) {
                        out = "No recently closed tabs found" ;
                        await this.terminal.println(out) ;
                    } else {
                        let item = recents.filter(
                            item =>
                                flags.I ? item.sessionId === name :
                                    item.title?.toLowerCase() === name?.toLowerCase()
                        ) ;
                        if(item.length === 0)
                            return await cmdErr( this.terminal, `Recent tab ${name + " "}not found.`, 1 ) ;
                        if(!flags.S)
                            await this.terminal.printPrompt(this.terminal.terminal.display.prompt) ;
                        let restored = await this.#openRecentlyClosed(flags.S, item[0].sessionId) ;
                        out = `${restored} opened in new tab.`
                        await this.terminal.println( out ) ;
                    }
                } else {
                    if(!flags.S)
                        await this.terminal.printPrompt(this.terminal.terminal.display.prompt);
                    let restored = await this.#openRecentlyClosed(flags.S) ;
                    out = `${restored} opened in new tab.`
                    await this.terminal.println( out ) ;
                }

                this.terminal.terminal.status = 0;
                return out;
            } catch(e) {
                return await cmdErr( this.terminal, `Runtime error; ${e}`, 1 ) ;
            }
        }
    }

    async reopenTab(args) {
        let { action } = await this.#tokenizeCommandLineInput(args, {
            evalTokens: false
        }) ;

        if(ChromeCommands.flags.list.includes(action) ||
           ChromeCommands.flags.open.includes(action) || !action) {
            return await this.#insertSessionCompletion(args) ;
        }

        return "" ;
    }

    async google(args) {
        let { action, flags, name } = await this.#tokenizeCommandLineInput(args, {
            T: { lookForArgument: true }
        }) ;

        if(ChromeCommands.flags.open.includes(action) || !action) {
            let url = `https://www.google.com/search?q=${encodeURIComponent(name)}` ;
            await this.#openNewTab(url, flags.T) ;
            this.terminal.terminal.status = 0 ;
            await this.terminal.println( `Google search opened in new tab.` ) ;
            return url ;
        }

    }

    async googleTab(args) {

    }

    async #printList(collection, attribute, printPrompt) {
        return await printList(this.terminal, collection, attribute, printPrompt) ;
    }

    // Tab completion
    async #insertCompletion(args, type, options = {}) {
        let { name, start } = await this.#tokenizeCommandLineInput(args, options) ;
        let begin = args.slice(0, start).join(" ") ;
        let item = this.#getItemByPartialName(name, this.path.id ) ;
        let path = item[0]?.title || "" ;

        if(item.length === 0 && type === "dir") {
            if(options.multipleDirs) {
                let dirPaths = name.split(" ") ;
                if(dirPaths.length > 1) {
                    for(let i = dirPaths.length-1 ; i >= 0 ; i--) {
                        let tmpName = dirPaths.slice(i, dirPaths.length).join(" ") ;
                        let result = this.#findDirectory(tmpName) ;
                        if(result.item.length) {
                            item = result.item ;
                            path = result.path ;
                            name = tmpName ;
                            begin += (i === 0 ? "" : " ") + dirPaths.slice(0, i).join(" ") ;
                            break ;
                        }
                    }
                } else {
                    let result = this.#findDirectory(name) ;
                    item = result.item ;
                    path = result.path ;
                }
            } else {
                let result = this.#findDirectory(name) ;
                item = result.item ;
                path = result.path ;
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
            this.terminal.insertCarrot("") ;
            if(item.length > 100) {
                await this.terminal.println(`\n${item.length} matches.`) ;
                await this.terminal.printPrompt(this.terminal.terminal.display.prompt);
                this.terminal.insertCarrot(this.terminal.terminal.display.carrot);
                return begin + " " + name ;
            }
            await this.#printList(item) ;
            return begin + " " + name ;
        }
        return "" ;
    }

    async #insertIdCompletion(args) {
        let { name, start } = await this.#tokenizeCommandLineInput(args) ;
        let begin = args.slice(0, start).join(" ") ;
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

    async #insertTabCompletion(args) {
        let { action, flags, name, start } = await this.#tokenizeCommandLineInput(args) ;
        let begin = args.slice(0, start).join(" ") ;

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
                await this.terminal.println(`\n${tabs.length} matches.`) ;
                await this.terminal.printPrompt(this.terminal.terminal.display.prompt);
                this.terminal.insertCarrot(this.terminal.terminal.display.carrot);
                return begin + " " + name ;
            }
            await this.#printList(tabs, attr) ;
            return begin + " " + name ;
        }
        return "" ;
    }

    async #insertUrlCompletion(args) {
        let { action, flags, name, start } = await this.#tokenizeCommandLineInput(args, {
            T: { lookForArgument: true },
            evalTokens: false
        }) ;
        let begin = args.slice(0, start).join(" ") ;

        if(name === "")
            return begin + " " + "https://" ;
        if(name === "https://")
            return begin + " " + "https://www." ;
        if(name === "http://")
            return begin + " " + "http://www." ;

        if(!name?.startsWith("https://") && !name?.startsWith("http://"))
            return begin + " " + "https://" + name ;
    }

    async #insertSessionCompletion(args) {
        let { action, flags, name, start } = await this.#tokenizeCommandLineInput(args) ;
        let begin = args.slice(0, start).join(" ") ;

        let recents = await this.#getRecentlyClosed() ;
        let session ;
        if(flags.I)
            session = recents.filter(item =>
                item.sessionId?.toString()?.startsWith(name)
            ) ;
        else
            session = recents.filter(item =>
                item.title?.toLowerCase()?.startsWith(name.toLowerCase())
            ) ;

        let attr = flags.I ? "sessionId" : "title" ;
        if(session.length === 1)
            return begin + " " + session[0][attr] ;
        if(session.length > 1) {
            if(session.length > 100) {
                await this.terminal.println(`\n${session.length} matches.`) ;
                await this.terminal.printPrompt(this.terminal.terminal.display.prompt);
                this.terminal.insertCarrot(this.terminal.terminal.display.carrot);
                return begin + " " + name ;
            }
            await this.#printList(session, attr) ;
            return begin + " " + name ;
        }
        return "" ;
    }

    // Bookmark operations
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

    async #deleteBookmark(id) {
        return new Promise((resolve, reject) => {
            if(!id) {
                reject("Error deleting bookmark") ;
                return ;
            }
            chrome.bookmarks.remove(id, res => resolve(res));
            this.bookmarks.splice(
                this.bookmarks.findIndex( item => item.id === id ), 1
            );
        }) ;
    }

    async #updateBookmark(id, updates) {
        return new Promise((resolve, reject) => {
            if(!id || !updates || !updates.title) {
                reject("Error updating bookmark") ;
                return ;
            }
            chrome.bookmarks.update(id, updates, res => resolve(res));
            this.bookmarks[this.bookmarks.findIndex( item => item.id === id )].title = updates.title ;
            if(updates.url)
                this.bookmarks[this.bookmarks.findIndex( item => item.id === id )].url = updates.url ;
        }) ;
    }

    async #moveBookmark(id, destination) {
        return new Promise((resolve, reject) => {
            if(!id || !destination) {
                reject("Error updating bookmark") ;
                return ;
            }
            chrome.bookmarks.move(id, destination, res => resolve(res));
            this.bookmarks[this.bookmarks.findIndex( item => item.id === id )].parentId = destination.parentId ;
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

    #parseSpecialPathParts(part, id, parentId) {
        if(part === ".") {
            return this.#getItemById(id) ;
        }
        if(part === "..") {
            return this.#getItemById(parentId) ;
        }
        if(part === "~") {
            let item = {};
            item.id = "0" ;
            item.parentId = null ;
            return item
        }
    }

    #isSpecialPathPart(part) {
        return [".", "..", "~"].includes(part) ;
    }

    #getItemFromPath(path) {
        if(path.endsWith("/"))
            path = path.slice(0, path.length-1) ;
        let item = this.#getItemByName(path, this.path.id )[0] ;
        if(!item) {
            let pathParts = path.split("/") ;
            let id = this.path.id ;
            let parentId = this.path.parentId ;
            let save = "" ;
            for(let part of pathParts) {
                if(this.#isSpecialPathPart(part)) {
                    item = this.#parseSpecialPathParts(part, id, parentId) ;
                    id = item?.id ;
                    parentId = item?.parentId ;
                    continue ;
                }
                item = this.#getItemByName((save !== "" ? save + part : part), id )[0] ;
                if(!item) save += part + "/" ;
                else {
                    save = "" ;
                    id = item?.id ;
                    parentId = item?.parentId ;
                }
            }
        }
        return item ;
    }

    #findDirectory(name, searchPartials = true) {
        let item = [] ;
        let path = "" ;
        let nameParts = name.split("/") ;
        let id = this.path.id ;
        let parentId = this.path.parentId ;
        let save = "" ;
        for(let i in nameParts) if(nameParts.hasOwnProperty(i)) {
            let part = nameParts[i] ;

            if(parseInt(i)+1 === nameParts.length) {
                if (searchPartials)
                    item = this.#getItemByPartialName((save !== "" ? save : part), id);
                else {
                    let tmpItem = this.#getItemByName((save !== "" ? save + part : part), id ) ;
                    if(tmpItem.length) item = tmpItem ;
                }
            } else {
                if(this.#isSpecialPathPart(part)) {
                    item = this.#parseSpecialPathParts(part, id, parentId) ;
                    id = item?.id ;
                    parentId = item?.parentId ;
                    path += part + "/" ;
                    continue ;
                }
                else
                    item = this.#getItemByName((save !== "" ? save + part : part), id ) ;
            }

            if(!item || !item.length)
                save += part + "/" ;
            else {
                save = "" ;
                id = item[0]?.id ;
                parentId = item[0]?.parentId ;
                path += item[0]?.title + "/" ;
            }
        }

        return { item, path } ;
    }

    #findFromAndToDirs(name) {
        let items = {
            to: null,
            toName: "",
            from: null,
            fromName: ""
        } ;

        let dirPaths = name.split(" ") ;
        if(dirPaths.length > 1) {
            let start = 0 ;
            for(let i = 0 ; i < dirPaths.length ; i++) {
                let tmpName = dirPaths.slice(start, i+1).join(" ") ;
                let result = this.#findDirectory(tmpName, false) ;
                if(result.item.length) {
                    let parts = tmpName.split("/");
                    if(!items.from) {
                        items.from = result.item;
                        items.fromName = parts[parts.length-1] === "" ? parts[parts.length-2] : parts[parts.length-1] ;
                    } else if(!items.to) {
                        items.to = result.item;
                        items.toName = parts[parts.length-1] === "" ? parts[parts.length-2] : parts[parts.length-1] ;
                    } else
                        throw "Syntax error; command only accepts a source and destination." ;
                    start = i+1 ;
                }
            }
        } else {
            throw "Syntax error; command requires a source and destination." ;
        }

        if(!items.from)
            throw "Syntax error; command requires source to be an existing directory."

        if(!items.to) {
            let parts = name.split(" ");
            parts = parts[parts.length-1].split("/") ;
            items.toName = parts[parts.length-1] ;
        }

        return items ;
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
                resolve(tab) ;
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

    async #getUngroupedTabs() {
        return new Promise((resolve, reject) => {
            chrome.tabs.query({
                groupId: -1
            }, tabs => {
                if (tabs.length) {
                    resolve(tabs) ;
                } else {
                    reject("No ungrouped tabs found.");
                }
            });
        }) ;
    }

    async #addUngroupedTabsToGroup(group) {
        return new Promise(async (resolve, reject) => {
            if(!group)
                reject("Group name is required.");
            let [tabs, tabGroup] = await Promise.all([
                this.#getUngroupedTabs(),
                chrome.tabGroups.query( { title: group } )
            ]) ;
            let groupId = -1 ;

            if(!tabGroup.length) {
                groupId = await chrome.tabs.group({ tabIds: tabs.map(item => item.id) });
                await chrome.tabGroups.update(groupId, { title: group });
            } else {
                groupId = await chrome.tabs.group({ groupId: tabGroup[0].id, tabIds: tabs.map(item => item.id) });
            }

            resolve(groupId) ;
        }) ;
    }

    // History operations
    async #getRecentHistory(text = "", startTime = null, limit = 15) {
        return new Promise((resolve, reject) => {
            try {
                chrome.history.search({
                    startTime: startTime,
                    text: text,
                    maxResults: limit
                }, (history) => {
                    resolve(history) ;
                }) ;
            } catch(e) {
                reject(e) ;
            }
        }) ;
    }

    #normalizeRecentlyClosed(recents) {
        let sessionItems = [] ;
        for(let item of recents) {
            let window = !item?.hasOwnProperty("tab") ;
            if(window) {
                for(let i in item?.window?.tabs) if(item?.window?.tabs.hasOwnProperty(i)) {
                    item.window.tabs[i].lastModified = item.lastModified*1000 ;
                }
                sessionItems.push( ...item?.window?.tabs ) ;
            } else {
                item.tab.lastModified = item.lastModified*1000 ;
                sessionItems.push( item?.tab ) ;
            }
        }
        return sessionItems ;
    }

    async #getRecentlyClosed(limit = 25) {
        return new Promise((resolve, reject) => {
            try {
                chrome.sessions.getRecentlyClosed({
                    maxResults: limit
                }, recent => {
                    resolve(this.#normalizeRecentlyClosed(recent)) ;
                }) ;
            } catch(e) {
                reject(e) ;
            }
        }) ;
    }

    async #openRecentlyClosed(silent = false, sessionId = null) {
        return new Promise((resolve, reject) => {
            try {
                if(silent) {
                    chrome.sessions.getRecentlyClosed({
                        maxResults: 25
                    }, recent => {
                        if(sessionId)
                            recent = recent.filter(item => item.tab.sessionId === sessionId) ;
                        let url = recent[0]?.hasOwnProperty('tab') ? recent[0]?.tab.url :
                            (recent[0]?.hasOwnProperty('window') ? recent[0]?.window.tabs[0].url : "") ;
                        let title = recent[0]?.hasOwnProperty('tab') ? recent[0]?.tab.title :
                            (recent[0]?.hasOwnProperty('window') ? recent[0]?.window.tabs[0].title : "") ;
                        if(!url)
                            reject("No recent tab found.") ;
                        this.#openNewTab(url).then(() => resolve(title)) ;
                    }) ;
                } else {
                    chrome.sessions.restore(sessionId, restored => {
                        resolve(restored?.hasOwnProperty('tab') ? restored[0].tab.title : "window") ;
                    }) ;
                }
            } catch(e) {
                reject(e) ;
            }
        }) ;
    }

    // Utility functions
    #getDirContents(parentId, partial = null) {
        if(partial !== null)
            return this.bookmarks.filter(
                item =>
                    item.title?.toLowerCase()?.startsWith(partial?.toLowerCase()) &&
                    item.parentId === parentId
            ) ;
        return this.bookmarks.filter(item => item.parentId === parentId) ;
    }

    #getItemById(id) {
        return this.bookmarks.filter(item => item.id === id)[0] ;
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

    async #tokenizeCommandLineInput(args, options = {}) {
        return await tokenizeCommandLineInput(this.terminal, args, options, ChromeCommands.flags) ;
    }

    #constructPath() {
        let path = "" ;
        let id = this.path.id ;
        do {
            let item = this.#getItemById(id) ;
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
        localStorage.setItem(`${this.terminal.terminal.localStoragePrefix}--cliPath`, JSON.stringify(this.path));
    }

    #restorePath() {
        let jsonString = localStorage.getItem(`${this.terminal.terminal.localStoragePrefix}--cliPath`);
        let tmpPath = JSON.parse(jsonString) ;
        if( tmpPath ) {
            this.path = tmpPath ;
            this.terminal.terminal.display.path = this.path.text ;
        }
    }

    #saveSettings() {
        this.terminal.terminal.display.account = this.settings.account ;
        localStorage.setItem(`${this.terminal.terminal.localStoragePrefix}--cliSettings`, JSON.stringify(this.settings));
    }

    #restoreSettings() {
        let jsonString = localStorage.getItem(`${this.terminal.terminal.localStoragePrefix}--cliSettings`);
        let tmpSettings = JSON.parse(jsonString) ;
        if( tmpSettings ) {
            this.settings = tmpSettings;
            this.terminal.terminal.display.account = this.settings.account ;
        }
    }
}

class EditBookmark {
    static separator = ":\u0000" ;
    static prompt = ">\u0000" ;

    printPrompt = true ;

    constructor(terminal, filename, bookmark) {
        this.terminal = terminal ;
        this.filename = filename ;
        let { length, lines } = this.#convertBookmarkToFile(bookmark) ;
        this.contents = lines ;
        this.length = length ;
        this.edited = false ;
        this.saved = false ;
        this.linePointer = 1 ;
    }

    #convertBookmarkToFile(bookmark) {
        return {
            length: 5,
            lines: [
                { text: bookmark.id, attr: "id", readOnly: true, edited: false },
                { text: bookmark.parentId, attr: "parentId", readOnly: true, edited: false },
                { text: bookmark.title, attr: "title", readOnly: false, edited: false },
                { text: bookmark.type === "dir" ? "N/A" : bookmark.url, attr: "url",
                    readOnly: bookmark.type === "dir", edited: false },
                { text: getFormattedDate(bookmark.dateAdded), attr: "dateAdded",
                    readOnly: true, edited: false }
            ]
        } ;
    }

    async edit() {
        let command = ""
        this.terminal.terminal.in = { x: this.terminal.x, y: this.terminal.y } ;

        while(command.toUpperCase() !== "QUIT") {
            command = await this.userInput();
            command = await this.#processCommand(command) ;
        }

        let url = this.contents[ this.contents.findIndex(item => item.attr === "url") ] ;
        return {
            result: {
                updated: this.saved
            },
            contents: {
                title: this.contents[ this.contents.findIndex(item => item.attr === "title") ]?.text,
                url: url.readOnly ? null : url.text
            }
        } ;
    }

    async userInput() {
        if(this.printPrompt) {
            await this.prompt(EditBookmark.prompt) ;
        } else {
            this.printPrompt = true ;
        }

        this.terminal.insertCarrot(this.terminal.terminal.display.carrot) ;

        return new Promise((resolve) => {
            let userIn = [];
            this.terminal.initListeners(this.parseInput.bind(this), userIn, resolve);
        }) ;
    }

    async parseInput(keyCode, char, userIn, resolve, limit) {
        switch(keyCode) {
            case 13: // Carriage Return
                this.terminal.removeListeners() ;
                this.terminal.insertCarrot("") ;
                await this.terminal.print("\n", 0) ;
                resolve(userIn.join("")) ;
                this.terminal.saveUserInput([]) ;
                break ;
            case 8: // Backspace
                this.terminal.insertCarrot("") ;
                this.terminal.backspace() ;
                this.terminal.insertCarrot(this.terminal.terminal.display.carrot);
                userIn.pop() ;
                this.terminal.saveUserInput(userIn) ;
                break ;
            default:
                if( limit ) break ;
                if (this.terminal.isValidAsciiCode(keyCode)) {
                    userIn.push(char);
                    this.terminal.saveUserInput(userIn) ;
                    await this.terminal.print(char, 0);
                    this.terminal.insertCarrot(this.terminal.terminal.display.carrot);
                }
                break ;
        }
    }

    async prompt(prompt) {
        await this.terminal.print(`${maxLen(this.filename, 20)}`, 0, "green");
        await this.terminal.print(":", 0, "white");
        await this.terminal.print(padWithZeros( this.linePointer.toString(), 3 ), 0, "blue");
        await this.terminal.print(prompt);
        this.terminal.terminal.in = { x: this.terminal.terminal.x, y: this.terminal.terminal.y } ;
    }

    async #processCommand(command) {
        let { cmd, action, flags, name, start } = await tokenizeCommandLineInput(
            this.terminal,
            command.split(" "),
            { E: { lookForArgument: true}, S: { lookForArgument: true} },
            { modifiers: ["E", "F", "P", "S"] }
        ) ;

        switch(cmd) {
            case "P":
            case "PRINT":
                flags.S = flags.S ? parseInt(flags.S) : this.linePointer ;
                flags.E = flags.E ? parseInt(flags.E) : this.length ;

                if(isNaN(flags.S) || isNaN(flags.E)) {
                    await this.terminal.println( "Invalid arguments" ) ;
                } else {
                    await this.print(parseInt(flags.S), parseInt(flags.E)) ;
                }
                break ;
            case "H":
            case "HELP":
                await this.terminal.println( "Available commands are:" ) ;
                await printList(
                    this.terminal,
                    ["PRINT", "GOTO", "TOP", "APPEND", "REPLACE", "CHANGE", "SAVE", "HELP", "QUIT"],
                    "", false
                ) ;
                break ;
            case "G":
            case "GOTO":
                await this.goto(parseInt(name), flags) ;
                break ;
            case "T":
            case "TOP":
                this.linePointer = 1 ;
                await this.print(this.linePointer, this.linePointer) ;
                break ;
            case "A":
            case "APPEND":
                await this.append(this.linePointer, name, flags) ;
                break ;
            case "R":
            case "REPLACE":
                await this.replace(this.linePointer, name, flags) ;
                break ;
            case "C":
            case "CHANGE":
                await this.change(this.linePointer, name, flags) ;
                break ;
            case "W":
            case "WRITE":
                if(!this.edited) {
                    await this.terminal.println( "Exiting with no changes." ) ;
                    command = "QUIT" ;
                } else {
                    this.saved = true ;
                    command = "QUIT" ;
                }
                break ;
            case "Q":
            case "QUIT":
                if(this.edited && !flags.F) {
                    await this.terminal.println( "Unsaved changes - use -f flag to quit without writing" ) ;
                    command = "" ;
                } else {
                    command = "QUIT" ;
                }
                break ;
        }

        return command ;
    }

    async change(lineNum, name, flags) {
        let index = lineNum - 1 ;
        if(this.contents[index].readOnly) {
            await this.terminal.println( `Line ${this.linePointer} is read only.` ) ;
            return ;
        }
        if(!flags.S) {
            await this.terminal.println( `Specify a search string with -s flag.` ) ;
            return ;
        }
        let replacement = name ;
        if(!replacement) {
            replacement = flags.E ;
        }
        this.contents[index].text =
            this.contents[index].text.replace(new RegExp(flags.S), replacement) ;
        this.edited = true ;
        this.contents[index].edited = true ;
        await this.print(this.linePointer, this.linePointer) ;
    }

    async replace(lineNum, text, flags) {
        let index = lineNum - 1 ;
        if(this.contents[index].readOnly) {
            await this.terminal.println( `Line ${this.linePointer} is read only.` ) ;
            return ;
        }
        this.contents[index].text = text ;
        this.edited = true ;
        this.contents[index].edited = true ;
        await this.print(this.linePointer, this.linePointer) ;
    }

    async append(lineNum, text, flags) {
        let index = lineNum - 1 ;
        if(this.contents[index].readOnly) {
            await this.terminal.println( `Line ${this.linePointer} is read only.` ) ;
            return ;
        }
        this.contents[index].text += text ;
        this.edited = true ;
        this.contents[index].edited = true ;
        await this.print(this.linePointer, this.linePointer) ;
    }

    async goto(lineNum, flags) {
        if(isNaN(lineNum)) {
            await this.terminal.println( "Invalid argument" ) ;
        } else {
            if(lineNum < 1 || lineNum > this.length) {
                await this.terminal.println( "Invalid line number" ) ;
                return ;
            }
            this.linePointer = lineNum ;
            if(flags.P) await this.print(lineNum, lineNum) ;
        }
    }

    async print(start, end) {
        if(start < 1 || end > this.length || start > end) {
            await this.terminal.println( "Invalid start or end value" ) ;
            return ;
        }
        for(let i=start-1; i <=end-1; i++) {
            let color = this.contents[i].readOnly ? "red" : "white" ;
            await this.terminal.print( padWithZeros( (i+1).toString(), 3), 0, color ) ;
            await this.terminal.print( EditBookmark.separator, 0, color ) ;
            await this.terminal.println( this.contents[i].text, 0, color ) ;
        }
    }
}
