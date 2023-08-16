//players
//IDEAS

//ghosts
//powerup images
//change color
// cambiar tablero con zonas prohibidas

let players = {
    fred: { powerup: { toClear: [] }, score: 0, ready: false },
    greenlee: { powerup: { toClear: [] }, score: 0, ready: false },
    pinkney: { powerup: { toClear: [] }, score: 0, ready: false },
    bluebell: { powerup: { toClear: [] }, score: 0, ready: false },
    willem: { powerup: { toClear: [] }, score: 0, ready: false },
    greydon: { powerup: { toClear: [] }, score: 0, ready: false },
}

let achtung = {
    gamemode: 1, // 0 = arcade, 1 = classic
    startScreen: true, //are we on the start screen? 
    gameRunning: false, //are we playing? 
    gameEnded: true, //are noone alive?
    winner: false, //do we have a winner?
    sides: 0, //can all players go out of screen and come out the other side
    clearSides: 0, //to clear timeone if leftover time from last round
    playing: [], //who's playing
    powerups: ["g_slow", "g_fast", "g_thin", "g_robot", "g_side", "g_invisible", "r_slow", "r_fast", "r_thick", "r_robot", "r_reverse", "b_clear", "b_more", "b_sides", "o_random", ],
    powerupsOnScreen: [], //what powerups are on screen now
}

//variables
let canvasID,
    UIcanvas = document.querySelector("#ui_canvas"), //ui canvas
    dotsCanvas = document.querySelector("#dots_canvas"), //canvas for player dots
    trailsHitboxCanvas = document.querySelector("#trails_hitbox_canvas"), //canvas for player trails
    powerupVisualCanvas = document.querySelector("#powerup_visual_canvas"), //canvas for powerup icons
    powerupHitboxCanvas = document.querySelector("#powerup_hitbox_canvas"), //canvas for powerup hitboxes
    ctxUI = UIcanvas.getContext("2d"),
    ctxDO = dotsCanvas.getContext("2d"),
    ctxTH = trailsHitboxCanvas.getContext("2d"),
    ctxPV = powerupVisualCanvas.getContext("2d"),
    ctxPH = powerupHitboxCanvas.getContext("2d"),
    yellow = getComputedStyle(document.documentElement).getPropertyValue(`--yellow`), //colors
    green = getComputedStyle(document.documentElement).getPropertyValue(`--greenlee`),
    greent = getComputedStyle(document.documentElement).getPropertyValue(`--greenlee-t`),
    red = getComputedStyle(document.documentElement).getPropertyValue(`--fred`),
    redt = getComputedStyle(document.documentElement).getPropertyValue(`--fred-t`),
    blue = getComputedStyle(document.documentElement).getPropertyValue(`--blue`),
    bluet = getComputedStyle(document.documentElement).getPropertyValue(`--blue-t`),
    tFrame = 0, //cur frame in draw
    powerupProb = 0.005, //likelyhood of powerup spawn in percent
    bridgeProb = 0.005, //likelyhood of powerup spawn in percent
    bridgeSize = 10, //size of bridge (hole in trail) in frames
    turnSpeed = 0.06, //how fast players turn in radians per frame
    w, h, w100th, h100th, moveSpeed, playerSize, hitboxSize, borderWidth, iconSize //to be set in newSize()


//when resizing
window.addEventListener("resize", () => {
    newSize()
})

//update canvas sizes and variable sizes to fit new size
function newSize() {
    w = Math.round(UIcanvas.getBoundingClientRect().width)
    h = Math.round(UIcanvas.getBoundingClientRect().height)
    UIcanvas.setAttribute("width", w)
    UIcanvas.setAttribute("height", h)
    dotsCanvas.setAttribute("width", w)
    dotsCanvas.setAttribute("height", h)
    trailsHitboxCanvas.setAttribute("width", w)
    trailsHitboxCanvas.setAttribute("height", h)
    powerupVisualCanvas.setAttribute("width", w)
    powerupVisualCanvas.setAttribute("height", h)
    powerupHitboxCanvas.setAttribute("width", w)
    powerupHitboxCanvas.setAttribute("height", h)
    w100th = w / 100 //1 percent of canvas width
    h100th = h / 100 //1 percent of canvas height
    moveSpeed = w100th * 0.18 //speed of players in pixels per frame
    playerSize = w100th * 0.7 //size of players in pixels
    hitboxSize = playerSize / 1.8 //size of player hitbox in pixels
    borderWidth = w100th / 2 //size of the border in pixels
    iconSize = w100th * 2 //size of the powerup icons in pixels

    init() //restart
}

