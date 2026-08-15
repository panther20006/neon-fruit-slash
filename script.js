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

updateHUD();