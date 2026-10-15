class Blocks {
    gameVars     = {} ;
    terminal     = null ;
    termSettings = null ;
    board        = [] ;
    currentPiece = null ;
    nextPieceIdx = null ;
    boardLeft    = 0 ;
    boardTop     = 0 ;
    boardWidth   = 0 ;
    boardHeight  = 0 ;

    constructor(terminal) {
        this.gameVars = {
            score:        0,
            lines:        0,
            level:        1,
            sleepTime:    500000, // microseconds between gravity ticks
            sleepStart:   0,
            animationHandle: 0,
            pause:        false,
            exit:         false,
            gameOver:     false,
            moveLeft:     false,
            moveRight:    false,
            rotatePiece:  false,
            softDrop:     false,
            hardDrop:     false
        } ;

        this.pieces = [
            { shape: [[1,1,1,1]],            color: "blue"   },
            { shape: [[1,1],[1,1]],          color: "yellow" },
            { shape: [[0,1,0],[1,1,1]],      color: "green"  },
            { shape: [[0,1,1],[1,1,0]],      color: "red"    },
            { shape: [[1,1,0],[0,1,1]],      color: "orange" },
            { shape: [[1,0],[1,0],[1,1]],    color: "white"  },
            { shape: [[0,1],[0,1],[1,1]],    color: "teal"   }
        ] ;

        this.terminal    = terminal ;
        this.termSettings = terminal.terminal ;
        this.terminal.clr() ;

        const rows    = parseInt(this.termSettings.rows) ;
        const columns = parseInt(this.termSettings.columns) ;
        const center  = Math.floor(columns / 2) ;

        // Each logical cell renders as 2 characters wide so blocks look square.
        // boardWidth = 10 logical cells = 20 terminal chars of interior.
        // leftWall at center-11, rightWall at center+10  (interior = 20 chars).
        this.boardWidth  = 10 ;
        this.boardHeight = rows - 4 ;
        this.boardTop    = 2 ;
        this.leftWall    = center - 11 ;
        this.rightWall   = this.leftWall + this.boardWidth * 2 + 1 ;  // center + 10
        this.boardLeft   = this.leftWall + 1 ;                        // center - 10

        this.board = Array.from({ length: this.boardHeight }, () => Array(this.boardWidth).fill(null)) ;
    }

    // ─── Setup ──────────────────────────────────────────────────────────────

    async start(args) {
        try {
            await this.drawBorder() ;
            await this.drawSidePanel() ;
        } catch(e) {
            let out = "An error occurred while setting up the game; error detail: " + e ;
            this.termSettings.status = 1 ;
            await this.terminal.println(out) ;
            this.terminal.logDebugInfo("ERROR: " + out) ;
            return out ;
        }

        this.spawnPiece() ;
        await this.drawCurrentPiece() ;
        await this.drawNextPiece() ;
        await this.drawScore() ;

        this.terminal.initListeners((keyCode, char, userIn, resolve, limit) => {
            switch(keyCode) {
                case 87: // W
                    if(limit) return ;
                case 38: // Up — rotate
                    this.gameVars.rotatePiece = true ;
                    break ;
                case 83: // S
                    if(limit) return ;
                case 40: // Down — soft drop
                    this.gameVars.softDrop = true ;
                    break ;
                case 32: // Space
                    this.gameVars.hardDrop = true ;
                    break ;
                case 65: // A
                    if(limit) return ;
                case 37: // Left
                    this.gameVars.moveLeft = true ;
                    break ;
                case 68: // D
                    if(limit) return ;
                case 39: // Right
                    this.gameVars.moveRight = true ;
                    break ;
                case 81: // Q
                    if(limit) return ;
                case 27: // ESC
                    this.gameVars.exit = true ;
                    break ;
                case 80: // P — pause
                    if(limit) return ;
                    this.gameVars.pause = !this.gameVars.pause ;
                    break ;
            }
        }) ;

        try {
            await this.gameLoop() ;
        } catch(e) {
            let out = "An error occurred while playing the game; error detail: " + e ;
            this.termSettings.status = 1 ;
            await this.terminal.println(out) ;
            this.terminal.logDebugInfo("ERROR: " + out) ;
            return out ;
        }

        this.termSettings.status = 0 ;
        return "END" ;
    }

    // ─── Piece logic ────────────────────────────────────────────────────────

    spawnPiece() {
        const idx = this.nextPieceIdx !== null
            ? this.nextPieceIdx
            : Math.floor(Math.random() * this.pieces.length) ;
        this.nextPieceIdx = Math.floor(Math.random() * this.pieces.length) ;

        const piece = this.pieces[idx] ;
        const shape = piece.shape.map(row => [...row]) ;

        this.currentPiece = {
            shape,
            color: piece.color,
            x: Math.floor(this.boardWidth / 2) - Math.floor(shape[0].length / 2),
            y: 0
        } ;

        if (!this.isValidPosition(shape, this.currentPiece.x, this.currentPiece.y))
            this.gameVars.gameOver = true ;
    }

    isValidPosition(shape, px, py) {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    const bx = px + c, by = py + r ;
                    if (bx < 0 || bx >= this.boardWidth)  return false ;
                    if (by >= this.boardHeight)             return false ;
                    if (by >= 0 && this.board[by][bx])     return false ;
                }
            }
        }
        return true ;
    }

    rotateClockwise(shape) {
        const rows = shape.length, cols = shape[0].length ;
        const out = Array.from({ length: cols }, () => Array(rows).fill(0)) ;
        for (let r = 0; r < rows; r++)
            for (let c = 0; c < cols; c++)
                out[c][rows - 1 - r] = shape[r][c] ;
        return out ;
    }

    lockPiece() {
        const { shape, color, x, y } = this.currentPiece ;
        for (let r = 0; r < shape.length; r++)
            for (let c = 0; c < shape[r].length; c++)
                if (shape[r][c] && y + r >= 0 && y + r < this.boardHeight)
                    this.board[y + r][x + c] = color ;
    }

    clearLines() {
        let cleared = 0 ;
        for (let r = this.boardHeight - 1; r >= 0; r--) {
            if (this.board[r].every(cell => cell !== null)) {
                this.board.splice(r, 1) ;
                this.board.unshift(Array(this.boardWidth).fill(null)) ;
                cleared++ ;
                r++ ; // recheck the same row index after shifting
            }
        }
        if (cleared > 0) {
            const pts = [0, 100, 300, 500, 800] ;
            this.gameVars.score += (pts[cleared] || 800) * this.gameVars.level ;
            this.gameVars.lines += cleared ;
            this.gameVars.level  = Math.floor(this.gameVars.lines / 10) + 1 ;
            this.gameVars.sleepTime = Math.max(50000, 500000 - (this.gameVars.level - 1) * 45000) ;
        }
    }

    // ─── Rendering ──────────────────────────────────────────────────────────

    async drawBoard() {
        for (let r = 0; r < this.boardHeight; r++) {
            for (let c = 0; c < this.boardWidth; c++) {
                const color = this.board[r][c] ;
                const tx = this.boardLeft + c * 2 ;
                const ty = this.boardTop  + r ;
                if (color)
                    await this.terminal.printAt("██", tx, ty, 0, color) ;
                else
                    await this.terminal.printAt("  ", tx, ty, 0) ;
            }
        }
    }

    async drawCurrentPiece(erase = false) {
        if (!this.currentPiece) return ;
        const { shape, color, x, y } = this.currentPiece ;
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    const bx = x + c, by = y + r ;
                    if (by >= 0 && by < this.boardHeight && bx >= 0 && bx < this.boardWidth) {
                        if (erase)
                            await this.terminal.printAt("  ", this.boardLeft + bx * 2, this.boardTop + by, 0) ;
                        else
                            await this.terminal.printAt("██", this.boardLeft + bx * 2, this.boardTop + by, 0, color) ;
                    }
                }
            }
        }
    }

    async drawNextPiece() {
        const panelX   = this.rightWall + 2 ;
        const previewY = 3 ;
        for (let r = 0; r < 4; r++)
            for (let c = 0; c < 4; c++)
                await this.terminal.printAt("  ", panelX + c * 2, previewY + r, 0) ;

        if (this.nextPieceIdx !== null) {
            const { shape, color } = this.pieces[this.nextPieceIdx] ;
            for (let r = 0; r < shape.length; r++)
                for (let c = 0; c < shape[r].length; c++)
                    if (shape[r][c])
                        await this.terminal.printAt("██", panelX + c * 2, previewY + r, 0, color) ;
        }
    }

    async drawScore() {
        const panelX = this.rightWall + 2 ;
        await this.terminal.printAt(("Score: " + this.gameVars.score).padEnd(14), panelX, 8,  0, "white") ;
        await this.terminal.printAt(("Level: " + this.gameVars.level).padEnd(14), panelX, 9,  0, "white") ;
        await this.terminal.printAt(("Lines: " + this.gameVars.lines).padEnd(14), panelX, 10, 0, "white") ;
    }

    async drawSidePanel() {
        const panelX = this.rightWall + 2 ;
        await this.terminal.printAt("NEXT:",      panelX, 2,  0, "white") ;
        await this.terminal.printAt("Controls:",  panelX, 12, 0, "white") ;
        await this.terminal.printAt("W/^ Rotate", panelX, 13, 0, "white") ;
        await this.terminal.printAt("A/<   Left", panelX, 14, 0, "white") ;
        await this.terminal.printAt("D/>  Right", panelX, 15, 0, "white") ;
        await this.terminal.printAt("S/v   Down", panelX, 16, 0, "white") ;
        await this.terminal.printAt("Space Drop", panelX, 17, 0, "white") ;
        await this.terminal.printAt("P    Pause", panelX, 18, 0, "white") ;
        await this.terminal.printAt("Q     Quit", panelX, 19, 0, "white") ;
    }

    async drawBorder() {
        const rows    = parseInt(this.termSettings.rows) ;
        const timeout = this.termSettings.defaultTimeout ;
        const lw = this.leftWall ;
        const rw = this.rightWall ;

        await this.terminal.printAt("╔", lw, 1,      timeout, "white") ;
        await this.terminal.printAt("╚", lw, rows-2, timeout, "white") ;
        await this.terminal.printAt("╗", rw, 1,      timeout, "white") ;
        await this.terminal.printAt("╝", rw, rows-2, timeout, "white") ;

        for (let i = 2; i < rows-2; i++) {
            await this.terminal.printAt("║", lw, i, timeout, "white") ;
            await this.terminal.printAt("║", rw, i, timeout, "white") ;
        }

        for (let i = lw+1; i < rw; i++) {
            await this.terminal.printAt("═", i, 1,      timeout, "white") ;
            await this.terminal.printAt("═", i, rows-2, timeout, "white") ;
        }
    }

    // ─── Game loop ──────────────────────────────────────────────────────────

    async gameLoop() {
        return new Promise(resolve => {
            this.gameVars.resolver = resolve ;
            this.gameVars.animationHandle = window.requestAnimationFrame(this.processFrame.bind(this)) ;
        }) ;
    }

    async processFrame(timestamp) {
        try {
            timestamp = timestamp * 1000 ;
            this.gameVars.animationHandle = window.requestAnimationFrame(this.processFrame.bind(this)) ;

            if (this.gameVars.exit) { await this.exitGame() ; return ; }

            if (this.gameVars.pause) {
                await this.terminal.printAt("Paused (P to continue)", 1, 0, 0) ;
                return ;
            }
            await this.terminal.printAt("                      ", 1, 0, 0) ;

            if (!this.currentPiece || this.gameVars.gameOver) return ;

            // Immediate key actions — consumed on every animation frame for responsive controls
            if (this.gameVars.moveLeft) {
                this.gameVars.moveLeft = false ;
                if (this.isValidPosition(this.currentPiece.shape, this.currentPiece.x - 1, this.currentPiece.y)) {
                    await this.drawCurrentPiece(true) ;
                    this.currentPiece.x-- ;
                    await this.drawCurrentPiece() ;
                }
            }

            if (this.gameVars.moveRight) {
                this.gameVars.moveRight = false ;
                if (this.isValidPosition(this.currentPiece.shape, this.currentPiece.x + 1, this.currentPiece.y)) {
                    await this.drawCurrentPiece(true) ;
                    this.currentPiece.x++ ;
                    await this.drawCurrentPiece() ;
                }
            }

            if (this.gameVars.rotatePiece) {
                this.gameVars.rotatePiece = false ;
                const rotated = this.rotateClockwise(this.currentPiece.shape) ;
                if (this.isValidPosition(rotated, this.currentPiece.x, this.currentPiece.y)) {
                    await this.drawCurrentPiece(true) ;
                    this.currentPiece.shape = rotated ;
                    await this.drawCurrentPiece() ;
                }
            }

            // Soft drop forces gravity immediately; otherwise use the timed interval
            let applyGravity = false ;
            if (this.gameVars.softDrop) {
                this.gameVars.softDrop = false ;
                this.gameVars.sleepStart = timestamp ;
                applyGravity = true ;
            } else if (timestamp - this.gameVars.sleepStart > this.gameVars.sleepTime) {
                this.gameVars.sleepStart = timestamp ;
                applyGravity = true ;
            }

            if (applyGravity) await this.applyGravity() ;

            while (this.gameVars.hardDrop) {
                this.gameVars.hardDrop = await this.applyGravity() ;
            }

            if (this.gameVars.gameOver) await this.gameOver() ;
        } catch(e) {
            let out = "An error occurred while playing the game; error detail: " + e ;
            await this.terminal.println(out) ;
            this.terminal.logDebugInfo("ERROR: " + out) ;
            this.gameVars.resolver() ;
        }
    }

    async applyGravity() {
        if (!this.currentPiece) return ;

        if (this.isValidPosition(this.currentPiece.shape, this.currentPiece.x, this.currentPiece.y + 1)) {
            await this.drawCurrentPiece(true) ;
            this.currentPiece.y++ ;
            await this.drawCurrentPiece() ;
            return true ;
        } else {
            // Piece has landed — lock it, clear any full lines, spawn the next piece
            this.lockPiece() ;
            this.clearLines() ;
            await this.drawBoard() ;
            this.spawnPiece() ;
            if (!this.gameVars.gameOver) {
                await this.drawCurrentPiece() ;
                await this.drawNextPiece() ;
                await this.drawScore() ;
            }
            return false ;
        }
    }

    // ─── End screens ────────────────────────────────────────────────────────

    async gameOver() {
        const columns = parseInt(this.termSettings.columns) ;
        const timeout = this.termSettings.defaultTimeout ;
        window.cancelAnimationFrame(this.gameVars.animationHandle) ;
        this.terminal.clr() ;
        await this.terminal.printlnAt("#######    #    #     # #######", Math.floor((columns/2)-15), 0,  timeout) ;
        await this.terminal.printlnAt("#         # #   ##   ## #      ", Math.floor((columns/2)-15), 1,  timeout) ;
        await this.terminal.printlnAt("#        #   #  # # # # #      ", Math.floor((columns/2)-15), 2,  timeout) ;
        await this.terminal.printlnAt("#  #### ####### #  #  # #######", Math.floor((columns/2)-15), 3,  timeout) ;
        await this.terminal.printlnAt("#     # #     # #     # #      ", Math.floor((columns/2)-15), 4,  timeout) ;
        await this.terminal.printlnAt("#     # #     # #     # #      ", Math.floor((columns/2)-15), 5,  timeout) ;
        await this.terminal.printlnAt("####### #     # #     # #######", Math.floor((columns/2)-15), 6,  timeout) ;
        await this.terminal.printlnAt(" #####  #     # ####### ###### ", Math.floor((columns/2)-15), 8,  timeout) ;
        await this.terminal.printlnAt("#     # #     # #       #     #", Math.floor((columns/2)-15), 9,  timeout) ;
        await this.terminal.printlnAt("#     # #     # #       #     #", Math.floor((columns/2)-15), 10, timeout) ;
        await this.terminal.printlnAt("#     # #     # ####### ###### ", Math.floor((columns/2)-15), 11, timeout) ;
        await this.terminal.printlnAt("#     #  #   #  #       #   #  ", Math.floor((columns/2)-15), 12, timeout) ;
        await this.terminal.printlnAt("#     #   # #   #       #    # ", Math.floor((columns/2)-15), 13, timeout) ;
        await this.terminal.printlnAt(" #####     #    ####### #     #", Math.floor((columns/2)-15), 14, timeout) ;
        const scoreText = "Score: " + this.gameVars.score + " | Level: " + this.gameVars.level + " | Lines: " + this.gameVars.lines ;
        await this.terminal.printlnAt(scoreText, Math.floor((columns/2) - Math.floor(scoreText.length/2)), 16, timeout) ;
        this.terminal.removeListeners() ;
        this.gameVars.resolver() ;
    }

    async youWin() {
        const columns = parseInt(this.termSettings.columns) ;
        const timeout = this.termSettings.defaultTimeout ;
        window.cancelAnimationFrame(this.gameVars.animationHandle) ;
        this.terminal.clr() ;
        await this.terminal.printlnAt("#     #  #####  #     #     #     #  #####  ##    #", Math.floor((columns/2)-25), 0, timeout) ;
        await this.terminal.printlnAt(" #   #  #     # #     #     #     #    #    # #   #", Math.floor((columns/2)-25), 1, timeout) ;
        await this.terminal.printlnAt("  # #   #     # #     #     #  #  #    #    #  #  #", Math.floor((columns/2)-25), 2, timeout) ;
        await this.terminal.printlnAt("   #    #     # #     #     # # # #    #    #   # #", Math.floor((columns/2)-25), 3, timeout) ;
        await this.terminal.printlnAt("   #    #     # #     #     ##   ##    #    #    ##", Math.floor((columns/2)-25), 4, timeout) ;
        await this.terminal.printlnAt("   #     #####   #####      #     #  #####  #     #", Math.floor((columns/2)-25), 5, timeout) ;
        this.terminal.removeListeners() ;
        this.gameVars.resolver() ;
    }

    async exitGame() {
        window.cancelAnimationFrame(this.gameVars.animationHandle) ;
        this.terminal.clr() ;
        this.terminal.setCharPos(0, 0) ;
        this.terminal.removeListeners() ;
        this.gameVars.resolver() ;
    }
}