function init() {
    achtung.powerupsOnScreen = [] //clear powerups on screen
    clearTimeout(achtung.clearSides) //clear timeout if sides powerup leftover time from last round
    achtung.sides = 0 //reset sides powerup


    for (const player in players) { //loop through players

        //clear timeout if powerup leftover time from last round
        for (let i = 0; i < players[player].powerup.toClear.length; i++) {
            clearTimeout(players[player].powerup.toClear[i])
        }

        //reset players object to default values before starting a new round
        players[player].x = 0
        players[player].y = 0
        players[player].dir = 0
        players[player].turnL = false
        players[player].turnR = false
        players[player].color = getComputedStyle(document.documentElement).getPropertyValue(`--${player}`) //colors from css :root object
        players[player].alive = true
        players[player].winner = false
        players[player].bridge = false
        players[player].bridgeFrame = 0
        players[player].powerup = {} //contains powerup values
        players[player].powerup.size = 1 //multiplied with playerSize when drawing
        players[player].powerup.robot = 0 //0 == default, anything else and robot is on
        players[player].powerup.reverse = 0 //0 == default, anything else and reverse is on
        players[player].powerup.speed = 1 //multiplied with moveSpeed when drawing
        players[player].powerup.invisible = 0 //0 == default, anything else and invisible is on
        players[player].powerup.side = 0 //0 == default, anything else and sides are on
        players[player].powerup.powerupArray = [] //the powerups the player has gotten
        players[player].powerup.toClear = [] //to clear setTimeout at the end of rounds if leftover powerup time
    }

    //clear everything
    ctxTH.clearRect(0, 0, w, h)
    ctxUI.clearRect(0, 0, w, h)
    ctxDO.clearRect(0, 0, w, h)
    ctxPH.clearRect(0, 0, w, h)
    ctxPV.clearRect(0, 0, w, h)

    //draw yellow border
    ctxDO.lineWidth = borderWidth
    ctxDO.strokeStyle = yellow
    ctxDO.strokeRect(borderWidth / 2, borderWidth / 2, h - borderWidth, h - borderWidth)

    calcRandomStartPos() //calc random start positions
    calcRandomStartDir() //calc random start directions
    drawGameUI() //draw ui
    drawStart() //draw players at start so they can see where they're going
}

document.addEventListener("keydown", (e) => {
    //update players turning to true if turning
    for (const player in players) {
        if (!players[player].alive) continue //if player not alive; skip
        if (e.code == players[player].keyL) {
            players[player].turnL = true
        }
        if (e.code == players[player].keyR) {
            players[player].turnR = true
        }
    }

    //if keydown == escape, go to start page
    if (e.code == "Escape") {
        achtung.startScreen = true //self explanatory
        achtung.gameEnded = true //self explanatory
        achtung.gameRunning = false //self explanatory
        startPage.style.display = "block" //show start page again
        window.cancelAnimationFrame(canvasID) //stop draw loop

        //reset score
        for (const player in players) {
            players[player].score = 0
        }

        init() //reset
    }
})

document.addEventListener("keyup", (e) => {
    //update players turning to false when keyup
    for (const player in players) {
        if (!players[player].alive) continue //if player not alive; skip
        if (e.code == players[player].keyL) {
            players[player].turnL = false
        }
        if (e.code == players[player].keyR) {
            players[player].turnR = false
        }
    }
})

document.addEventListener("keypress", (e) => {
    if (e.code == "Space") {
        pressSpace()
    }
})

function pressSpace() {
    let playingC = 0
    for (const player in players) {
        if (players[player].ready) playingC++
    }

    if (achtung.startScreen) {
        if (playingC >= 2) { //start game
            for (const player in players) {
                if (players[player].active && !players[player].ready) {
                    resetPlayer(document.querySelector(`.player_wrapper.${player}`))
                }
            }
            achtung.startScreen = false
            achtung.gameEnded = true
            startPage.style.display = "none"
            init()
        }
    }

    if (!achtung.gameEnded) {
        if (!achtung.gameRunning) { //resume game
            achtung.gameRunning = true
            window.requestAnimationFrame(draw)
        } else { //pause game
            achtung.gameRunning = false
            window.cancelAnimationFrame(canvasID)
        }
    } else { //restart game
        if (achtung.winner) {
            achtung.winner = false
            achtung.startScreen = true
            achtung.gameEnded = true
            achtung.gameRunning = false
            startPage.style.display = "block"
            window.cancelAnimationFrame(canvasID)
            for (const player in players) {
                players[player].score = 0
            }
            init()
        } else {
            if (playingC >= 2) {
                achtung.gameEnded = false
                achtung.gameRunning = false
                init()
            }
        }
    }
}

