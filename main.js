import './style.css'
import { SoundManager } from './audio.js';

// --- Global State ---
let gameState = {
    snowCleared: false,
    lockPicked: false,
    heartCut: false
};

const resetBtn = document.getElementById('reset-btn');
const audioBtn = document.getElementById('audio-btn');
const soundManager = new SoundManager();

audioBtn.addEventListener('click', async () => {
    await soundManager.init();
    audioBtn.innerText = 'AUDIO ENABLED';
    audioBtn.classList.add('active');
    // Start scene 0 if we are at top
    if (window.scrollY < window.innerHeight) {
        soundManager.setScene(0); // Wind
    }
});

// --- Snow Effect (Background) ---
const snowCanvas = document.getElementById('snow-canvas');
const snowCtx = snowCanvas.getContext('2d');
let width = window.innerWidth;
let height = window.innerHeight;
snowCanvas.width = width;
snowCanvas.height = height;

const snowflakes = [];
const numFlakes = 100;

class Snowflake {
    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 3 + 1;
        this.speed = Math.random() * 1 + 0.5;
        this.wind = Math.random() * 0.5 - 0.25;
    }
    update() {
        this.y += this.speed;
        this.x += this.wind;
        if (this.y > height) {
            this.y = -this.size;
            this.x = Math.random() * width;
        }
        if (this.x > width) { this.x = 0; }
        else if (this.x < 0) { this.x = width; }
    }
    draw() {
        snowCtx.beginPath();
        snowCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        snowCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        snowCtx.fill();
    }
}

function initSnow() {
    for (let i = 0; i < numFlakes; i++) {
        snowflakes.push(new Snowflake());
    }
}

function animateSnow() {
    snowCtx.clearRect(0, 0, width, height);
    snowflakes.forEach(flake => {
        flake.update();
        flake.draw();
    });
    requestAnimationFrame(animateSnow);
}

window.addEventListener('resize', () => {
    width = window.innerWidth;
    height = window.innerHeight;
    snowCanvas.width = width;
    snowCanvas.height = height;
    initScratchGame(); // Resize scratch canvas too
});

initSnow();
animateSnow();


// --- Chapter 1: Snow Scratch Game ---
const scratchCanvas = document.getElementById('scratch-canvas');
const scratchCtx = scratchCanvas.getContext('2d');
const scratchContainer = document.getElementById('snow-game-container');
let isDrawing = false;

function initScratchGame() {
    if (gameState.snowCleared) return;

    // Ensure accurate sizing
    const rect = scratchContainer.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return; // Wait for layout

    // Set buffer size to match display size
    scratchCanvas.width = rect.width;
    scratchCanvas.height = rect.height;

    // Fill with snow
    scratchCtx.fillStyle = '#eee';
    scratchCtx.fillRect(0, 0, scratchCanvas.width, scratchCanvas.height);

    // Noise texture for snow
    for (let i = 0; i < 5000; i++) {
        scratchCtx.fillStyle = `rgba(200, 200, 200, ${Math.random() * 0.5})`;
        scratchCtx.fillRect(Math.random() * scratchCanvas.width, Math.random() * scratchCanvas.height, 2, 2);
    }
}

function getPos(e) {
    const rect = scratchCanvas.getBoundingClientRect();
    let clientX = e.clientX;
    let clientY = e.clientY;

    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    }

    // Scale coordinates if mismatch, but we tried to match them in init
    // Just in case of minor discrepancies or if init ran before resize stabilized
    const scaleX = scratchCanvas.width / (rect.width || 1);
    const scaleY = scratchCanvas.height / (rect.height || 1);

    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

function scratch(e) {
    if (!isDrawing || gameState.snowCleared) return;
    const pos = getPos(e);
    scratchCtx.globalCompositeOperation = 'destination-out';
    scratchCtx.beginPath();
    scratchCtx.arc(pos.x, pos.y, 60, 0, Math.PI * 2); // Larger brush
    scratchCtx.fill();

    // Throttled check could happen here
}

function verifyScratchCompletion() {
    const w = scratchCanvas.width;
    const h = scratchCanvas.height;
    if (w === 0 || h === 0) return;

    // Sample points using a grid
    let clearCount = 0;
    const totalPoints = 100;
    const stepX = w / 10;
    const stepY = h / 10;

    // We can just grab the imageData of the whole canvas? 
    // For performance on large screens, maybe not on every move, but on mouseup it's fine.
    const imageData = scratchCtx.getImageData(0, 0, w, h).data;

    // Stride to check ~500 pixels spread out
    const stride = Math.floor(imageData.length / 4 / 500) * 4;
    if (stride === 0) return; // too small

    let checked = 0;
    for (let i = 0; i < imageData.length; i += stride) {
        if (imageData[i + 3] < 128) clearCount++; // alpha check
        checked++;
    }

    if (checked > 0 && (clearCount / checked) > 0.15) { // 15% cleared
        resolveGame('snow-game-container');
        gameState.snowCleared = true;
    }
}

