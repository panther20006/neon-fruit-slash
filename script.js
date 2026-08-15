const video =
    document.getElementById("camera");

const canvas =
    document.getElementById("gameCanvas");

const ctx =
    canvas.getContext("2d");


const startScreen =
    document.getElementById("startScreen");

const gameOver =
    document.getElementById("gameOver");


const startBtn =
    document.getElementById("startBtn");

const restartBtn =
    document.getElementById("restartBtn");


const finger =
    document.getElementById("finger");


const scoreBox =
    document.getElementById("score");

const livesBox =
    document.getElementById("lives");

const finalScore =
    document.getElementById("finalScore");


/* =========================================
   CANVAS
========================================= */

function resizeCanvas() {

    canvas.width =
        window.innerWidth;

    canvas.height =
        window.innerHeight;
}

resizeCanvas();

window.addEventListener(
    "resize",
    resizeCanvas
);


/* =========================================
   GAME STATE
========================================= */

let gameRunning = false;

let score = 0;

let lives = 3;

let fruits = [];

let lastSpawn = 0;

let lastFrame = 0;


/* =========================================
   HAND STATE
========================================= */

let handX = 0;

let handY = 0;

let smoothX = 0;

let smoothY = 0;

let previousX = 0;

let previousY = 0;

let trackingBusy = false;

let lastTracking = 0;


/* =========================================
   START
========================================= */

