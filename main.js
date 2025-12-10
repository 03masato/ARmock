import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';

console.log('Script loaded successfully');
console.log('THREE:', THREE);

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');

    // --- Elements ---
    const app = document.getElementById('app');
    const gameScreen = document.getElementById('game-screen');
    const resultScreen = document.getElementById('result-screen');

    const startArBtn = document.getElementById('start-ar-btn');
    const startGameBtn = document.getElementById('start-game-btn');
    const playAgainBtn = document.getElementById('play-again-btn');
    const backToTopBtn = document.getElementById('back-to-top-btn');

    const cameraFeed = document.getElementById('camera-feed');
    const preGameUi = document.getElementById('pre-game-ui');
    const gameHud = document.getElementById('game-hud');

    const timerDisplay = document.getElementById('timer-display');
    const scoreDisplay = document.getElementById('score-display');
    const finalScoreDisplay = document.getElementById('final-score');

    // Check if all elements exist
    console.log('Elements found:', {
        app: !!app,
        gameScreen: !!gameScreen,
        resultScreen: !!resultScreen,
        startArBtn: !!startArBtn,
        startGameBtn: !!startGameBtn,
        playAgainBtn: !!playAgainBtn,
        backToTopBtn: !!backToTopBtn,
        cameraFeed: !!cameraFeed,
        preGameUi: !!preGameUi,
        gameHud: !!gameHud
    });

    if (!app) console.error('Element #app not found!');
    if (!gameScreen) console.error('Element #game-screen not found!');
    if (!resultScreen) console.error('Element #result-screen not found!');
    if (!startArBtn) console.error('Element #start-ar-btn not found!');
    if (!startGameBtn) console.error('Element #start-game-btn not found!');
    if (!playAgainBtn) console.error('Element #play-again-btn not found!');
    if (!backToTopBtn) console.error('Element #back-to-top-btn not found!');
    if (!cameraFeed) console.error('Element #camera-feed not found!');
    if (!preGameUi) console.error('Element #pre-game-ui not found!');
    if (!gameHud) console.error('Element #game-hud not found!');
    if (!timerDisplay) console.error('Element #timer-display not found!');
    if (!scoreDisplay) console.error('Element #score-display not found!');
    if (!finalScoreDisplay) console.error('Element #final-score not found!');

    if (!startArBtn || !gameScreen || !app || !cameraFeed || !preGameUi || !gameHud || !startGameBtn || !playAgainBtn || !backToTopBtn || !resultScreen || !timerDisplay || !scoreDisplay || !finalScoreDisplay) {
        console.error('One or more critical elements are missing. Script cannot proceed.');
        return;
    }

    // --- Three.js Setup for 3D Cat ---
    let catScene, catCamera, catRenderer, catMesh;
    let catAnimationId;

    function init3DCat() {
        const canvas = document.getElementById('cat-3d-canvas');
        if (!canvas) return;

        // Scene
        catScene = new THREE.Scene();

        // Camera
        catCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
        catCamera.position.z = 3;

        // Renderer
        catRenderer = new THREE.WebGLRenderer({
            canvas: canvas,
            alpha: true,
            antialias: true
        });
        catRenderer.setSize(200, 200);
        catRenderer.setClearColor(0x000000, 0);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        catScene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        catScene.add(directionalLight);

        // Load STL
        const loader = new STLLoader();
        loader.load('assets/cat.stl', function (geometry) {
            const material = new THREE.MeshPhongMaterial({
                color: 0xff9966,
                shininess: 30
            });

            catMesh = new THREE.Mesh(geometry, material);

            // Center and scale the model
            geometry.computeBoundingBox();
            const center = new THREE.Vector3();
            geometry.boundingBox.getCenter(center);
            catMesh.geometry.translate(-center.x, -center.y, -center.z);

            // Scale to fit
            const size = new THREE.Vector3();
            geometry.boundingBox.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2 / maxDim;
            catMesh.scale.setScalar(scale);

            catScene.add(catMesh);
            animate3DCat();
        }, undefined, function (error) {
            console.error('Error loading STL:', error);
        });
    }

    function animate3DCat() {
        catAnimationId = requestAnimationFrame(animate3DCat);

        if (catMesh) {
            // Rotate cat
            catMesh.rotation.y += 0.01;
            // Float animation
            catMesh.position.y = Math.sin(Date.now() * 0.001) * 0.1;
        }

        catRenderer.render(catScene, catCamera);
    }

    // Movement and hiding behavior
    let catMovement = {
        targetX: 50,
        targetY: 50,
        currentX: 50,
        currentY: 50,
        isHiding: false,
        hideTimer: 0,
        moveSpeed: 0.02
    };

    function updateCatPosition() {
        if (!gameState.isPlaying) return;

        const arCat = document.getElementById('ar-cat');
        if (!arCat || arCat.classList.contains('hidden')) return;

        // Random chance to start hiding (5% per second)
        if (!catMovement.isHiding && Math.random() < 0.05) {
            startHiding();
        }

        // If hiding, count down and reappear
        if (catMovement.isHiding) {
            catMovement.hideTimer--;
            if (catMovement.hideTimer <= 0) {
                stopHiding();
            }
        } else {
            // Move towards target
            const dx = catMovement.targetX - catMovement.currentX;
            const dy = catMovement.targetY - catMovement.currentY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 2) {
                // Reached target, set new random target
                setNewTarget();
            } else {
                // Move towards target
                catMovement.currentX += dx * catMovement.moveSpeed;
                catMovement.currentY += dy * catMovement.moveSpeed;
            }

            // Update position
            arCat.style.left = `${catMovement.currentX}%`;
            arCat.style.top = `${catMovement.currentY}%`;
        }
    }

    function setNewTarget() {
        // Random position within safe bounds (10% to 90%)
        catMovement.targetX = 10 + Math.random() * 80;
        catMovement.targetY = 10 + Math.random() * 80;
    }

    function startHiding() {
        const arCat = document.getElementById('ar-cat');
        if (!arCat) return;

        catMovement.isHiding = true;
        catMovement.hideTimer = 60; // Hide for ~1 second (60 frames)

        // Move to edge or off-screen
        const edge = Math.floor(Math.random() * 4);
        switch (edge) {
            case 0: // Top
                catMovement.targetX = Math.random() * 100;
                catMovement.targetY = -10;
                break;
            case 1: // Right
                catMovement.targetX = 110;
                catMovement.targetY = Math.random() * 100;
                break;
            case 2: // Bottom
                catMovement.targetX = Math.random() * 100;
                catMovement.targetY = 110;
                break;
            case 3: // Left
                catMovement.targetX = -10;
                catMovement.targetY = Math.random() * 100;
                break;
        }

        // Increase move speed when hiding
        catMovement.moveSpeed = 0.05;
    }

    function stopHiding() {
        catMovement.isHiding = false;
        catMovement.moveSpeed = 0.02;

        // Reappear at new random position
        catMovement.currentX = 10 + Math.random() * 80;
        catMovement.currentY = 10 + Math.random() * 80;
        setNewTarget();
    }

    // Start movement loop
    let movementInterval;

    function stop3DCat() {
        if (catAnimationId) {
            cancelAnimationFrame(catAnimationId);
        }
        if (movementInterval) {
            clearInterval(movementInterval);
        }
    }

    // --- Game State ---
    let gameState = {
        score: 0,
        timeLeft: 10,
        isPlaying: false,
        timerInterval: null,
        spawnInterval: null
    };

    // --- Event Listeners ---

    // 1. Start AR Button (Top Page)
    startArBtn.addEventListener('click', async () => {
        console.log('Start AR button clicked');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });

            console.log('Camera stream obtained');
            cameraFeed.srcObject = stream;
            await cameraFeed.play();

            app.classList.add('hidden');
            gameScreen.classList.remove('hidden');
            console.log('Game screen shown');

        } catch (err) {
            console.error('Camera Error:', err);
            alert('カメラへのアクセスが必要です。許可してください。');
        }
    });

    // 2. Start Game Button
    startGameBtn.addEventListener('click', () => {
        startGame();
    });

    // 3. Play Again Button
    playAgainBtn.addEventListener('click', () => {
        resultScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        preGameUi.classList.remove('hidden');
        gameHud.classList.add('hidden');
    });

    // 4. Back to Top Button
    backToTopBtn.addEventListener('click', () => {
        if (cameraFeed.srcObject) {
            cameraFeed.srcObject.getTracks().forEach(track => track.stop());
        }

        resultScreen.classList.add('hidden');
        gameScreen.classList.add('hidden');
        app.classList.remove('hidden');

        stop3DCat();
    });

    // --- Game Functions ---

    function startGame() {
        gameState.score = 0;
        gameState.timeLeft = 10;
        gameState.isPlaying = true;

        scoreDisplay.textContent = '0';
        timerDisplay.textContent = '10';
        preGameUi.classList.add('hidden');
        gameHud.classList.remove('hidden');

        // Show AR Cat
        const arCat = document.getElementById('ar-cat');
        if (arCat) {
            arCat.classList.remove('hidden');
            init3DCat();

            // Reset movement
            catMovement.currentX = 50;
            catMovement.currentY = 50;
            setNewTarget();

            // Start movement loop (60 FPS)
            movementInterval = setInterval(updateCatPosition, 16);
        }

        // Setup AR Capture Button
        const arCaptureBtn = document.getElementById('ar-capture-btn');
        if (arCaptureBtn) {
            arCaptureBtn.onclick = () => {
                if (!gameState.isPlaying) return;
                gameState.score++;
                scoreDisplay.textContent = gameState.score;

                arCaptureBtn.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    arCaptureBtn.style.transform = 'scale(1)';
                }, 200);
            };
        }

        // Start Timer
        gameState.timerInterval = setInterval(() => {
            gameState.timeLeft--;
            timerDisplay.textContent = gameState.timeLeft;

            if (gameState.timeLeft <= 0) {
                endGame();
            }
        }, 1000);
    }

    function endGame() {
        gameState.isPlaying = false;
        clearInterval(gameState.timerInterval);
        if (gameState.spawnInterval) {
            clearInterval(gameState.spawnInterval);
        }

        // Hide AR Cat
        const arCat = document.getElementById('ar-cat');
        if (arCat) {
            arCat.classList.add('hidden');
        }

        stop3DCat();

        finalScoreDisplay.textContent = gameState.score;

        gameScreen.classList.add('hidden');
        resultScreen.classList.remove('hidden');
    }
});