scratchCanvas.addEventListener('mousedown', (e) => { isDrawing = true; scratch(e); });
scratchCanvas.addEventListener('mousemove', scratch);
scratchCanvas.addEventListener('mouseup', () => { isDrawing = false; verifyScratchCompletion(); });
scratchCanvas.addEventListener('touchstart', (e) => { isDrawing = true; scratch(e); e.preventDefault(); });
scratchCanvas.addEventListener('touchmove', (e) => { scratch(e); e.preventDefault(); });
scratchCanvas.addEventListener('touchend', () => { isDrawing = false; verifyScratchCompletion(); });

// Re-init on intersection or rely on resize?
// Resize is safer
window.addEventListener('resize', initScratchGame);

// Also verify initialization after a short delay since CSS might take a frame
setTimeout(initScratchGame, 100);

scratchCanvas.addEventListener('mousedown', (e) => { isDrawing = true; scratch(e); });
scratchCanvas.addEventListener('mousemove', scratch);
scratchCanvas.addEventListener('mouseup', () => { isDrawing = false; verifyScratchCompletion(); });
scratchCanvas.addEventListener('touchstart', (e) => { isDrawing = true; scratch(e); e.preventDefault(); });
scratchCanvas.addEventListener('touchmove', (e) => { scratch(e); e.preventDefault(); });
scratchCanvas.addEventListener('touchend', () => { isDrawing = false; verifyScratchCompletion(); });

// Initialize initial state
initScratchGame();


// --- Chapter 2: Lock Picking Game ---
const pins = document.querySelectorAll('.pin');
let currentPin = 0;

pins.forEach(pin => {
    pin.addEventListener('click', (e) => {
        if (gameState.lockPicked) return;
        const index = parseInt(pin.dataset.index);

        // Simple logic: must click in order 0 -> 1 -> 2
        // To make it a 'game', let's say they bob up and down, hit it when 'high'?
        // No, let's stick to simple sequence for clarity but give visual feedback.

        if (index === currentPin) {
            pin.classList.add('unlocked');
            currentPin++;
            if (currentPin >= 3) {
                setTimeout(() => {
                    resolveGame('lock-game-container');
                    gameState.lockPicked = true;
                }, 500);
            }
        } else {
            // Reset if wrong order
            pins.forEach(p => p.classList.remove('unlocked'));
            currentPin = 0;
            // Shake effect (optional)
            pin.classList.add('active'); // show error
            setTimeout(() => pin.classList.remove('active'), 200);
        }
    });
});


// --- Chapter 3: Heart Cutting Game ---
const cutContainer = document.querySelector('.heart-target');
const cutPath = document.getElementById('cut-path'); // M 20 100 Q 100 20 180 100
// Bezier curve: Start (20,100), Control (100,20), End (180,100)
// Approximation check
let cutPoints = [];
let isCutting = false;

cutContainer.addEventListener('mousedown', startCut);
cutContainer.addEventListener('mousemove', moveCut);
cutContainer.addEventListener('mouseup', endCut);
cutContainer.addEventListener('mouseleave', endCut);
// Touch events...

function startCut(e) {
    if (gameState.heartCut) return;
    isCutting = true;
    cutPoints = [];
}

function moveCut(e) {
    if (!isCutting) return;
    // Track relative position in 200x200 container
    const rect = cutContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cutPoints.push({ x, y });
}

function endCut() {
    if (!isCutting) return;
    isCutting = false;
    verifyCut();
}

function verifyCut() {
    if (cutPoints.length < 5) return;

    // Check if points roughly follow the curve and span from left to right
    const startObj = cutPoints[0];
    const endObj = cutPoints[cutPoints.length - 1];

    // Check direction (left to right)
    if (startObj.x < 50 && endObj.x > 150) {
        // Did we go through the middle? (Approx y check)
        // Midpoint of curve is approx 60 (Q control is 20, start/end 100)
        // t=0.5 => (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
        // 0.25*100 + 0.5*20 + 0.25*100 = 25 + 10 + 25 = 60.

        // Simple bounding box check for 'middle' points
        let middleHits = 0;
        for (let p of cutPoints) {
            if (p.x > 80 && p.x < 120) {
                if (p.y > 20 && p.y < 90) { // Rough area of curve peak
                    middleHits++;
                }
            }
        }

        if (middleHits > 2) {
            resolveGame('cut-game-container');
            gameState.heartCut = true;
            // Animate cut?
            document.querySelector('.cut-line-svg').style.opacity = '0';
            document.querySelector('.heart-img-game').style.transform = 'skewX(20deg) scale(0.9)'; // Break effect
            setTimeout(() => {
                document.querySelector('.heart-img-game').src = '/chapter3.png'; // restore or keep broken?
            }, 1000);
        }
    }
}