startBtn.addEventListener(
    "click",
    async () => {

        startScreen.style.display =
            "none";

        gameRunning = true;

        score = 0;

        lives = 3;

        fruits = [];

        smoothX = 0;

        smoothY = 0;

        previousX = 0;

        previousY = 0;


        updateHUD();


        /*
           Start with objects.
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


        try {

            await startCamera();

        } catch (error) {

            console.error(
                error
            );

            alert(
                "Camera permission allow karo."
            );
        }

    }
);


/* =========================================
   CAMERA
========================================= */

async function startCamera() {

    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        throw new Error(
            "Camera API unavailable"
        );
    }


    const stream =
        await navigator
            .mediaDevices
            .getUserMedia({

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


    video.srcObject =
        stream;


    await video.play();


    startHandTracking();
}


/* =========================================
   MEDIAPIPE
========================================= */

const hands =
    new Hands({

        locateFile: function(file) {

            return (
                "https://cdn.jsdelivr.net/npm/" +
                "@mediapipe/hands/" +
                file
            );
        }

    });


hands.setOptions({

    maxNumHands: 1,

    modelComplexity: 0,

    minDetectionConfidence: 0.40,

    minTrackingConfidence: 0.40

});


hands.onResults(
    onHandResults
);


/* =========================================
   HAND LOOP
========================================= */

function startHandTracking() {

    function trackingLoop(time) {

        if (

            time - lastTracking > 30 &&

            !trackingBusy &&

            video.readyState >= 2

        ) {

            lastTracking =
                time;

            trackingBusy =
                true;


            hands.send({

                image:
                    video

            })

            .catch(
                error => {

                    console.log(
                        "Tracking:",
                        error
                    );

                }
            )

            .finally(
                () => {

                    trackingBusy =
                        false;

                }
            );

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
   HAND RESULT
========================================= */

function onHandResults(results) {

    if (

        !results.multiHandLandmarks ||

        results.multiHandLandmarks.length === 0

    ) {

        return;

    }


    const landmarks =
        results.multiHandLandmarks[0];


    /*
       Index finger tip
    */

    const tip =
        landmarks[8];


    const mcp =
        landmarks[5];


    const pip =
        landmarks[6];


    /*
       Check index finger
    */

    const indexLength =
        Math.hypot(

            tip.x - mcp.x,

            tip.y - mcp.y

        );


    const pipLength =
        Math.hypot(

            pip.x - mcp.x,

            pip.y - mcp.y

        );


    const extended =
        indexLength >
        pipLength * 1.08;


    if (!extended) {

        return;

    }


    /*
       Screen position
    */

    const targetX =
        (1 - tip.x) *
        canvas.width;


    const targetY =
        tip.y *
        canvas.height;


    /*
       Smooth tracking
    */

    if (smoothX === 0) {

        smoothX =
            targetX;

        smoothY =
            targetY;

    } else {

        smoothX +=
            (
                targetX -
                smoothX
            ) * 0.45;


        smoothY +=
            (
                targetY -
                smoothY
            ) * 0.45;

    }


    previousX =
        handX;

    previousY =
        handY;


    handX =
        smoothX;

    handY =
        smoothY;


    /*
       Show finger
    */

    finger.style.display =
        "block";


    finger.style.left =
        handX + "px";


    finger.style.top =
        handY + "px";


    /*
       Slash
    */

    if (
        previousX !== 0
    ) {

        const movement =
            Math.hypot(

                handX -
                previousX,

                handY -
                previousY

            );


        if (
            movement > 3
        ) {

            drawSlash(

                previousX,

                previousY,

                handX,

                handY

            );


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
   SPAWN
========================================= */

function spawnFruit() {

    if (!gameRunning) {

        return;

    }


    /*
       30% bomb
    */

    const isBomb =
        Math.random() < 0.30;


    const fruitsList = [

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

            : fruitsList[
                Math.floor(
                    Math.random() *
                    fruitsList.length
                )
            ];


    fruits.push({

        /*
           Bottom position
        */

        x:
            60 +
            Math.random() *
            (
                canvas.width -
                120
            ),


        y:
            canvas.height +
            70,


        /*
           Horizontal speed
        */

        vx:
            (
                Math.random() -
                0.5
            ) * 2,


        /*
           THROW POWER
           Higher negative =
           higher throw
        */

        vy:
            -15 -
            Math.random() * 3,


        /*
           Gravity
        */

        gravity:
            0.30,


        emoji:
            emoji,


        bomb:
            isBomb,


        radius:
            52,


        rotation:
            0,


        rotationSpeed:
            (
                Math.random() -
                0.5
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
        (
            time -
            lastFrame
        ) / 16.67;


    delta =
        Math.min(
            delta,
            1.5
        );


    lastFrame =
        time;


    /*
       Spawn faster
    */

    if (
        time -
        lastSpawn >
        1000
    ) {

        spawnFruit();

        lastSpawn =
            time;

    }


    ctx.clearRect(

        0,

        0,

        canvas.width,

        canvas.height

    );


    /*
       Update objects
    */

    for (

        let i =
            fruits.length - 1;

        i >= 0;

        i--

    ) {

        const fruit =
            fruits[i];


        /*
           Gravity
        */

        fruit.vy +=
            fruit.gravity *
            delta;


        /*
           Movement
        */

        fruit.x +=
            fruit.vx *
            delta;


        fruit.y +=
            fruit.vy *
            delta;


        /*
           Rotation
        */

        fruit.rotation +=
            fruit.rotationSpeed *
            delta;


        /*
           Side bounce
        */

        if (

            fruit.x < 45 ||

            fruit.x >
            canvas.width - 45

        ) {

            fruit.vx *= -1;

        }


        /*
           Draw
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
            "65px Arial";


        ctx.textAlign =
            "center";


        ctx.textBaseline =
            "middle";


        /*
           Bomb glow
        */

        if (
            fruit.bomb
        ) {

            ctx.shadowBlur =
                30;

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
           Delete below screen
        */

        if (

            fruit.y >
            canvas.height +
            130

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
   CUT
========================================= */

function checkCut(

    x1,
    y1,

    x2,
    y2

) {

    for (

        let i =
            fruits.length - 1;

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
   DISTANCE
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
   HIT OBJECT
========================================= */

function hitFruit(

    fruit,

    index

) {

    fruits.splice(

        index,

        1

    );


    /*
       BOMB
    */

    if (
        fruit.bomb
    ) {

        lives--;


        /*
           VIBRATION
        */

        vibrateBomb();


        /*
           EXPLOSION
        */

        createExplosion(

            fruit.x,

            fruit.y

        );


        updateHUD();


        if (
            lives <= 0
        ) {

            endGame();

        }


        return;

    }


    /*
       FRUIT
    */

    score +=
        10;


    vibrateFruit();


    createCutEffect(

        fruit.x,

        fruit.y,

        fruit.emoji

    );


    updateHUD();

}


/* =========================================
   FRUIT VIBRATION
========================================= */

function vibrateFruit() {

    if (
        "vibrate" in navigator
    ) {

        navigator.vibrate(
            35
        );

    }

}


/* =========================================
   BOMB VIBRATION
========================================= */

function vibrateBomb() {

    if (
        "vibrate" in navigator
    ) {

        navigator.vibrate([

            250,

            80,

            250,

            80,

            350

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
        20;


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

    let life =
        1;


    function animate() {

        ctx.save();


        ctx.globalAlpha =
            life;


        ctx.font =
            "38px Arial";


        ctx.textAlign =
            "center";


        ctx.fillText(

            emoji,

            x -
            (1 - life) *
            60,

            y -
            (1 - life) *
            25

        );


        ctx.fillText(

            emoji,

            x +
            (1 - life) *
            60,

            y -
            (1 - life) *
            25

        );


        ctx.restore();


        life -=
            0.07;


        if (
            life > 0
        ) {

            requestAnimationFrame(
                animate
            );

        }

    }


    animate();

}


/* =========================================
   BOMB EXPLOSION
========================================= */

function createExplosion(

    x,

    y

) {

    let radius =
        10;

    let alpha =
        1;


    function animate() {

        ctx.save();


        /*
           Red explosion ring
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

            `rgba(
                255,
                30,
                30,
                ${alpha}
            )`;


        ctx.lineWidth =
            12;


        ctx.shadowBlur =
            35;


        ctx.shadowColor =
            "red";


        ctx.stroke();


        /*
           Yellow center
        */

        ctx.beginPath();


        ctx.arc(

            x,

            y,

            radius * 0.4,

            0,

            Math.PI * 2

        );


        ctx.fillStyle =

            `rgba(
                255,
                180,
                0,
                ${alpha}
            )`;


        ctx.fill();


        ctx.restore();


        radius +=
            11;


        alpha -=
            0.08;


        if (
            alpha > 0
        ) {

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

    gameRunning =
        false;


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


        smoothX = 0;

        smoothY = 0;

        handX = 0;

        handY = 0;

        previousX = 0;

        previousY = 0;


        updateHUD();


        gameRunning =
            true;


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
   INITIAL
========================================= */

updateHUD();