//draw start position so players know where they're going
function drawStart() {
    for (const player in players) {
        if (!players[player].ready) continue

        //draw player dot
        ctxDO.fillStyle = yellow
        ctxDO.beginPath()
        ctxDO.arc(players[player].x, players[player].y, (playerSize / 2 - 0.1) * players[player].powerup.size, 0, r2d(360), true)
        ctxDO.fill()

        //draw player trail
        ctxTH.fillStyle = players[player].color
        ctxTH.save()
        ctxTH.translate(players[player].x, players[player].y)
        ctxTH.rotate(players[player].dir - r2d(270))
        ctxTH.fillRect(-playerSize / 2 * players[player].powerup.size, 0, playerSize * players[player].powerup.size, playerSize * 2 * players[player].powerup.size)
        ctxTH.restore()
    }
}

//main loop
function draw() {
    canvasID = window.requestAnimationFrame(draw) //to pause: cancelAnimationFrame(CanvasID)
    tFrame++ //increment tFrame

    //clear
    ctxTH.clearRect(h, 0, w - h, h)
    ctxDO.clearRect(0, 0, w, h)
    ctxDO.fillStyle = "#000000"
    ctxDO.fillRect(h, 0, w - h, h)

    //draw yellow border
    ctxDO.lineWidth = borderWidth
    ctxDO.strokeStyle = "#000000"
    ctxDO.strokeRect(borderWidth / 2, borderWidth / 2, h - borderWidth, h - borderWidth)
    if (achtung.sides != 0) { ctxDO.strokeStyle = `rgba(255, 255, 0, ${Math.abs(tFrame % 40 - 20) / 20})` } else ctxDO.strokeStyle = yellow //if sides, border flickers
    ctxDO.strokeRect(borderWidth / 2, borderWidth / 2, h - borderWidth, h - borderWidth)

    //spawn new powerup if arcade mode and math.random() < powerup probability
    if (achtung.gamemode == 1) {
        if (Math.random() < powerupProb) {
            powerupSpawner()
        }
    }

    //get image data from canvas
    let ctxTHImgData = ctxTH.getImageData(0, 0, w, h).data //get trails hitbox image data array
    let ctxPHImgData = ctxPH.getImageData(0, 0, w, h).data //get powerup hitbox image data array

    //loop through players and draw them
    for (const player in players) {

        if (!players[player].ready) continue //continue loop if player not playing

        //player pos
        let prevprevPosX = players[player].x - (mathCos(players[player].dir) * moveSpeed * players[player].powerup.speed),
            prevprevPosY = players[player].y - (mathSin(players[player].dir) * moveSpeed * players[player].powerup.speed),
            prevPosX = players[player].x,
            prevPosY = players[player].y,
            nextPosX = players[player].x + (mathCos(players[player].dir) * moveSpeed * players[player].powerup.speed),
            nextPosY = players[player].y + (mathSin(players[player].dir) * moveSpeed * players[player].powerup.speed)


        //draw player dot
        if (players[player].powerup.reverse == 0) {
            if (players[player].powerup.side == 0) { ctxDO.fillStyle = yellow } else ctxDO.fillStyle = `rgba(255, 255, 0, ${Math.abs(tFrame % 40 - 20) / 20})` //flicker dot if side powerup
        } else {
            if (players[player].powerup.side == 0) { ctxDO.fillStyle = blue } else ctxDO.fillStyle = `rgba(0, 0, 255, ${Math.abs(tFrame % 40 - 20) / 20})` //flicker dot if side powerup
        }
        if (players[player].powerup.robot == 0) { //draw dot if normal
            ctxDO.beginPath()
            ctxDO.arc(nextPosX, nextPosY, (playerSize / 2) * players[player].powerup.size, 0, r2d(360), true)
            ctxDO.fill()
        } else { //draw square if robot
            ctxDO.save()
            ctxDO.translate(nextPosX, nextPosY)
            ctxDO.rotate(players[player].dir - r2d(270))
            ctxDO.fillRect(-playerSize / 2 * players[player].powerup.size, -playerSize / 2 * players[player].powerup.size, playerSize * players[player].powerup.size, playerSize * players[player].powerup.size)
            ctxDO.restore()
        }


        if (!players[player].alive) continue //continue if player not alive (drawing dot is above, so player dot will still be drawn even if dead)


        //update player turning
        if (players[player].powerup.robot == 0) {

            //if normal
            if (players[player].turnL) {
                if (players[player].powerup.reverse == 0) { players[player].dir -= turnSpeed / Math.pow(players[player].powerup.size, 0.3) } else players[player].dir += turnSpeed / Math.pow(players[player].powerup.size, 0.3)
            }
            if (players[player].turnR) {
                if (players[player].powerup.reverse == 0) { players[player].dir += turnSpeed / Math.pow(players[player].powerup.size, 0.3) } else players[player].dir -= turnSpeed / Math.pow(players[player].powerup.size, 0.3)
            }

        } else {

            //if robot
            if (players[player].turnL) {
                players[player].turnL = false
                if (players[player].powerup.reverse == 0) { players[player].dir -= r2d(90) } else players[player].dir += r2d(90)
            }
            if (players[player].turnR) {
                players[player].turnR = false
                if (players[player].powerup.reverse == 0) { players[player].dir += r2d(90) } else players[player].dir -= r2d(90)
            }

        }


        //update player position
        prevPosX = players[player].x
        prevPosY = players[player].y
        players[player].x = nextPosX
        players[player].y = nextPosY


        //check for player inside playing field
        if (achtung.sides != 0 || players[player].powerup.side != 0) { //player has side powerup of achtung.sides, players can move out of canvas
            if (players[player].x < 0) {
                players[player].x = h
                prevPosX = h
                prevprevPosX = h
            }
            if (players[player].x > h) {
                players[player].x = 0
                prevPosX = 0
                prevprevPosX = 0
            }
            if (players[player].y < 0) {
                players[player].y = h
                prevPosY = h
                prevprevPosY = h
            }
            if (players[player].y > h) {
                players[player].y = 0
                prevPosY = 0
                prevprevPosY = 0
            }
        } else {
            if ( //if not, player dead
                players[player].x < borderWidth + hitboxSize ||
                players[player].x > h - borderWidth - hitboxSize ||
                players[player].y < borderWidth + hitboxSize ||
                players[player].y > h - borderWidth - hitboxSize) {

                givePoints(players[player])
                continue
            }
        }


        //insert bridge
        if (!players[player].bridge) { //if not already bridge
            if (Math.random() < bridgeProb) { //if math.random() less than prob for bridge
                players[player].bridge = true
            }
            players[player].bridgeFrame = tFrame //what frame did bridge start
        }
        if (players[player].bridgeFrame < tFrame - (bridgeSize / players[player].powerup.speed * players[player].powerup.size)) { //stop bridge when bridgeSize frame has passed
            players[player].bridge = false
        }


        //draw player trail; don't draw if bridge or invisible
        if (!players[player].bridge && players[player].powerup.invisible == 0) {
            ctxTH.strokeStyle = players[player].color
            ctxTH.lineWidth = playerSize * players[player].powerup.size
            ctxTH.beginPath()
            if (players[player].powerup.robot != 0) {
                ctxTH.lineCap = "round"
                ctxTH.moveTo(prevPosX, prevPosY)
            } else {
                ctxTH.lineCap = "butt"
                ctxTH.moveTo(prevprevPosX, prevprevPosY)
            }
            ctxTH.lineTo(players[player].x, players[player].y)
            ctxTH.stroke()
        }


        //check collision
        let pxFront = Math.round(players[player].x + (mathCos(players[player].dir) * hitboxSize * players[player].powerup.size)),
            pyFront = Math.round(players[player].y + (mathSin(players[player].dir) * hitboxSize * players[player].powerup.size)),
            pxFront2 = Math.round(players[player].x + mathCos(players[player].dir)),
            pyFront2 = Math.round(players[player].y + mathSin(players[player].dir)),
            pxLeft = Math.round(players[player].x + (mathCos(players[player].dir - r2d(55)) * hitboxSize * players[player].powerup.size)),
            pyLeft = Math.round(players[player].y + (mathSin(players[player].dir - r2d(55)) * hitboxSize * players[player].powerup.size)),
            pxRight = Math.round(players[player].x + (mathCos(players[player].dir + r2d(55)) * hitboxSize * players[player].powerup.size)),
            pyRight = Math.round(players[player].y + (mathSin(players[player].dir + r2d(55)) * hitboxSize * players[player].powerup.size)),
            pixAlphaFront = getAlphaIndexForCoord(pxFront, pyFront, w),
            pixAlphaFront2 = getAlphaIndexForCoord(pxFront2, pyFront2, w),
            pixAlphaLeft = getAlphaIndexForCoord(pxLeft, pyLeft, w),
            pixAlphaRight = getAlphaIndexForCoord(pxRight, pyRight, w)

        // uncomment to visualize hitbox
        // ctxDO.fillStyle = "#ffffff"
        // ctxDO.fillRect(pxFront, pyFront, 1, 1)
        // ctxDO.fillRect(pxFront2, pyFront2, 1, 1)
        // ctxDO.fillRect(pxLeft, pyLeft, 1, 1)
        // ctxDO.fillRect(pxRight, pyRight, 1, 1)

        //check collision for every powerup on screen
        for (let i = 0; i < achtung.powerupsOnScreen.length; i++) {
            if ((ctxPHImgData[pixAlphaFront - 1] == i * 3 + 1 && ctxPHImgData[pixAlphaFront - 2] == i * 3 + 2 && ctxPHImgData[pixAlphaFront - 3] == i * 3 + 3) ||
                (ctxPHImgData[pixAlphaLeft - 1] == i * 3 + 1 && ctxPHImgData[pixAlphaLeft - 2] == i * 3 + 2 && ctxPHImgData[pixAlphaLeft - 3] == i * 3 + 3) ||
                (ctxPHImgData[pixAlphaRight - 1] == i * 3 + 1 && ctxPHImgData[pixAlphaRight - 2] == i * 3 + 2 && ctxPHImgData[pixAlphaRight - 3] == i * 3 + 3)) {
                let powName = achtung.powerupsOnScreen[i].pow
                players[player].powerup.powerupArray.push(powName)

                //remove powerup from screen
                achtung.powerupsOnScreen.splice(i, 1)

                //do powerup
                doPowerups(player, players[player].powerup.powerupArray.length - 1)

                //draw powerup
                powerupDraw()
            }
        }

        if (!players[player].bridge) { //don't check collision if making bridge
            if (players[player].powerup.invisible == 0) { //don't check if invisible
                if (players[player].powerup.robot == 0) { //check alpha value of pixels front, front2, left, right
                    if (ctxTHImgData[pixAlphaFront] == 255 || ctxTHImgData[pixAlphaFront2] == 255 || ctxTHImgData[pixAlphaLeft] == 255 || ctxTHImgData[pixAlphaRight] == 255) {
                        givePoints(players[player])
                        continue
                    }
                } else {
                    if (ctxTHImgData[pixAlphaFront] == 255) { //if robot only check alpha value of front
                        givePoints(players[player])
                        continue
                    }
                }
            }
        }
    }


    //drawGameUI()
    checkGameState()
}

