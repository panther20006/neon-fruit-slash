/* =====================================================
   ELEMENTS
===================================================== */

const game =
    document.getElementById("game");

const video =
    document.getElementById("video");

const statusText =
    document.getElementById("status");

const handCursor =
    document.getElementById("handCursor");

const scoreText =
    document.getElementById("score");

const comboNumber =
    document.getElementById("combo");

const livesText =
    document.getElementById("lives");

const comboText =
    document.getElementById("comboText");


/* =====================================================
   GAME VARIABLES
===================================================== */

let gameRunning = false;

let score = 0;

let lives = 3;

let combo = 0;

let objects = [];

let lastSpawn = 0;

let lastTime = performance.now();


/*
   Fruit frequency.

   Higher = slower spawning.
*/

const spawnDelay = 1250;


/* =====================================================
   HAND VARIABLES
===================================================== */

let handDetected = false;

let handX = 0;

let handY = 0;

let previousHandX = 0;

let previousHandY = 0;

let missingFrames = 0;

let lastSlashTime = 0;

let trackingBusy = false;


/* =====================================================
   START GAME
===================================================== */

document
    .getElementById("startButton")
    .addEventListener(
        "click",
        startGame
    );


async function startGame(){

    document
        .getElementById("startScreen")
        .style.display = "none";


    gameRunning = true;

    score = 0;

    lives = 3;

    combo = 0;

    objects = [];

    updateHUD();


    /*
       Start some fruits immediately.
    */

    spawnObject();

    setTimeout(
        spawnObject,
        500
    );

    setTimeout(
        spawnObject,
        1000
    );


    lastSpawn =
        performance.now();


    lastTime =
        performance.now();


    requestAnimationFrame(
        gameLoop
    );


    startCamera();
}


/* =====================================================
   CAMERA
===================================================== */

async function startCamera(){

    try{

        const stream =
            await navigator
                .mediaDevices
                .getUserMedia({

                    video:{
                        width:1280,
                        height:720,
                        facingMode:"user"
                    },

                    audio:false

                });


        video.srcObject =
            stream;


        await video.play();


        statusText.innerText =
            "✋ SHOW YOUR HAND";


        startHandTracking();

    }
    catch(error){

        console.error(
            "Camera error:",
            error
        );


        statusText.innerText =
            "⚠ CAMERA BLOCKED";

    }
}


/* =====================================================
   MEDIAPIPE HANDS
===================================================== */

let hands = null;

let handsReady = false;


if(
    typeof Hands !== "undefined"
){

    hands =
        new Hands({

            locateFile:
                function(file){

                    return (
                        "https://cdn.jsdelivr.net/npm/" +
                        "@mediapipe/hands/" +
                        file
                    );

                }

        });


    hands.setOptions({

        maxNumHands:1,

        modelComplexity:0,

        minDetectionConfidence:.4,

        minTrackingConfidence:.4

    });


    hands.onResults(
        onHandResults
    );


    handsReady = true;

}
else{

    console.error(
        "MediaPipe failed to load."
    );

}


/* =====================================================
   HAND TRACKING
===================================================== */

async function startHandTracking(){

    if(!handsReady){

        statusText.innerText =
            "MEDIAPIPE NOT LOADED";

        return;
    }


    async function trackingLoop(){

        if(
            video.readyState >= 2 &&
            !trackingBusy
        ){

            trackingBusy = true;


            try{

                await hands.send({
                    image:video
                });

            }
            catch(error){

                console.error(
                    "Hand tracking error:",
                    error
                );

            }


            trackingBusy = false;

        }


        requestAnimationFrame(
            trackingLoop
        );

    }


    trackingLoop();
}


/* =====================================================
   HAND RESULT
===================================================== */

