<<<<<<< HEAD
const video = document.getElementById("camera");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const startScreen = document.getElementById("startScreen");
const gameOver = document.getElementById("gameOver");

const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

const finger = document.getElementById("finger");

const scoreBox = document.getElementById("score");
const livesBox = document.getElementById("lives");
const finalScore = document.getElementById("finalScore");


/* =========================================
   CANVAS
========================================= */

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

resizeCanvas();

window.addEventListener("resize", resizeCanvas);


/* =========================================
   GAME VARIABLES
========================================= */

let gameRunning = false;

let score = 0;
let lives = 3;

let fruits = [];

let lastSpawn = 0;
let lastFrame = 0;


/* =========================================
   HAND VARIABLES
========================================= */

let handDetected = false;

let handX = 0;
let handY = 0;

let smoothX = 0;
let smoothY = 0;

let previousX = 0;
let previousY = 0;

let trackingBusy = false;
let lastTracking = 0;


/* =========================================
   START GAME
========================================= */

startBtn.addEventListener("click", async () => {

    startScreen.style.display = "none";

    gameRunning = true;

    score = 0;
    lives = 3;

    fruits = [];

    smoothX = 0;
    smoothY = 0;

    handX = 0;
    handY = 0;

    previousX = 0;
    previousY = 0;

    updateHUD();


    /*
       Start with objects.
    */

    spawnFruit();
    spawnFruit();
    spawnFruit();


    lastFrame = performance.now();
    lastSpawn = performance.now();


    requestAnimationFrame(gameLoop);


    /*
       Start camera.
    */

    try {

        await startCamera();

    } catch (error) {

        console.error(
            "Camera error:",
            error
        );
    }
});


/* =========================================
   CAMERA
========================================= */

async function startCamera() {

    if (!navigator.mediaDevices) {

        throw new Error(
            "Camera API unavailable"
        );
    }


    const stream =
        await navigator.mediaDevices.getUserMedia({

            video: {

                width: {
                    ideal: 1280
                },

                height: {
                    ideal: 720
                },

                facingMode: "user"
            },

            audio: false
        });


    video.srcObject = stream;

    await video.play();

    startHandTracking();
}


/* =========================================
   MEDIAPIPE
========================================= */

const hands = new Hands({

    locateFile: function(file) {

        return (
            "https://cdn.jsdelivr.net/npm/" +
            "@mediapipe/hands/" +
            file
        );
    }
});


hands.setOptions({

    /*
       One hand = faster.
    */

    maxNumHands: 1,

    /*
       Faster model.
    */

    modelComplexity: 0,

    /*
       Easier detection.
    */

    minDetectionConfidence: 0.40,

    minTrackingConfidence: 0.40
});


hands.onResults(onHandResults);


/* =========================================
   HAND TRACKING
========================================= */

function startHandTracking() {

    function trackingLoop(time) {

        /*
           Around 30 FPS.
        */

        if (
            time - lastTracking > 30 &&
            !trackingBusy &&
            video.readyState >= 2
        ) {

            lastTracking = time;

            trackingBusy = true;


            hands.send({
                image: video
            })

            .catch(error => {

                console.log(
                    "Hand tracking error:",
                    error
                );

            })

            .finally(() => {

                trackingBusy = false;

            });
        }


        requestAnimationFrame(
            trackingLoop
        );
    }


    requestAnimationFrame(
        trackingLoop
    );
}


/* =========================================
   HAND RESULTS
========================================= */

function onHandResults(results) {

    if (
        !results.multiHandLandmarks ||
        results.multiHandLandmarks.length === 0
    ) {

        handDetected = false;

        return;
    }


    handDetected = true;


    const landmarks =
        results.multiHandLandmarks[0];


    /*
       Index finger tip
       Landmark 8.
    */

    const indexTip =
        landmarks[8];


    /*
       Index finger joints.
    */

    const indexMCP =
        landmarks[5];

    const indexPIP =
        landmarks[6];


    /*
       Check index finger.
    */

    const indexLength =
        Math.hypot(

            indexTip.x -
            indexMCP.x,

            indexTip.y -
            indexMCP.y

        );


    const pipLength =
        Math.hypot(

            indexPIP.x -
            indexMCP.x,

            indexPIP.y -
            indexMCP.y

        );


    const indexExtended =
        indexLength >
        pipLength * 1.10;


    /*
       If index finger isn't
       extended, don't cut.
    */

    if (!indexExtended) {

        return;
    }


    /*
       Convert camera position
       to screen position.
    */

    const targetX =
        (1 - indexTip.x) *
        canvas.width;


    const targetY =
        indexTip.y *
        canvas.height;


    /*
       Smooth tracking.
    */

    if (smoothX === 0) {

        smoothX = targetX;
        smoothY = targetY;

    } else {

        smoothX +=
            (targetX - smoothX) *
            0.42;

        smoothY +=
            (targetY - smoothY) *
            0.42;
    }


    previousX = handX;
    previousY = handY;


    handX = smoothX;
    handY = smoothY;


    /*
       Finger cursor.
    */

    finger.style.display =
        "block";

    finger.style.left =
        handX + "px";

    finger.style.top =
        handY + "px";


    /*
       Movement.
    */

    if (previousX !== 0) {

        const movement =
            Math.hypot(

                handX - previousX,

                handY - previousY

            );


        if (movement > 3) {

            /*
               Draw slash.
            */

            drawSlash(

                previousX,
                previousY,

                handX,
                handY

            );


            /*
               Check cutting.
            */

            checkCut(

                previousX,
                previousY,

                handX,
                handY

            );
        }
    }
}