//check game stats
function checkGameState() {

    //how many are alive?
    let alive = 0
    for (const player in players) {
        if (players[player].alive && players[player].ready) {
            alive++
        }
    }

    //if all dead
    if (alive <= 1) { //IMPORTANT - change back to 1 -------------------------------------------------------------------------------------------------------------------------------
        window.cancelAnimationFrame(canvasID)
        achtung.gameEnded = true
    }

    //did someone win?
    if (achtung.gameEnded) {
        if (achtung.scoreArray[achtung.scoreArray.length - 1][1] >= achtung.pointGoal) {
            if (achtung.scoreArray[achtung.scoreArray.length - 1][1] - achtung.scoreArray[achtung.scoreArray.length - 2][1] > 1) {
                let p = achtung.scoreArray[achtung.scoreArray.length - 1][0]
                    //console.log(p + " wins the game")
                achtung.winner = true

                //draw winner screen
                for (const player in players) {
                    if (player == p) {
                        ctxUI.fillStyle = players[player].color.replace("rgb", "rgba").replace(")", ", 0.3)")
                        ctxUI.fillRect(20 * h100th, 32 * h100th, h - (40 * h100th), h - (64 * h100th))

                        ctxUI.lineWidth = borderWidth
                        ctxUI.strokeStyle = players[player].color
                        ctxUI.strokeRect(20 * h100th, 32 * h100th, h - (40 * h100th), h - (64 * h100th))

                        ctxUI.textBaseline = "middle"
                        ctxUI.fillStyle = players[player].color
                        ctxUI.textAlign = "center"
                        ctxUI.font = `${w100th * 6}px 'Lexend Deca'`
                        ctxUI.fillText('Konec hry', h / 2, h / 2 - (h100th * 5)) //the legendary "konec hry"
                        ctxUI.font = `${w100th * 4}px 'Lexend Deca'`
                        ctxUI.fillText(`${capitalize(player)} wins!`, h / 2, h / 2 + (h100th * 5))
                    }
                }
            } else {
                //two players are within 1 point; continue playing
                //console.log("play on")
            }
        }
    }

}

