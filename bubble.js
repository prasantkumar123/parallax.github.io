window.addEventListener("load", () => {

    const {
        Percentage,
        Vector,
        degToRad,
        radToDeg,
        toMB,
        random
    } = window.myMaths;
    const {
        colors,
        sleep
    } = window.util;

    const createScreen = window.createScreen;
    const appendScreens = window.appendScreens;

    const {
        Engine,
        LoadManager,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        Cannon
    } = window;
    const {
        balls,
        bricks,
        effects,
        obtainableBalls,
        Treasure,
        Particle,
        DestroyEffect,
        Ball,
        ObtainableBall
    } = window;

    let audio = null,
        graphics = null,
        audioCtx = null;
    const $ = s => document.querySelector(s);

    async function main() {
        document.body.classList.add(`bg${random(1,3)}`);

        await load();

        audio.play("bg", true);

        const gameScreen = createScreen(300, 500);
        const trScreen = createScreen(300, 500);
        gameScreen.canvas.classList.add("gameScreen");
        trScreen.canvas.classList.add("gameScreen");
        gameScreen.context.font = "20px sans-serif";

        appendScreens([gameScreen, trScreen], $("#canvas"));

        let cannon = null;

        function initGame() {
            bricks.clear();
            balls.clear();
            obtainableBalls.clear();

            $("#balls").innerHTML = 1;
            $("#coins").innerHTML = 0;
            $("#score").innerHTML = 0;

            bricks.add(
                new Brick(
                    colors[random(0, colors.length - 1)],
                    new Vector(random(0, 5), 0),
                    new Vector(50, 50), 1
                )
            );

            cannon = new Cannon(graphics.get("cannon"));
            cannon.ballSprite = graphics.get("pokeball");
            cannon.trCtx = trScreen.context;

            cannon.on("ballChange", async function () {
                itemAnimation("balls");
                audio.play("ball");
            });
            cannon.on("scoreChange", async function () {
                itemAnimation("score");
            });
            cannon.on("coinsChange", function () {
                itemAnimation("coins");
            });

            canvas.addEventListener("touchend", () => {
                cannon.fire()
            });

            cannon.on("fire", () => {
                trScreen.context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            });
            cannon.on("ballSpawn", () => {
                audio.play("shoot");
                for (let i = 0; i < random(1, 4); ++i) {
                    const particle = new Particle("#fff", ...cannon.center);
                    particle.sprite = graphics.get(`shootEffect${random(0,1)}`);
                    particle.radius = random(25, 35, 2);

                    particle.vel.set(Math.cos(degToRad(cannon.degs)) * random(0.05, 0.15, 2), -random(0.07, 0.1, 3))
                    effects.add(particle)
                }

            });
            cannon.on("canMove", async () => {
                if (cannon.fireCount >= cannon.nextObtainableBall) {
                    cannon.nextObtainableBall = random(4, 10);
                    cannon.fireCount = 0;
                    obtainableBalls.add(new ObtainableBall(
                        cannon.ballSprite,
                        new Vector(random(32, innerWidth - 32), -25),
                        new Vector(16, 16),
                        90
                    ))
                }

                let blocksAdded = 0;
                let before = false;

                for (let i = 0; i < 5; ++i) {
                    if (random(0, 100) > 70 || blocksAdded >= 3 || before) {
                        before = false;
                        continue
                    };
                    if (random(0, 100) > 20) {
                        bricks.add(
                            new Brick(
                                colors[random(0, colors.length - 1)],
                                new Vector(i, -0.99),
                                new Vector(50, 50),
                                random(cannon.balls, cannon.balls + random(0, 3))
                            )
                        );
                    } else {
                        bricks.add(
                            new Treasure(
                                graphics.get("treasure"),
                                new Vector(i, -0.99),
                                new Vector(50, 50),
                                random(cannon.balls, cannon.balls + random(0, 3))
                            )
                        );
                    }
                    before = true;
                    blocksAdded++;
                }

                if (blocksAdded == 0) {
                    bricks.add(
                        new Brick(
                            colors[random(0, colors.length - 1)],
                            new Vector(0, -0.99),
                            new Vector(50, 50),
                            random(cannon.balls, cannon.balls + random(0, 3))
                        )
                    );
                }

                for (let brick of bricks) {
                    brick.moveTo(brick.pos.x, brick.pos.y + 50);
                    if (brick.top + 50 >= cannon.top) {
                        gameOver();
                    }
                }
                for (let ball of obtainableBalls) {
                    ball.moveTo(ball.pos.x, ball.pos.y + 50);
                }

            });
            cannon.on("moveEnd", () => {
                audio.play("next");
            });

            let canPlayAudio = true;
            cannon.on("changeDegs", () => {

                if (canPlayAudio) {
                    audio.play(random(0, 1, 2) > 0.5 ? "move" : "move2");
                    canPlayAudio = false;
                    setTimeout(() => {
                        canPlayAudio = true;
                    }, 70)
                }
                Cannon.calcTrajectory(trScreen.context, cannon, 40);

            });

            ["touchstart", "touchmove"].forEach(eventName => {
                canvas.addEventListener(eventName, (e) => {

                    var cRect = e.target.getBoundingClientRect();
                    const {
                        clientX,
                        clientY
                    } = e.touches[0];
                    let x = clientX - cRect.left;
                    let y = clientY - cRect.top;


                    y = innerHeight - y - 132

                    x -= cannon.center.x
                    if (y < 30) y = 30;
                    let v = Math.atan((y / x));

                    let degs = radToDeg(v);
                    if (degs < 0) {
                        degs = 180 + degs;
                    }

                    if (degs > 150) degs = 150;
                    if (degs < 30) degs = 30;

                    cannon.setDegs(Number(degs))
                })
            })

        }
        initGame();

        function gameOver() {
            window.alert("Gameover.\n Your score: " + cannon.score);
            initGame();
        }

        async function itemAnimation(name) {
            const b = $(`.${name}`);
            b.classList.add("active");
            $(`#${name}`).innerHTML = cannon[name];
            await sleep(500);
            b.classList.remove("active");
        }


        const renderer = new Engine.Renderer(async (dt) => {
            gameScreen.context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            cannon.render(gameScreen.context);

            cannon.update();

            for (let ball of balls) {
                if (ball.update(dt)) {
                    ball.vel.set(0, 0);
                    if (ball.movements.size == 0) {
                        ball.moveTo(cannon.center.x - ball.size.x / 2, cannon.center.y - ball.size.y / 2, () => {
                            balls.delete(ball)
                        });
                    }
                }
                ball.render(gameScreen.context);
            }


            for (let brick of bricks) {
                brick.update();
                brick.render(gameScreen.context);
                if (brick.life <= 0) {

                    audio.play("brickDestroy");
                    effects.add(new DestroyEffect(brick))
                    cannon.addScore(brick.originalLife);
                    if (brick.name == "treasure") {
                        cannon.addCoins(random(1, 5));;
                    }

                    bricks.delete(brick)
                }

            }

            for (let effect of effects) {
                effect.render(gameScreen.context)
                if (effect.update(dt)) effects.delete(effect)
            }

            for (let ball of obtainableBalls) {
                if (ball.update(dt)) {
                    obtainableBalls.delete(ball);

                    const newBall = new Ball(
                        cannon.ballSprite,
                        new Vector(...ball.pos),
                        new Vector(20, 20),
                        90
                    );
                    newBall.vel.set(0, 0);
                    newBall.moveTo(cannon.center.x, CANVAS_HEIGHT)

                    balls.add(newBall);

                    cannon.addBalls(1);

                }
                ball.render(gameScreen.context);

            }
            gameScreen.context.fillStyle = "red";
            gameScreen.context.fillRect(0, cannon.top, CANVAS_WIDTH, 2);
        });
        window.r = renderer;
        renderer.start();

        alert("This is not the finally game");
        alert("Aviable for mobile only");
        alert("INSTRUCTIONS:\nSwipe lef or right to move the cannon angle, you can also click , it will shoot automatically");

        Cannon.calcTrajectory(trScreen.context, cannon, 40);

        // launchFullScreen();
    }

    function isMobile() {
        return (navigator.userAgent.match(/Android/i)) ||
            (navigator.userAgent.match(/webOS/i)) ||
            (navigator.userAgent.match(/iPhone/i)) ||
            (navigator.userAgent.match(/iPod/i)) ||
            (navigator.userAgent.match(/iPad/i)) ||
            (navigator.userAgent.match(/BlackBerry/i));
    }

    function userInteraction() {
        document.getElementById("userInteraction").remove();
        audioCtx = new AudioContext();
        main();
    }
    $("#userInteraction").addEventListener("click", userInteraction);
    window.addEventListener("DOMContentLoaded", function () {

        if (!isMobile() || !window.screen.orientation) return;

        if (window.screen.orientation.angle != 0) {
            lockScreen();
        }
        window.screen.orientation.addEventListener("change", () => {

            if (window.screen.orientation.angle != 0) {
                lockScreen();
                if (window.r) window.r.pause();

            } else {
                document.getElementById("lockedScreen").remove();
                if (window.r) window.r.continue();
            }
        })
    })

    function lockScreen() {
        const lock = document.createElement("div");
        lock.id = "lockedScreen";
        lock.classList.add("active");
        lock.innerHTML = `
        <p>Please rotate your device</p>
        <img src="https://luis72353.github.io/pokeballs-vs-bricks/graphics/portrait.png" alt="">
   `
        document.body.appendChild(lock);
    }

    async function load() {
        graphics = new Engine.Graphics({

            cannon: "graphics/normal.png",
            pokeball: "graphics/pokeball.png",
            shootEffect0: "graphics/shoot-effect-0.png",
            shootEffect1: "graphics/shoot-effect-1.png",
            treasure: "graphics/treasure.png"
        });

        audio = new Engine.AudioControler({
                bg: "audio/bg.mp3",
                move: "audio/move1.wav",
                move2: "audio/move2.wav",
                shoot: "audio/gun.mp3",
                next: "audio/next.mp3",
                brickDestroy: "audio/glass break2.mp3",
                ball: "audio/ball.mp3"
            },
            audioCtx
        );

        const loader = new LoadManager([audio, graphics]);
        loader.events.on("progress", (loaded, total) => {
            const progress = new Percentage(1048576 * 2.59).getPercent(loaded);
            const percent = progress + "%";
            document.getElementById("size").innerHTML = `${toMB(loaded,2)}MB of 2.59MB`;
            document.getElementById("progress").innerHTML = percent;
            document.getElementById("progress").style.background = `linear-gradient(90deg,#e91e63 ${percent},#000  ${percent})`;

        });
        loader.events.on("decoding", () => {
            document.getElementById("progress").remove();
            document.getElementById("loading").innerHTML = ""
            "installing".split("").forEach(char => {
                document.getElementById("loading").innerHTML += `<span>${char}</span>`
            })
        });
        loader.events.on("decoded", () => {
            window.loader.remove();
        });

        await loader.load();
    }
})