// --- Chapter 4: Fade to White (Scroll Linked) ---
const whiteout = document.getElementById('whiteout-overlay');
const chapter4 = document.getElementById('chapter-4');
const endFin = document.querySelector('.end-fin');

window.addEventListener('scroll', () => {
    if (!gameState.heartCut) return; // Only process if reached here? Or always.

    const rect = chapter4.getBoundingClientRect();
    const windowH = window.innerHeight;

    // When chapter 4 is in view, start fading
    if (rect.top < windowH) {
        // Calculate progress
        const distance = windowH - rect.top;
        const totalHeight = rect.height + windowH; // approximate scroll distance
        let progress = distance / rect.height; // relative to chapter height

        if (progress < 0) progress = 0;
        // if (progress > 1) progress = 1; // allow > 1 for further scroll

        // Whiteout fade
        const fadeStart = 0.3; // 30% into the chapter
        if (progress > fadeStart) {
            let whiteOp = (progress - fadeStart) * 1.5;
            if (whiteOp > 1) whiteOp = 1;
            whiteout.style.opacity = whiteOp;

            // FIN fade (starts later)
            if (whiteOp > 0.9) {
                // Map progress 0.9->1.2 to opacity 0->1
                // We need to scroll a bit more to see FIN
                // Actually simpler: base it on progress
                // fade whiteout 0.3 -> 0.9
                // fade FIN 0.8 -> 1.0 (of scroll progress)

                let finProgress = (progress - 0.8) * 3;
                if (finProgress < 0) finProgress = 0;
                if (finProgress > 1) finProgress = 1;
                endFin.style.opacity = finProgress;
            } else {
                endFin.style.opacity = 0;
            }
        } else {
            whiteout.style.opacity = 0;
            endFin.style.opacity = 0;
        }

        if (whiteout.style.opacity > 0.8) {
            resetBtn.classList.remove('hidden');
        } else {
            resetBtn.classList.add('hidden');
        }
    }
});


// --- Common Logic ---

function resolveGame(containerId) {
    const container = document.getElementById(containerId);
    container.classList.add('resolved');

    // Unlock next chapter based on resolved game
    if (containerId === 'snow-game-container') {
        document.getElementById('chapter-2').classList.remove('locked-chapter');
    } else if (containerId === 'lock-game-container') {
        document.getElementById('chapter-3').classList.remove('locked-chapter');
    } else if (containerId === 'cut-game-container') {
        document.getElementById('chapter-4').classList.remove('locked-chapter');
    }
}

function resetAll() {
    window.scrollTo(0, 0);
    gameState = {
        snowCleared: false,
        lockPicked: false,
        heartCut: false
    };

    // Reset Snow
    initScratchGame();
    document.getElementById('snow-game-container').classList.remove('resolved');

    // Reset Lock
    document.getElementById('lock-game-container').classList.remove('resolved');
    document.querySelectorAll('.pin').forEach(p => p.classList.remove('unlocked'));
    currentPin = 0;

    // Reset Heart
    document.getElementById('cut-game-container').classList.remove('resolved');
    document.querySelector('.heart-img-game').style.transform = 'none';
    document.querySelector('.cut-line-svg').style.opacity = '1';

    // Reset Whiteout & FIN
    whiteout.style.opacity = 0;
    endFin.style.opacity = 0;
    resetBtn.classList.add('hidden');

    // Re-lock Chapters
    document.getElementById('chapter-2').classList.add('locked-chapter');
    document.getElementById('chapter-3').classList.add('locked-chapter');
    document.getElementById('chapter-4').classList.add('locked-chapter');

    soundManager.stopAll();
    if (audioBtn.classList.contains('active')) {
        soundManager.setScene(0);
    }
}

resetBtn.addEventListener('click', resetAll);


// --- Scroll Reveal Logic (Existing) ---
const chapters = document.querySelectorAll('.chapter');
const observerOptions = {
    root: null,
    rootMargin: '-20% 0px -20% 0px', // Trigger when mostly in view
    threshold: 0.2
};

const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.remove('hidden');

            // Audio Scene Switching
            if (soundManager.initialized) {
                const id = entry.target.id;
                if (id === 'chapter-1') soundManager.setScene(0);
                if (id === 'chapter-2') soundManager.setScene(1);
                if (id === 'chapter-3') soundManager.setScene(2);
                if (id === 'chapter-4') soundManager.setScene(3);
            }
        }
    });
}, observerOptions);

chapters.forEach(chapter => {
    observer.observe(chapter);
});

// Interactive Text (Existing)
const interactiveTexts = document.querySelectorAll('.interactive-text');
interactiveTexts.forEach(text => {
    text.addEventListener('click', () => {
        const revealContent = text.getAttribute('data-reveal');
        text.innerText = revealContent;
        text.style.cursor = 'default';
        text.style.color = '#fff';
    });
});
