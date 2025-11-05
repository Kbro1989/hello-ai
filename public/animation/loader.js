export function updateAnimations(mesh, deltaTime) {
    // Placeholder for animation update logic
    const ua = mesh.userData;
    if (!ua.activeAnimation) return;

    ua.accumTime += deltaTime;
    const frameDuration = ua.activeAnimation.frameTime;
    const totalFrames = ua.a.frames.length;

    if (ua.accumTime >= frameDuration) {
        ua.accumTime -= frameDuration;
        ua.frame = (ua.frame + 1) % totalFrames;
        // In a real scenario, you'd update mesh geometry here based on ua.frame
    }
}

export function cubicEaseInOut(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function createMultiPhaseEasingArray(phases, steps) {
    const easingArray = new Array(steps);
    let totalDuration = 0;
    for (const phase of phases) {
        totalDuration += phase.duration;
    }

    let currentStep = 0;
    for (const phase of phases) {
        const phaseSteps = Math.round((phase.duration / totalDuration) * steps);
        for (let i = 0; i < phaseSteps; i++) {
            const t = i / (phaseSteps - 1);
            easingArray[currentStep++] = phase.easing(t);
        }
    }
    // Fill any remaining steps due to rounding
    while (currentStep < steps) {
        easingArray[currentStep++] = phases[phases.length - 1].easing(1);
    }
    return { easingArray };
}