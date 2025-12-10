/**
 * WebXR AR Module
 * Implements true AR using WebXR Device API with Three.js
 */

class WebXRAR {
    constructor() {
        this.session = null;
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.reticle = null;
        this.hitTestSource = null;
        this.hitTestSourceRequested = false;
        this.cats = [];
        this.gameState = {
            score: 0,
            timeLeft: 10,
            isPlaying: false,
            timerInterval: null
        };
        this.raycaster = new THREE.Raycaster();
        this.localReferenceSpace = null;
    }

    /**
     * Check if WebXR AR is supported
     */
    async isARSupported() {
        if (!navigator.xr) {
            console.log('WebXR not supported');
            return false;
        }

        try {
            const supported = await navigator.xr.isSessionSupported('immersive-ar');
            console.log('AR supported:', supported);
            return supported;
        } catch (error) {
            console.error('Error checking AR support:', error);
            return false;
        }
    }

    /**
     * Initialize Three.js scene
     */
    initScene() {
        // Scene
        this.scene = new THREE.Scene();

        // Camera (will be controlled by WebXR)
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

        // Lighting
        const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
        light.position.set(0.5, 1, 0.25);
        this.scene.add(light);

        // Create reticle for surface targeting
        this.createReticle();
    }

    /**
     * Create AR reticle (placement indicator)
     */
    createReticle() {
        const geometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
        const material = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.8, transparent: true });
        this.reticle = new THREE.Mesh(geometry, material);
        this.reticle.matrixAutoUpdate = false;
        this.reticle.visible = false;
        this.scene.add(this.reticle);
    }

    /**
     * Create 3D cat sprite
     */
    createCat(position) {
        const texture = new THREE.TextureLoader().load('cat_transparent.png');
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 1
        });
        const cat = new THREE.Sprite(material);
        cat.scale.set(0.3, 0.3, 0.3); // 30cm size
        cat.position.copy(position);
        cat.userData.isCat = true;
        cat.userData.id = Date.now() + Math.random();

        this.scene.add(cat);
        this.cats.push(cat);

        return cat;
    }

    /**
     * Start AR session
     */
    async startARSession() {
        try {
            // Initialize polyfill if needed
            if (window.WebXRPolyfill) {
                new WebXRPolyfill();
            }

            // Request AR session
            this.session = await navigator.xr.requestSession('immersive-ar', {
                requiredFeatures: ['hit-test'],
                optionalFeatures: ['dom-overlay'],
                domOverlay: { root: document.getElementById('ar-overlay') }
            });

            console.log('AR session started');

            // Initialize scene
            this.initScene();

            // Setup renderer
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl', { xrCompatible: true });

            this.renderer = new THREE.WebGLRenderer({
                canvas: canvas,
                context: gl,
                alpha: true,
                preserveDrawingBuffer: true,
                antialias: true
            });
            this.renderer.autoClear = false;
            this.renderer.xr.enabled = true;
            this.renderer.xr.setReferenceSpaceType('local');

            // Set session
            await this.renderer.xr.setSession(this.session);

            // Setup reference space
            this.localReferenceSpace = await this.session.requestReferenceSpace('local');

            // Session event handlers
            this.session.addEventListener('end', () => this.onSessionEnd());

            // Start render loop
            this.renderer.setAnimationLoop((timestamp, frame) => this.onXRFrame(timestamp, frame));

            // Show AR UI
            document.getElementById('game-screen').classList.remove('hidden');
            document.getElementById('app').classList.add('hidden');
            document.getElementById('ar-overlay').classList.remove('hidden');

        } catch (error) {
            console.error('Error starting AR session:', error);
            alert('ARセッションの開始に失敗しました: ' + error.message);
        }
    }

    /**
     * XR frame render loop
     */
    onXRFrame(timestamp, frame) {
        const session = frame.session;
        const pose = frame.getViewerPose(this.localReferenceSpace);

        // Request hit test source if not done yet
        if (!this.hitTestSourceRequested && session) {
            session.requestReferenceSpace('viewer').then((referenceSpace) => {
                session.requestHitTestSource({ space: referenceSpace }).then((source) => {
                    this.hitTestSource = source;
                });
            });
            this.hitTestSourceRequested = true;
        }

        // Perform hit test
        if (this.hitTestSource && pose) {
            const hitTestResults = frame.getHitTestResults(this.hitTestSource);

            if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];
                const hitPose = hit.getPose(this.localReferenceSpace);

                // Update reticle position
                this.reticle.visible = true;
                this.reticle.matrix.fromArray(hitPose.transform.matrix);
            } else {
                this.reticle.visible = false;
            }
        }

        // Render scene
        if (pose) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    /**
     * Start game
     */
    startGame() {
        this.gameState.score = 0;
        this.gameState.timeLeft = 10;
        this.gameState.isPlaying = true;

        // Update UI
        document.getElementById('score-display').textContent = '0';
        document.getElementById('timer-display').textContent = '10';
        document.getElementById('pre-game-ui').classList.add('hidden');
        document.getElementById('game-hud').classList.remove('hidden');

        // Hide reticle during game
        if (this.reticle) {
            this.reticle.visible = false;
        }

        // Spawn initial cats
        this.spawnCats();

        // Start timer
        this.gameState.timerInterval = setInterval(() => {
            this.gameState.timeLeft--;
            document.getElementById('timer-display').textContent = this.gameState.timeLeft;

            if (this.gameState.timeLeft <= 0) {
                this.endGame();
            }
        }, 1000);

        // Spawn cats periodically
        this.spawnInterval = setInterval(() => {
            if (this.gameState.isPlaying) {
                this.spawnCats();
            }
        }, 2000);
    }

    /**
     * Spawn cats in AR space
     */
    spawnCats() {
        // Spawn 1-2 cats at random positions
        const numCats = Math.floor(Math.random() * 2) + 1;

        for (let i = 0; i < numCats; i++) {
            // Random position in front of user
            const angle = (Math.random() - 0.5) * Math.PI; // -90 to +90 degrees
            const distance = 1 + Math.random() * 2; // 1-3 meters
            const height = 0.5 + Math.random() * 1; // 0.5-1.5 meters

            const position = new THREE.Vector3(
                Math.sin(angle) * distance,
                height,
                -Math.cos(angle) * distance
            );

            this.createCat(position);
        }
    }

    /**
     * Handle tap to catch cat
     */
    onTap(event) {
        if (!this.gameState.isPlaying) return;

        // Get tap position
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Raycast to find cats
        this.raycaster.setFromCamera({ x, y }, this.camera);
        const intersects = this.raycaster.intersectObjects(this.cats);

        if (intersects.length > 0) {
            const cat = intersects[0].object;

            // Remove cat
            this.scene.remove(cat);
            const index = this.cats.indexOf(cat);
            if (index > -1) {
                this.cats.splice(index, 1);
            }

            // Update score
            this.gameState.score++;
            document.getElementById('score-display').textContent = this.gameState.score;

            // Play catch animation/sound here if desired
        }
    }

    /**
     * End game
     */
    endGame() {
        this.gameState.isPlaying = false;
        clearInterval(this.gameState.timerInterval);
        clearInterval(this.spawnInterval);

        // Remove all cats
        this.cats.forEach(cat => this.scene.remove(cat));
        this.cats = [];

        // Update final score
        document.getElementById('final-score').textContent = this.gameState.score;

        // End AR session
        if (this.session) {
            this.session.end();
        }
    }

    /**
     * Handle session end
     */
    onSessionEnd() {
        this.session = null;
        this.hitTestSource = null;
        this.hitTestSourceRequested = false;

        // Show result screen
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('ar-overlay').classList.add('hidden');
        document.getElementById('result-screen').classList.remove('hidden');
    }
}

// Export for use
window.WebXRAR = WebXRAR;