//updates points for players
function givePoints(p) {
    p.alive = false
    for (const player in players) {
        if (!players[player].ready) continue
        if (p != players[player] && players[player].alive) {
            players[player].score++
                drawGameUI()
        }
    }
}

//draws game ui
const drawGameUI = () => {
    ctxUI.textBaseline = "alphabetic"
    ctxUI.clearRect(h, 0, w - h, h)
    ctxUI.fillStyle = "#000000"
    ctxUI.fillRect(h, 0, w - h, h)

    //sort players
    achtung.scoreArray = []
    for (const player in players) {
        if (!players[player].ready) continue
        achtung.scoreArray.push([player, players[player].score])
    }
    achtung.scoreArray.sort((a, b) => { return a[1] - b[1] })

    //draw top text
    achtung.pointGoal = (achtung.scoreArray.length - 1) * 10 //////////////change back to * 10 -------------------------------------------------------------------------------------
    let UIcenter = +h + ((w - h) / 2)
    ctxUI.fillStyle = "#FFFFFF"
    ctxUI.textAlign = "center"
    ctxUI.font = `${w100th * 3}px 'Lexend Deca'`
    ctxUI.fillText('Race to', UIcenter, w100th * 5)
    ctxUI.font = `${w100th * 12}px 'Lexend Deca'`
    ctxUI.fillText(achtung.pointGoal, UIcenter, w100th * 15)
    ctxUI.font = `${w100th * 2}px 'Lexend Deca'`
    ctxUI.fillText('2 point difference', UIcenter, w100th * 19)

    //draw player names and score
    ctxUI.font = `${w100th * 3}px 'Lexend Deca'`
    let playerYOffset = w100th * 32

    for (let i = achtung.scoreArray.length - 1; i >= 0; i--) {
        let p = achtung.scoreArray[i][0]
        ctxUI.fillStyle = players[p].color
        ctxUI.textAlign = "start"
        ctxUI.fillText(capitalize(p), +h + (w100th * 2), playerYOffset)
        ctxUI.textAlign = "end"
        ctxUI.fillText(players[p].score, +w - (w100th * 2), playerYOffset)
        playerYOffset += (w100th * 5)
    }

    //draw space to continue text
    ctxUI.fillStyle = "#FFFFFF"
    ctxUI.textAlign = "center"
    ctxUI.font = `${w100th * 2}px 'Lexend Deca'`
    ctxUI.fillText("SPACE to play", UIcenter, +h - (w100th * 6))
    ctxUI.fillText("ESCAPE to quit", UIcenter, +h - (w100th * 3))
}