/* =========================================
   SPAWN FRUIT / BOMB
========================================= */

function spawnFruit() {

    if (!gameRunning) {
        return;
    }


    /*
       30% bomb.
    */

    const isBomb =
        Math.random() < 0.30;


    const fruitNames = [

        "🍎",
        "🍊",
        "🍉",
        "🍌",
        "🍓",
        "🍍"

    ];


    const emoji =

        isBomb

            ? "💣"

            : fruitNames[
                Math.floor(
                    Math.random() *
                    fruitNames.length
                )
            ];


    /*
       START FROM BOTTOM.
    */

    fruits.push({

        x:
            70 +
            Math.random() *
            (
                canvas.width - 140
            ),

        y:
            canvas.height + 60,


        /*
           Slight horizontal movement.
        */

        vx:
            (
                Math.random() - 0.5
            ) * 1.8,


        /*
           FAST UPWARD SPEED.
        */

        vy:
            -18 -
            Math.random() * 3,


        /*
           Gravity.

           Up -> slow -> down.
        */

        gravity:
            0.30,


        emoji:
            emoji,


        bomb:
            isBomb,


        radius:
            50,


        rotation:
            0,


        rotationSpeed:
            (
                Math.random() - 0.5
            ) * 3
    });
}


/* =========================================
   GAME LOOP
========================================= */

function gameLoop(time) {

    if (!gameRunning) {
        return;
    }


    let delta =
        (time - lastFrame) / 16.67;


    /*
       Prevent huge jumps.
    */

    delta =
        Math.min(
            delta,
            1.4
        );


    lastFrame = time;


    /*
       New fruit every 1.2 sec.
    */

    if (
        time - lastSpawn > 1000
    ) {

        spawnFruit();

        lastSpawn = time;
    }


    /*
       Clear canvas.
    */

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    /*
       Update objects.
    */

    for (
        let i = fruits.length - 1;
        i >= 0;
        i--
    ) {

        const fruit =
            fruits[i];


        /*
           Gravity.
        */

        fruit.vy +=
            fruit.gravity * delta;


        /*
           Position.
        */

        fruit.x +=
            fruit.vx * delta;

        fruit.y +=
            fruit.vy * delta;


        /*
           Rotation.
        */

        fruit.rotation +=
            fruit.rotationSpeed * delta;


        /*
           Side bounce.
        */

        if (
            fruit.x < 45 ||
            fruit.x >
            canvas.width - 45
        ) {

            fruit.vx *= -1;
        }


        /*
           Draw.
        */

        ctx.save();


        ctx.translate(
            fruit.x,
            fruit.y
        );


        ctx.rotate(
            fruit.rotation *
            Math.PI /
            180
        );


        ctx.font =
            "64px Arial";


        ctx.textAlign =
            "center";


        ctx.textBaseline =
            "middle";


        /*
           Bomb glow.
        */

        if (fruit.bomb) {

            ctx.shadowBlur =
                25;

            ctx.shadowColor =
                "red";
        }


        ctx.fillText(
            fruit.emoji,
            0,
            0
        );


        ctx.restore();


        /*
           Remove when below screen.
        */

        if (
            fruit.y >
            canvas.height + 120
        ) {

            fruits.splice(
                i,
                1
            );
        }
    }


    requestAnimationFrame(
        gameLoop
    );
}


/* =========================================
   CUT DETECTION
========================================= */

function checkCut(
    x1,
    y1,
    x2,
    y2
) {

    for (
        let i = fruits.length - 1;
        i >= 0;
        i--
    ) {

        const fruit =
            fruits[i];


        const distance =
            pointToLineDistance(

                fruit.x,
                fruit.y,

                x1,
                y1,

                x2,
                y2
            );


        if (
            distance <
            fruit.radius
        ) {

            hitFruit(
                fruit,
                i
            );
        }
    }
}


/* =========================================
   POINT TO LINE DISTANCE
========================================= */

