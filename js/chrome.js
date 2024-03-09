class ChromeCommands {
    constructor(terminal, bookmarks, path = { text:"/", id: "0" }) {
        this.bookmarks = this.#processBookmarks(bookmarks) ;
        this.terminal = terminal ;
        this.path = path ;

        terminal.registerCmd("CD", {
            args: [ "folder-name" ],
            callback: this.cd.bind(this),
            help: "./man/chrome.json"
        });
        terminal.registerCmd("LS", {
            callback: this.ls.bind(this),
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
    }

    async cd(args) {}
    async ls() {
        let dirs = this.bookmarks.filter(item => item.parentId === this.path.id) ;
        this.terminal.terminal.status = 0 ;
        let out = "" ;
        for(let dir of dirs) {
            out += dir.title + "\n" ;
        }
        await this.terminal.print(out);
        return out ;
    }
    async mkdir(args) {}
    async rmdir(args) {}
    async cp(args) {}
    async mv(args) {}

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
}