//executes powerups
function doPowerups(puPlayer, index) {
    let gTimeout = 8000
    let rTimeout = 5000
    let powName = players[puPlayer].powerup.powerupArray[index]

    //powerup starts
    if (powName == "o_random") {
        // powName = achtung.powerups[Math.floor(Math.random() * (achtung.powerups.length))]
        const snakes = ['fred','greenlee','pinkney','bluebell','willem','greydon'];
        for (let snake of snakes) {
            // snake?
            // random number between 0 and 5
            console.log('snake', snake)
            const random = Math.floor(Math.random() * 6);
            const newSnake = snakes[random];
            console.log('newSnake', newSnake)
            players[snake].color = getComputedStyle(document.documentElement).getPropertyValue(`--${newSnake}`)
            
        }

        /*

        .fred {
        color: var(--fred);
        }

        .greenlee {
        color: var(--greenlee);
        }

        .pinkney {
        color: var(--pinkney);
        }

        .bluebell {
        color: var(--bluebell);
        }

        .willem {
        color: var(--willem);
        }

        .greydon {
        color: var(--greydon);
        }
        */

    }
    if (powName == "g_slow") {
        players[puPlayer].powerup.speed *= 0.5
        players[puPlayer].powerup.toClear[index] = setTimeout(() => players[puPlayer].powerup.speed *= 2, gTimeout)
    }
    if (powName == "g_fast") {
        players[puPlayer].powerup.speed *= 2
        players[puPlayer].powerup.toClear[index] = setTimeout(() => players[puPlayer].powerup.speed *= 0.5, gTimeout)
    }
    if (powName == "g_thin") {
        players[puPlayer].powerup.size *= 0.5
        players[puPlayer].powerup.toClear[index] = setTimeout(() => players[puPlayer].powerup.size *= 2, gTimeout)
    }
    if (powName == "g_robot") {
        players[puPlayer].powerup.robot++
            players[puPlayer].powerup.toClear[index] = setTimeout(() => players[puPlayer].powerup.robot--, gTimeout)
    }
    if (powName == "g_side") {
        players[puPlayer].powerup.side++
            players[puPlayer].powerup.toClear[index] = setTimeout(() => players[puPlayer].powerup.side--, gTimeout)
    }
    if (powName == "g_invisible") {
        players[puPlayer].powerup.invisible++
            players[puPlayer].powerup.toClear[index] = setTimeout(() => players[puPlayer].powerup.invisible--, gTimeout)
    }
    if (powName == "r_slow") {
        for (const otherPlayers in players) {
            if (otherPlayers != puPlayer) {
                players[otherPlayers].powerup.speed *= 0.5
                players[otherPlayers].powerup.toClear[index] = setTimeout(() => players[otherPlayers].powerup.speed *= 2, rTimeout)
            }
        }
    }
    if (powName == "r_fast") {
        for (const otherPlayers in players) {
            if (otherPlayers != puPlayer) {
                players[otherPlayers].powerup.speed *= 2
                players[otherPlayers].powerup.toClear[index] = setTimeout(() => players[otherPlayers].powerup.speed *= 0.5, rTimeout)
            }
        }
    }
    if (powName == "r_thick") {
        for (const otherPlayers in players) {
            if (otherPlayers != puPlayer) {
                players[otherPlayers].powerup.size *= 2
                players[otherPlayers].powerup.toClear[index] = setTimeout(() => players[otherPlayers].powerup.size *= 0.5, rTimeout)
            }
        }
    }
    if (powName == "r_robot") {
        for (const otherPlayers in players) {
            if (otherPlayers != puPlayer) {
                players[otherPlayers].powerup.robot++
                    players[otherPlayers].powerup.toClear[index] = setTimeout(() => players[otherPlayers].powerup.robot--, rTimeout)
            }
        }
    }
    if (powName == "r_reverse") {
        for (const otherPlayers in players) {
            if (otherPlayers != puPlayer) {
                players[otherPlayers].powerup.reverse++
                    players[otherPlayers].powerup.toClear[index] = setTimeout(() => players[otherPlayers].powerup.reverse--, rTimeout)
            }
        }
    }
    if (powName == "b_clear") {
        ctxTH.clearRect(0, 0, h, h)
    }
    if (powName == "b_more") {
        setTimeout(powerupSpawner, 100)
        setTimeout(powerupSpawner, 200)
        setTimeout(powerupSpawner, 300)
    }
    if (powName == "b_sides") {
        achtung.sides++
            achtung.clearSides = setTimeout(() => achtung.sides--, gTimeout)
    }
}