function onHandResults(results){

    if(
        !results.multiHandLandmarks ||
        results.multiHandLandmarks.length === 0
    ){

        missingFrames++;


        /*
           Don't immediately hide
           cursor if tracking loses
           the hand for a frame.
        */

        if(
            missingFrames > 15
        ){

            handDetected = false;

            handCursor.style.display =
                "none";

            statusText.innerText =
                "✋ SHOW YOUR HAND";

        }

        return;
    }


    missingFrames = 0;

    handDetected = true;


    const landmarks =
        results.multiHandLandmarks[0];


    /*
       Landmark 8 =
       index finger tip.
    */

    const tip =
        landmarks[8];


    /*
       Mirror X.
    */

    const x =
        (1 - tip.x) *
        window.innerWidth;


    const y =
        tip.y *
        window.innerHeight;


    previousHandX =
        handX;

    previousHandY =
        handY;


    handX = x;

    handY = y;


    /*
       Hand cursor.
    */

    handCursor.style.display =
        "block";

    handCursor.style.left =
        x + "px";

    handCursor.style.top =
        y + "px";


    statusText.innerText =
        "✋ HAND DETECTED";


    /*
       Detect finger movement.
    */

    if(
        previousHandX !== 0
    ){

        const dx =
            handX -
            previousHandX;

        const dy =
            handY -
            previousHandY;


        const distance =
            Math.hypot(
                dx,
                dy
            );


        /*
           Finger movement
           creates slash.
        */

        if(
            distance > 3
        ){

            createSlash(
                previousHandX,
                previousHandY,
                handX,
                handY
            );


            checkCuts(
                previousHandX,
                previousHandY,
                handX,
                handY
            );

        }

    }
}


/* =====================================================
   SPAWN FRUIT / BOMB
===================================================== */

function spawnObject(){

    if(!gameRunning)
        return;


    const element =
        document.createElement("div");


    /*
       18% chance of bomb.
    */

    const isBomb =
        Math.random() < .18;


    if(isBomb){

        element.className =
            "object bomb";

        element.innerText =
            "💣";

    }
    else{

        element.className =
            "object";


        const fruits = [

            "🍉",
            "🍎",
            "🍊",
            "🍌",
            "🍓",
            "🥝",
            "🍍",
            "🍑"

        ];


        element.innerText =
            fruits[
                Math.floor(
                    Math.random() *
                    fruits.length
                )
            ];

    }


    /*
       Horizontal position.
    */

    const x =
        70 +
        Math.random() *
        (
            window.innerWidth -
            140
        );


    /*
       IMPORTANT:

       Fruit starts inside the screen,
       not far below the screen.
    */

    const y =
        window.innerHeight -
        110;


    element.style.left =
        x + "px";

    element.style.top =
        y + "px";


    game.appendChild(
        element
    );


    /*
       PHYSICS

       -10 = upward speed

       .20 = gravity

       This makes the fruit:

       bottom
          ↑
       middle
          ↑
       high
          ↓
       middle
          ↓
       bottom
    */

    const object = {

        element:element,

        x:x,

        y:y,

        vx:
            (Math.random() - .5) *
            1.2,

        vy:
            -10 -
            Math.random() * 1.5,

        gravity:.20,

        rotation:
            Math.random() *
            360,

        rotationSpeed:
            (Math.random() - .5) *
            4,

        bomb:isBomb,

        dead:false

    };


    objects.push(
        object
    );
}


/* =====================================================
   GAME LOOP
===================================================== */

