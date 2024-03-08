let gameVars = {}
let term ;

function resetVars() {
    gameVars = {
        x: 2,
        y: 2,
        xLocs: [],
        yLocs: [],
        d: "█",
        a: "♥",
        score: 0,
        snakeLength: 10,
        maxLength: 50,
        appleLocation: [0,0],
        appleScoreAdder: 1,
        sleepTime: 200000,
        sleepDecrement: 5000,
        animationHandle: 0,
        sleepStart: 0,
        lastDraw: 0,
        keyboardInput: "D",
        lastKnown: "D",
        pause: false,
        exit: false,
        collision: false,
        winner: false
    }
}

async function snake(args) {
    resetVars() ;

    gameVars.snakeLength = args[1] ? parseInt(args[1]) : gameVars.snakeLength ;
    gameVars.maxLength   = args[2] ? parseInt(args[2]) : gameVars.maxLength ;

    if(gameVars.snakeLength > 65 || gameVars.snakeLength < 1) {
        let out = "Invalid starting length; must be integer value within range 1 - 65."
        this.terminal.status = 1 ;
        await this.println(out) ;
        return out ;
    }

    if(gameVars.maxLength > 75 || gameVars.maxLength < 10) {
        let out = "Invalid max length; must be integer value within range 10 - 75."
        this.terminal.status = 1 ;
        await this.println(out) ;
        return out ;
    }

    for(let i = 0; i < gameVars.maxLength; i++) {
        gameVars.xLocs.push(2) ;
        gameVars.yLocs.push(2) ;
    }

    term = this ; // Store the terminal passed as "this" for later
    this.clr() ;

    try {
        await drawBorder();
        await updateScore() ;
        await placeApple() ;
        await this.printAt(gameVars.d, gameVars.x, gameVars.y, 0) ;
    } catch(e) {
        let out = "An error occurred while setting up the game; error detail: " + e ;
        this.terminal.status = 1 ;
        await term.println(out) ;
        this.logDebugInfo("ERROR: " + out) ;
        return out ;
    }

    this.initListeners((keyCode, char, userIn, resolve, limit) => {
        switch(keyCode) {
            case 87: // W
                if(limit) return;
            case 38: // Up
                if(gameVars.keyboardInput !== "W" && gameVars.keyboardInput !== "S") {
                    gameVars.lastKnown = gameVars.keyboardInput;
                    gameVars.keyboardInput = "W";
                }
                break ;
            case 83: // S
                if(limit) return;
            case 40: // Down
                if(gameVars.keyboardInput !== "S" && gameVars.keyboardInput !== "W") {
                    gameVars.lastKnown = gameVars.keyboardInput;
                    gameVars.keyboardInput = "S";
                }
                break ;
            case 65: // A
                if(limit) return;
            case 37: // Left
                if(gameVars.keyboardInput !== "A" && gameVars.keyboardInput !== "D") {
                    gameVars.lastKnown = gameVars.keyboardInput;
                    gameVars.keyboardInput = "A";
                }
                break ;
            case 68: // D
                if(limit) return;
            case 39: // Right
                if(gameVars.keyboardInput !== "D" && gameVars.keyboardInput !== "A") {
                    gameVars.lastKnown = gameVars.keyboardInput;
                    gameVars.keyboardInput = "D";
                }
                break ;
            case 81: // Q
                if(limit) return;
            case 27: // ESC
                this.removeListeners() ;
                gameVars.exit = true ;
                break ;
            case 80: // P
                if(limit) return;
                gameVars.pause = !gameVars.pause ;
                break ;
        }
    }) ;

    try {
        await gameLoop() ;
    } catch(e) {
        let out = "An error occurred while playing the game; error detail: " + e ;
        this.terminal.status = 1 ;
        await this.println(out) ;
        this.logDebugInfo("ERROR: " + out) ;
        return out ;
    }

    this.terminal.status = 0 ;
    return "END"
}

async function gameLoop() {
    return new Promise(resolve => {
        gameVars.resolver = resolve ;
        window.requestAnimationFrame(moveSnake);
    }) ;
}