//updates the achtung object with data of a new powerup
const powerupSpawner = () => {
    if (achtung.powerupsOnScreen.length > 30) return //if already 30 powerups on screen, return

    let newPow = Math.floor(Math.random() * (achtung.powerups.length)),
        spawnX = Math.floor(Math.random() * h),
        spawnY = Math.floor(Math.random() * h),
        powup = achtung.powerups[newPow]
        //powup = "r_reverse" // apklsdjalskdjalksdjlaksjdlakfjlæanæoæiuanweifupnaweifunaewæfnakdnfkalsjdfnklajsdfnkaljdnfklajnsdfklajnsdfkajdsnfkajdsnflakjdnf

    achtung.powerupsOnScreen[achtung.powerupsOnScreen.length] = {}
    achtung.powerupsOnScreen[achtung.powerupsOnScreen.length - 1].pow = powup
    achtung.powerupsOnScreen[achtung.powerupsOnScreen.length - 1].xPos = spawnX
    achtung.powerupsOnScreen[achtung.powerupsOnScreen.length - 1].yPos = spawnY

    //powerupIndex++

    powerupDraw()
}

//draws powerups to canvas
const powerupDraw = () => {
    ctxPV.clearRect(0, 0, w, h)
    ctxPH.clearRect(0, 0, w, h)

    for (let i = 0; i < achtung.powerupsOnScreen.length; i++) {
        if (achtung.powerupsOnScreen[i] == 0) continue

        let pow = achtung.powerupsOnScreen[i].pow,
            spawnX = achtung.powerupsOnScreen[i].xPos,
            spawnY = achtung.powerupsOnScreen[i].yPos

        //if loaded by img
        // let iconImg = new Image()
        // iconImg.addEventListener('load', function() {
        //     ctxPV.drawImage(iconImg, Math.round(spawnX - iconSize), Math.round(spawnY - iconSize), iconSize * 2, iconSize * 2)
        // }, false);
        // iconImg.src = `img/${pow}.svg`


        //draw hitbox
        ctxPH.fillStyle = `rgba(${i * 3 + 3}, ${i * 3 + 2}, ${i * 3 + 1}, 1)`
        ctxPH.beginPath()
        ctxPH.arc(spawnX, spawnY, iconSize, 0, r2d(360), false)
        ctxPH.fill()


        let greenGrad = ctxPV.createRadialGradient(0, 0, 0, 0, 0, iconSize)
        greenGrad.addColorStop(0, green)
        greenGrad.addColorStop(1, greent)
        let redGrad = ctxPV.createRadialGradient(0, 0, 0, 0, 0, iconSize)
        redGrad.addColorStop(0, red)
        redGrad.addColorStop(1, redt)
        let blueGrad = ctxPV.createRadialGradient(0, 0, 0, 0, 0, iconSize)
        blueGrad.addColorStop(0, blue)
        blueGrad.addColorStop(1, bluet)


        ctxPV.save()
        ctxPV.translate(spawnX, spawnY)

        ctxPV.fillStyle = "#000000"
        ctxPV.beginPath()
        ctxPV.arc(0, 0, iconSize, 0, r2d(360), false)
        ctxPV.fill()

        if (pow.charAt(0) == "g") {
            ctxPV.strokeStyle = green
            ctxPV.fillStyle = greenGrad
        }
        if (pow.charAt(0) == "r") {
            ctxPV.strokeStyle = red
            ctxPV.fillStyle = redGrad
        }
        if (pow.charAt(0) == "b") {
            ctxPV.strokeStyle = blue
            ctxPV.fillStyle = blueGrad
        }
        if (pow.charAt(0) == "g" || pow.charAt(0) == "r" || pow.charAt(0) == "b") { //draw bg
            ctxPV.beginPath()
            ctxPV.arc(0, 0, iconSize, 0, r2d(360), false)
            ctxPV.stroke()
            ctxPV.beginPath()
            ctxPV.arc(0, 0, iconSize, 0, r2d(360), false)
            ctxPV.fill()
        } else { //draw random bg
            ctxPV.strokeStyle = blue
            ctxPV.beginPath()
            ctxPV.arc(0, 0, iconSize, 0, r2d(360), false)
            ctxPV.stroke()

            let line1 = [-65, -200]
            let line2 = [-15, -250]

            //draw blue section of bg
            ctxPV.beginPath()
            ctxPV.fillStyle = blueGrad
            ctxPV.arc(0, 0, iconSize, r2d(line1[0]), r2d(line1[1]), true)
            ctxPV.moveTo(Math.cos(r2d(line1[1])) * iconSize, Math.sin(r2d(line1[1])) * iconSize)
            ctxPV.lineTo(Math.cos(r2d(line1[0])) * iconSize, Math.sin(r2d(line1[0])) * iconSize)
            ctxPV.fill()

            //draw red section of bg
            ctxPV.beginPath()
            ctxPV.fillStyle = redGrad
            ctxPV.arc(0, 0, iconSize, r2d(line2[0]), r2d(line1[0]), true)
            ctxPV.moveTo(Math.cos(r2d(line1[0])) * iconSize, Math.sin(r2d(line1[0])) * iconSize)
            ctxPV.lineTo(Math.cos(r2d(line1[1])) * iconSize, Math.sin(r2d(line1[1])) * iconSize)
            ctxPV.arc(0, 0, iconSize, r2d(line1[1]), r2d(line2[1]), true)
            ctxPV.lineTo(Math.cos(r2d(line2[0])) * iconSize, Math.sin(r2d(line2[0])) * iconSize)
            ctxPV.fill()

            //draw green section of bg
            ctxPV.beginPath()
            ctxPV.fillStyle = greenGrad
            ctxPV.arc(0, 0, iconSize, r2d(line2[1]), r2d(line2[0]), true)
            ctxPV.moveTo(Math.cos(r2d(line2[0])) * iconSize, Math.sin(r2d(line2[0])) * iconSize)
            ctxPV.lineTo(Math.cos(r2d(line2[1])) * iconSize, Math.sin(r2d(line2[1])) * iconSize)
            ctxPV.fill()
        }

        //draw yellow icon
        drawPowerupIcons(pow.slice(2))

        ctxPV.restore()

    }
}