function pointToLineDistance(
    px,
    py,
    x1,
    y1,
    x2,
    y2
) {

    const dx =
        x2 - x1;

    const dy =
        y2 - y1;


    if (
        dx === 0 &&
        dy === 0
    ) {

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
        x1 + t * dx;


    const closestY =
        y1 + t * dy;


    return Math.hypot(
        px - closestX,
        py - closestY
    );
}


/* =========================================
   HIT
========================================= */

function hitFruit(
    fruit,
    index
) {

    /*
       Remove immediately.
    */

    fruits.splice(
        index,
        1
    );


    /* =====================================
       BOMB
    ===================================== */

    if (fruit.bomb) {

        lives--;


        /*
           💣 STRONG VIBRATION
        */

        vibrateBomb();


        /*
           💥 EXPLOSION
        */

        createExplosion(
            fruit.x,
            fruit.y
        );


        updateHUD();


        if (lives <= 0) {

            endGame();
        }


        return;
    }


    /* =====================================
       NORMAL FRUIT
    ===================================== */

    score += 10;


    /*
       Small vibration.
    */

    vibrateFruit();


    /*
       Cut animation.
    */

    createCutEffect(

        fruit.x,
        fruit.y,

        fruit.emoji

    );


    updateHUD();
}


/* =========================================
   NORMAL FRUIT VIBRATION
========================================= */

function vibrateFruit() {

    if (
        "vibrate" in navigator
    ) {

        navigator.vibrate(35);
    }
}


/* =========================================
   💣 BOMB VIBRATION
========================================= */

function vibrateBomb() {

    if (
        "vibrate" in navigator
    ) {

        /*
           Strong vibration pattern.
        */

        navigator.vibrate([

            200,
            80,
            200,
            80,
            300

        ]);
    }
}


/* =========================================
   SLASH
========================================= */

function drawSlash(
    x1,
    y1,
    x2,
    y2
) {

    ctx.save();


    ctx.beginPath();


    ctx.moveTo(
        x1,
        y1
    );


    ctx.lineTo(
        x2,
        y2
    );


    ctx.strokeStyle =
        "#00ff66";


    ctx.lineWidth =
        7;


    ctx.lineCap =
        "round";


    ctx.shadowBlur =
        22;


    ctx.shadowColor =
        "#00ff66";


    ctx.stroke();


    ctx.restore();
}


/* =========================================
   CUT EFFECT
========================================= */

function createCutEffect(
    x,
    y,
    emoji
) {

    let life = 1;


    function animate() {

        ctx.save();


        ctx.globalAlpha =
            life;


        ctx.font =
            "36px Arial";


        ctx.textAlign =
            "center";


        /*
           Left piece.
        */

        ctx.fillText(

            emoji,

            x -
            (1 - life) * 55,

            y -
            (1 - life) * 20

        );


        /*
           Right piece.
        */

        ctx.fillText(

            emoji,

            x +
            (1 - life) * 55,

            y -
            (1 - life) * 20

        );


        ctx.restore();


        life -= 0.07;


        if (life > 0) {

            requestAnimationFrame(
                animate
            );
        }
    }


    animate();
}


/* =========================================
   💥 BOMB EXPLOSION
========================================= */

function createExplosion(
    x,
    y
) {

    let radius = 10;
    let alpha = 1;


    function animate() {

        ctx.save();


        /*
           Outer explosion.
        */

        ctx.beginPath();


        ctx.arc(

            x,
            y,

            radius,

            0,
            Math.PI * 2

        );


        ctx.strokeStyle =
            `rgba(255,40,40,${alpha})`;


        ctx.lineWidth =
            10;


        ctx.shadowBlur =
            35;


        ctx.shadowColor =
            "red";


        ctx.stroke();


        /*
           Inner explosion.
        */

        ctx.beginPath();


        ctx.arc(

            x,
            y,

            radius * 0.45,

            0,
            Math.PI * 2

        );


        ctx.fillStyle =
            `rgba(255,180,0,${alpha})`;


        ctx.fill();


        ctx.restore();


        radius += 10;

        alpha -= 0.08;


        if (alpha > 0) {

            requestAnimationFrame(
                animate
            );
        }
    }


    animate();
}


/* =========================================
   HUD
========================================= */

function updateHUD() {

    scoreBox.innerText =
        score;


    livesBox.innerText =
        "❤️".repeat(
            Math.max(
                lives,
                0
            )
        );
}


/* =========================================
   GAME OVER
========================================= */

function endGame() {

    gameRunning = false;


    finalScore.innerText =
        score;


    gameOver.style.display =
        "flex";


    finger.style.display =
        "none";
}


/* =========================================
   RESTART
========================================= */

restartBtn.addEventListener(
    "click",
    () => {

        gameOver.style.display =
            "none";


        score = 0;

        lives = 3;

        fruits = [];


        /*
           Reset hand.
        */

        smoothX = 0;
        smoothY = 0;

        handX = 0;
        handY = 0;

        previousX = 0;
        previousY = 0;


        updateHUD();


        gameRunning = true;


        /*
           Initial objects.
        */

        spawnFruit();
        spawnFruit();
        spawnFruit();


        lastFrame =
            performance.now();


        lastSpawn =
            performance.now();


        requestAnimationFrame(
            gameLoop
        );
    }
);


/* =========================================
   INITIAL HUD
========================================= */

=======
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

>>>>>>> 24238b69477bd5b9a2436746b2d1934eee165dbb
updateHUD();