async function moveSnake(timestamp) {
    try {
        timestamp = timestamp*1000 ;
        gameVars.animationHandle = window.requestAnimationFrame(moveSnake);
        if(timestamp - gameVars.sleepStart > gameVars.sleepTime) {
            gameVars.sleepStart = timestamp ;
            if(gameVars.pause) {
                await term.printAt("Paused (P to continue)", 1, 0, 0) ;
                return ;
            }
            await term.printAt("                      ", 1, 0, 0) ;
            switch (gameVars.keyboardInput) {
                case "W":
                    if (gameVars.y > 2) {
                        if (gameVars.lastKnown !== "S") {
                            gameVars.y--;
                        }
                    } else { await gameOver(); return ;}
                    break;
                case "S":
                    if (gameVars.y < term.terminal.rows - 3) {
                        if (gameVars.lastKnown !== "W") {
                            gameVars.y++;
                        }
                    } else { await gameOver(); return ;}
                    break;
                case "A":
                    if (gameVars.x > 2) {
                        if (gameVars.lastKnown !== "D") {
                            gameVars.x--;
                        }
                    } else { await gameOver(); return ;}
                    break;
                case "D":
                    if (gameVars.x < term.terminal.columns - 3) {
                        if (gameVars.lastKnown !== "A") {
                            gameVars.x++;
                        }
                    } else { await gameOver(); return ;}
            }
            if (gameVars.exit) { await exitSnake() ; return ; }
            await drawSnake();
            await detectAppleEat();
            if(gameVars.winner) { await youWin(); return ; }
            await detectCollision();
            if(gameVars.collision) { await gameOver(); return ; }
            await updateScore();
        }
    } catch(e) {
        let out = "An error occurred while playing the game; error detail: " + e ;
        await term.println(out) ;
        term.logDebugInfo("ERROR: " + out) ;
        gameVars.resolver() ;
        return out ;
    }
}

async function drawBorder() {
    await term.printAt("╔", 1, 1, term.terminal.defaultTimeout) ;
    await term.printAt("╚", 1, parseInt(term.terminal.rows)-2, term.terminal.defaultTimeout) ;
    await term.printAt("╗", parseInt(term.terminal.columns)-2, 1, term.terminal.defaultTimeout) ;
    await term.printAt("╝", parseInt(term.terminal.columns)-2, parseInt(term.terminal.rows)-2, term.terminal.defaultTimeout) ;

    for(let i = 2; i < parseInt(term.terminal.rows)-2; i++ ) {
        await term.printAt("║", 1, i, term.terminal.defaultTimeout) ;
        await term.printAt("║", parseInt(term.terminal.columns)-2, i, term.terminal.defaultTimeout) ;
    }

    for(let i = 2; i < parseInt(term.terminal.columns)-2; i++ ) {
        await term.printAt("═", i, 1, term.terminal.defaultTimeout) ;
        await term.printAt("═", i, parseInt(term.terminal.rows)-2, term.terminal.defaultTimeout) ;
    }
}

async function drawSnake() {
    await term.printAt(gameVars.d, gameVars.x, gameVars.y, 0) ;

    if(gameVars.x != gameVars.xLocs[0] || gameVars.y != gameVars.yLocs[0]) {
        await term.printAt(" ", gameVars.xLocs[gameVars.snakeLength-1], gameVars.yLocs[gameVars.snakeLength-1], 0) ;

        let xTemp = [], yTemp = [] ;

        for(let i = 0; i < gameVars.snakeLength-1; i++) {
            xTemp[i+1] = gameVars.xLocs[i] ;
            yTemp[i+1] = gameVars.yLocs[i] ;
        }

        xTemp[0] = gameVars.x ;
        yTemp[0] = gameVars.y ;

        for(let i = 0; i < gameVars.snakeLength; i++) {
            gameVars.xLocs[i] = xTemp[i] ;
            gameVars.yLocs[i] = yTemp[i] ;
            await term.printAt(gameVars.d, gameVars.xLocs[i], gameVars.yLocs[i], 0) ;
        }
    }
}

async function updateScore() {
    let scoreBoard = "Score: "+gameVars.score+" | Length: "+gameVars.snakeLength+" | Max Length: "+gameVars.maxLength
    if(term.terminal.columns <= 40) scoreBoard = "S: "+gameVars.score+" | L: "+gameVars.snakeLength+" | M: "+gameVars.maxLength
    await term.printAt(scoreBoard, Math.floor((term.terminal.columns/2)-(scoreBoard.length/2)), parseInt(term.terminal.rows)-1, 0) ;
}

async function placeApple() {
    let col = 0 ;
    let row = 0 ;

    while(true) {
        col = term.rnd(parseInt(term.terminal.columns)-8) + 4 ;
        row = term.rnd(parseInt(term.terminal.rows)-8) + 4 ;

        let overlap = false ;
        for(let i = 0; i < gameVars.snakeLength; i++) {
            if( col == gameVars.xLocs[i] && row == gameVars.yLocs[i]) {
                overlap = true ;
                break ;
            }
        }

        if(!overlap) break ;
    }

    gameVars.appleLocation = [col, row]
    await term.printAt(gameVars.a, col, row, 0) ;
}

async function detectAppleEat() {
    if(gameVars.x == gameVars.appleLocation[0] && gameVars.y == gameVars.appleLocation[1]) {
        gameVars.score += gameVars.appleScoreAdder ;
        gameVars.snakeLength += 1 ;

        if( gameVars.snakeLength >= gameVars.maxLength) {
            gameVars.winner = true ;
            return;
        }

        await placeApple() ;
        gameVars.sleepTime -= gameVars.sleepDecrement ;
    }
}

async function detectCollision() {
    for( let i = 1; i < gameVars.snakeLength; i++) {
        if(gameVars.x == gameVars.xLocs[i] && gameVars.y == gameVars.yLocs[i]) {
            gameVars.collision = true ;
        }
    }
}