//capitalize string
const capitalize = (s) => {
    if (typeof s !== 'string') return ''
    return s.charAt(0).toUpperCase() + s.slice(1)
}

//returns n rounded to .00
const round100 = (n) => { return Math.round(n * 100) / 100 }

//returns n round mathCos and mathSin
const mathCos = (n) => { return round100(Math.cos(n)) }
const mathSin = (n) => { return round100(Math.sin(n)) }

//returns pixel index for alpha value in raw pixel data array
const getAlphaIndexForCoord = (x, y, width) => { return y * (width * 4) + x * 4 + 3 }

//returns radians from degree input
const r2d = (deg) => { return ((Math.PI * 2) / 360) * deg }

//calc random start direction
function calcRandomStartDir() {
    for (const player in players) {
        players[player].dir = round100(Math.random() * Math.PI * 2)
    }
}

//calc random start position x and y
function calcRandomStartPos() {
    for (const player in players) {
        players[player].x = map(calcRandomInt(h), 0, h, borderWidth * 10, h - (borderWidth * 10)) //map to avoid instant death
        players[player].y = map(calcRandomInt(h), 0, h, borderWidth * 10, h - (borderWidth * 10)) //map to avoid instant death
    }
}

//returns random int from 0 to n
const calcRandomInt = (int) => { return Math.floor(Math.random() * int) }

//returns n mapped from start1-stop1 to start2-stop2
const map = (n, start1, stop1, start2, stop2) => { return (n - start1) / (stop1 - start1) * (stop2 - start2) + start2 }

newSize() // calc initial values
init() // start init