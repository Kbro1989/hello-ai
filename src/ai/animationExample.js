import { updateAnimations, evaluateMultiPhaseEasing, cubicEaseInOut, sineEaseInOut } from './loader.js';

// Example mesh setup
const mesh = {
    geometry: {
        attributes: {
            position: { array: new Float32Array(300), needsUpdate: false } // example 100 vertices
        }
    },
    userData: {
        frame: 0,
        accumTime: 0,
        blendProgress: 0,
        blendSpeed: 0.05, // default blend speed
        activeAnimation: null,
        nextAnimation: null,
    }
};

// Example animation frames (simplified)
function createFrame(offset) {
    return { vertices: Array.from({ length: 100 }, (_, i) => [i + offset, i + offset, i + offset]) };
}

// Normal animation
const walkAnimation = {
    frames: [createFrame(0), createFrame(1), createFrame(2)],
    frameTime: 0.033,
    easingCurve: cubicEaseInOut
};

// Blending animation
const runAnimation = {
    frames: [createFrame(10), createFrame(11), createFrame(12)],
    frameTime: 0.025,
    blendSpeed: 0.1,
    easingCurve: sineEaseInOut
};

// Multi-phase easing example
const cinematicAnimation = {
    frames: [createFrame(20), createFrame(21), createFrame(22)],
    frameTime: 0.033,
    easingCurve: {
        phases: [
            { start: 0, end: 0.3, curve: t => t * t },           // slow ease-in
            { start: 0.3, end: 0.7, curve: t => 3*t*t - 2*t*t*t}, // smooth mid acceleration
            { start: 0.7, end: 1, curve: t => 1 - (1 - t)*(1 - t)} // fast ease-out
        ]
    }
};

// Assign active animation
mesh.userData.activeAnimation = walkAnimation;

// Example update loop
function animate(deltaTime) {
    updateAnimations(mesh, deltaTime);

    // Example trigger to blend to another animation
    if (mesh.userData.frame === 2 && !mesh.userData.nextAnimation) {
        mesh.userData.nextAnimation = runAnimation;
        mesh.userData.blendProgress = 0;
    }

    // Example trigger to assign cinematic animation
    if (mesh.userData.frame === 5) {
        mesh.userData.activeAnimation = cinematicAnimation;
        mesh.userData.frame = 0;
        mesh.userData.accumTime = 0;
        mesh.userData.blendProgress = 0;
    }

    requestAnimationFrame((dt) => animate(dt * 0.001)); // convert ms to seconds
}

// Start the animation loop
animate(0.016); // ~60 FPS first frame