async function gameOver() {
    window.cancelAnimationFrame(gameVars.animationHandle) ;
    term.clr() ;
    await term.printlnAt("#######    #    #     # #######", Math.floor((term.terminal.columns/2)-15), 0,  term.terminal.defaultTimeout) ;
    await term.printlnAt("#         # #   ##   ## #      ", Math.floor((term.terminal.columns/2)-15), 1,  term.terminal.defaultTimeout) ;
    await term.printlnAt("#        #   #  # # # # #      ", Math.floor((term.terminal.columns/2)-15), 2,  term.terminal.defaultTimeout) ;
    await term.printlnAt("#  #### ####### #  #  # #######", Math.floor((term.terminal.columns/2)-15), 3,  term.terminal.defaultTimeout) ;
    await term.printlnAt("#     # #     # #     # #      ", Math.floor((term.terminal.columns/2)-15), 4,  term.terminal.defaultTimeout) ;
    await term.printlnAt("#     # #     # #     # #      ", Math.floor((term.terminal.columns/2)-15), 5,  term.terminal.defaultTimeout) ;
    await term.printlnAt("####### #     # #     # #######", Math.floor((term.terminal.columns/2)-15), 6,  term.terminal.defaultTimeout) ;
    await term.printlnAt(" #####  #     # ####### ###### ", Math.floor((term.terminal.columns/2)-15), 8,  term.terminal.defaultTimeout) ;
    await term.printlnAt("#     # #     # #       #     #", Math.floor((term.terminal.columns/2)-15), 9,  term.terminal.defaultTimeout) ;
    await term.printlnAt("#     # #     # #       #     #", Math.floor((term.terminal.columns/2)-15), 10, term.terminal.defaultTimeout) ;
    await term.printlnAt("#     # #     # ####### ###### ", Math.floor((term.terminal.columns/2)-15), 11, term.terminal.defaultTimeout) ;
    await term.printlnAt("#     #  #   #  #       #   #  ", Math.floor((term.terminal.columns/2)-15), 12, term.terminal.defaultTimeout) ;
    await term.printlnAt("#     #   # #   #       #    # ", Math.floor((term.terminal.columns/2)-15), 13, term.terminal.defaultTimeout) ;
    await term.printlnAt(" #####     #    ####### #     #", Math.floor((term.terminal.columns/2)-15), 14, term.terminal.defaultTimeout) ;

    let scoreBoard = "Score: "+gameVars.score+" | Length: "+gameVars.snakeLength+" | Max Length: "+gameVars.maxLength
    if(term.terminal.columns <= 40) scoreBoard = "S: "+gameVars.score+" | L: "+gameVars.snakeLength+" | M: "+gameVars.maxLength
    await term.printlnAt(scoreBoard, Math.floor((term.terminal.columns/2)-(scoreBoard.length/2)), 16, term.terminal.defaultTimeout) ;
    term.removeListeners() ;
    gameVars.resolver() ;
}

async function youWin() {
    window.cancelAnimationFrame(gameVars.animationHandle) ;
    term.clr() ;
    await term.printlnAt("#     #  #####  #     #     #     #  #####  ##    #", Math.floor((term.terminal.columns/2)-25), 0, term.terminal.defaultTimeout) ;
    await term.printlnAt(" #   #  #     # #     #     #     #    #    # #   #", Math.floor((term.terminal.columns/2)-25), 1, term.terminal.defaultTimeout) ;
    await term.printlnAt("  # #   #     # #     #     #  #  #    #    #  #  #", Math.floor((term.terminal.columns/2)-25), 2, term.terminal.defaultTimeout) ;
    await term.printlnAt("   #    #     # #     #     # # # #    #    #   # #", Math.floor((term.terminal.columns/2)-25), 3, term.terminal.defaultTimeout) ;
    await term.printlnAt("   #    #     # #     #     ##   ##    #    #    ##", Math.floor((term.terminal.columns/2)-25), 4, term.terminal.defaultTimeout) ;
    await term.printlnAt("   #     #####   #####      #     #  #####  #     #", Math.floor((term.terminal.columns/2)-25), 5, term.terminal.defaultTimeout) ;

    let scoreBoard = "Score: "+gameVars.score+" | Length: "+gameVars.snakeLength+" | Max Length: "+gameVars.maxLength
    if(term.terminal.columns <= 40) scoreBoard = "S: "+gameVars.score+" | L: "+gameVars.snakeLength+" | M: "+gameVars.maxLength
    await term.printlnAt(scoreBoard, Math.floor((term.terminal.columns/2)-(scoreBoard.length/2)), 7, term.terminal.defaultTimeout) ;
    term.removeListeners() ;
    gameVars.resolver() ;
}

async function exitSnake() {
    window.cancelAnimationFrame(gameVars.animationHandle) ;
    term.clr();
    term.setCharPos(0, 0);
    term.removeListeners() ;
    gameVars.resolver() ;
}