function gameLoop(time){

    if(!gameRunning)
        return;


    let dt =
        (time - lastTime) /
        16.67;


    dt =
        Math.min(
            dt,
            1.5
        );


    lastTime =
        time;


    /*
       Spawn new object.
    */

    if(
        time - lastSpawn >
        spawnDelay
    ){

        spawnObject();

        lastSpawn =
            time;

    }


    /*
       Update all objects.
    */

    for(
        let i = objects.length - 1;
        i >= 0;
        i--
    ){

        const object =
            objects[i];


        if(
            object.dead
        )
            continue;


        /*
           Gravity.
        */

        object.vy +=
            object.gravity *
            dt;


        /*
           Movement.

           Reduced horizontal speed.
        */

        object.x +=
            object.vx *
            dt *
            1.3;


        object.y +=
            object.vy *
            dt *
            1.3;


        /*
           Rotation.
        */

        object.rotation +=
            object.rotationSpeed *
            dt;


        /*
           Horizontal bounce.
        */

        if(
            object.x < 45 ||
            object.x >
            window.innerWidth - 45
        ){

            object.vx *= -1;

        }


        /*
           Render object.
        */

        object.element.style.left =
            object.x + "px";

        object.element.style.top =
            object.y + "px";

        object.element.style.transform =
            `
            translate(-50%,-50%)
            rotate(${object.rotation}deg)
            `;


        /*
           Remove after
           leaving bottom.
        */

        if(
            object.y >
            window.innerHeight + 100
        ){

            removeObject(i);

        }

    }


    requestAnimationFrame(
        gameLoop
    );
}


/* =====================================================
   REMOVE OBJECT
===================================================== */

function removeObject(index){

    const object =
        objects[index];


    if(
        object &&
        object.element
    ){

        object.element.remove();

    }


    objects.splice(
        index,
        1
    );
}


/* =====================================================
   DISTANCE FROM LINE
===================================================== */

function distanceToLine(
    px,
    py,
    x1,
    y1,
    x2,
    y2
){

    const dx =
        x2 - x1;

    const dy =
        y2 - y1;


    if(
        dx === 0 &&
        dy === 0
    ){

        return Math.hypot(
            px - x1,
            py - y1
        );

    }


    let t =
        (
            (px - x1) * dx +
            (py - y1) * dy
        )
        /
        (
            dx * dx +
            dy * dy
        );


    t =
        Math.max(
            0,
            Math.min(
                1,
                t
            )
        );


    const closestX =
        x1 +
        t * dx;

    const closestY =
        y1 +
        t * dy;


    return Math.hypot(
        px - closestX,
        py - closestY
    );
}


/* =====================================================
   CHECK CUT
===================================================== */

function checkCuts(
    x1,
    y1,
    x2,
    y2
){

    const now =
        performance.now();


    /*
       Prevent repeated hit
       in same instant.
    */

    if(
        now - lastSlashTime <
        45
    )
        return;


    lastSlashTime =
        now;


    objects.forEach(
        function(object){

            if(
                object.dead
            )
                return;


            const distance =
                distanceToLine(
                    object.x,
                    object.y,
                    x1,
                    y1,
                    x2,
                    y2
                );


            if(
                distance < 60
            ){

                hitObject(
                    object
                );

            }

        }
    );
}


/* =====================================================
   HIT OBJECT
===================================================== */

function hitObject(object){

    if(
        object.dead
    )
        return;


    object.dead = true;


    /*
       BOMB
    */

    if(
        object.bomb
    ){

        lives--;

        combo = 0;


        createParticles(
            object.x,
            object.y,
            true
        );


        object.element.remove();


        objects =
            objects.filter(
                item =>
                    item !== object
            );


        statusText.innerText =
            "💣 BOMB HIT!";


        updateHUD();


        if(
            lives <= 0
        ){

            endGame();

        }


        return;
    }


    /*
       FRUIT
    */

    combo++;


    const multiplier =
        Math.min(
            combo,
            5
        );


    score +=
        10 * multiplier;


    comboNumber.innerText =
        "x" + multiplier;


    /*
       Combo display.
    */

    if(
        combo >= 2
    ){

        comboText.innerText =
            "🔥 COMBO x" +
            combo;


        comboText.classList.add(
            "show"
        );


        setTimeout(
            function(){

                comboText.classList.remove(
                    "show"
                );

            },
            500
        );

    }


    createParticles(
        object.x,
        object.y,
        false
    );


    object.element.remove();


    objects =
        objects.filter(
            item =>
                item !== object
        );


    updateHUD();
}


/* =====================================================
   PARTICLES
===================================================== */

