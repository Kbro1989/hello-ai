import {
    updateAnimations,
    cubicEaseInOut,
    sineEaseInOut,
    createMultiPhaseEasingArray
} from './loader.js';

// ----------------------
// Example mesh (100 vertices)
// ----------------------
const mesh = {
    geometry: { attributes: { position: { array: new Float32Array(300), needsUpdate: false } } },
    userData: { frame: 0, accumTime: 0, blendProgress: 0, blendSpeed: 0.05, activeAnimation: null, nextAnimation: null }
};

// ----------------------
// Helper to create frame data
// ----------------------
const createFrame = (offset) => ({ vertices: Array.from({ length: 100 }, (_, i) => [i+offset, i+offset, i+offset]) });

// ----------------------
// Normal walk animation
// ----------------------
const walkAnimation = { frames: [createFrame(0), createFrame(1), createFrame(2)], frameTime: 0.033, easingCurve: cubicEaseInOut };

// ----------------------
// Blending run animation
// ----------------------
const runAnimation = { frames: [createFrame(10), createFrame(11), createFrame(12)], frameTime: 0.025, blendSpeed: 0.1, easingCurve: sineEaseInOut };

// ----------------------
// Multi-phase cinematic animation
// ----------------------
const cinematic = createMultiPhaseEasingArray([
    { duration: 0.3, easing: t => t*t },
    { duration: 0.4, easing: t => 3*t*t - 2*t*t*t },
    { duration: 0.3, easing: t => 1 - (1-t)*(1-t) }
], 60);

const cinematicAnimation = {
    frames: [createFrame(20), createFrame(21), createFrame(22)],
    frameTime: 0.033,
    easingCurve: cinematic.easingArray // use precomputed array for fast per-frame lookup
};

// ----------------------
// Start with walk
// ----------------------
mesh.userData.activeAnimation = walkAnimation;

// ----------------------
// Animation loop
// ----------------------
function animate(deltaTime) {
    updateAnimations(mesh, deltaTime);

    // Blend to run after first cycle
    if (mesh.userData.frame === 2 && !mesh.userData.nextAnimation) {
        mesh.userData.nextAnimation = runAnimation;
        mesh.userData.blendProgress = 0;
    }

    // Switch to cinematic animation at a later point
    if (mesh.userData.frame === 5) {
        mesh.userData.activeAnimation = cinematicAnimation;
        mesh.userData.frame = 0;
        mesh.userData.accumTime = 0;
        mesh.userData.blendProgress = 0;
    }

    requestAnimationFrame((dt) => animate(dt * 0.001)); // ms → seconds
}

// ----------------------
// Kick off loop
// ----------------------
animate(0.016); // first frame ~60 FPS