function createParticles(
    x,
    y,
    bomb
){

    const count =
        bomb
            ? 25
            : 12;


    for(
        let i = 0;
        i < count;
        i++
    ){

        const particle =
            document.createElement(
                "div"
            );


        particle.className =
            "particle";


        particle.style.left =
            x + "px";

        particle.style.top =
            y + "px";


        particle.style.setProperty(
            "--dx",
            (
                (Math.random() - .5) *
                180
            ) + "px"
        );


        particle.style.setProperty(
            "--dy",
            (
                (Math.random() - .5) *
                180
            ) + "px"
        );


        if(
            bomb
        ){

            particle.style.background =
                "#ff3158";

        }


        game.appendChild(
            particle
        );


        setTimeout(
            function(){

                particle.remove();

            },
            650
        );

    }
}


/* =====================================================
   SLASH
===================================================== */

function createSlash(
    x1,
    y1,
    x2,
    y2
){

    const line =
        document.createElement(
            "div"
        );


    line.className =
        "slash";


    const dx =
        x2 - x1;

    const dy =
        y2 - y1;


    const length =
        Math.hypot(
            dx,
            dy
        );


    const angle =
        Math.atan2(
            dy,
            dx
        ) *
        180 /
        Math.PI;


    line.style.left =
        x1 + "px";

    line.style.top =
        y1 + "px";

    line.style.width =
        length + "px";

    line.style.transform =
        `rotate(${angle}deg)`;


    game.appendChild(
        line
    );


    setTimeout(
        function(){

            line.remove();

        },
        230
    );
}


/* =====================================================
   HUD
===================================================== */

function updateHUD(){

    scoreText.innerText =
        score;


    comboNumber.innerText =
        "x" +
        Math.max(
            1,
            Math.min(
                combo,
                5
            )
        );


    livesText.innerText =
        "❤️".repeat(
            Math.max(
                0,
                lives
            )
        );
}


/* =====================================================
   GAME OVER
===================================================== */

function endGame(){

    gameRunning =
        false;


    document
        .getElementById("finalScore")
        .innerText =
        score;


    document
        .getElementById("gameOver")
        .style.display =
        "flex";
}


/* =====================================================
   RESTART
===================================================== */

document
    .getElementById("restartButton")
    .addEventListener(
        "click",
        function(){

            objects.forEach(
                function(object){

                    if(
                        object.element
                    ){

                        object.element.remove();

                    }

                }
            );


            objects = [];

            score = 0;

            lives = 3;

            combo = 0;


            handDetected = false;

            handX = 0;

            handY = 0;

            previousHandX = 0;

            previousHandY = 0;


            lastTime =
                performance.now();


            updateHUD();


            document
                .getElementById("gameOver")
                .style.display =
                "none";


            gameRunning = true;


            spawnObject();

            setTimeout(
                spawnObject,
                500
            );

            setTimeout(
                spawnObject,
                1000
            );


            lastSpawn =
                performance.now();


            requestAnimationFrame(
                gameLoop
            );

        }
    );


/* =====================================================
   MOUSE FALLBACK
===================================================== */

let mouseDown = false;

let mouseX = 0;

let mouseY = 0;


document.addEventListener(
    "mousedown",
    function(event){

        mouseDown = true;

        mouseX =
            event.clientX;

        mouseY =
            event.clientY;

    }
);


document.addEventListener(
    "mouseup",
    function(){

        mouseDown = false;

    }
);


document.addEventListener(
    "mousemove",
    function(event){

        if(
            !mouseDown ||
            !gameRunning
        )
            return;


        createSlash(
            mouseX,
            mouseY,
            event.clientX,
            event.clientY
        );


        checkCuts(
            mouseX,
            mouseY,
            event.clientX,
            event.clientY
        );


        mouseX =
            event.clientX;

        mouseY =
            event.clientY;

    }
);


/* =====================================================
   INITIAL HUD
===================================================== */

updateHUD();