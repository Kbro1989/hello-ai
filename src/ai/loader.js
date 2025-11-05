import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

export function createMeshFromModel(model) {
  if (!model.vertices || !model.faces) {
    console.warn("Model JSON missing vertices or faces, returning placeholder cube.");
    return new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x00ff00 })
    );
  }

  const geometry = new THREE.BufferGeometry();

  // Vertices
  const vertices = [];
  model.vertices.forEach(v => vertices.push(v[0], v[1], v[2]));
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

  // Faces
  const indices = [];
  model.faces.forEach(f => indices.push(f[0], f[1], f[2]));
  geometry.setIndex(indices);

  // UVs
  if (model.uvs) {
    const uvs = [];
    model.faces.forEach((f, i) => {
      const uvFace = model.uvs[i] || [[0,0],[0,0],[0,0]];
      uvFace.forEach(uv => uvs.push(uv[0], uv[1]));
    });
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  }

  // Colors / Textures
  let material;
  if (model.colors) {
    const colors = [];
    model.faces.forEach((f, i) => {
      const color = model.colors[i] || [1,1,1];
      for (let j = 0; j < 3; j++) colors.push(color[0], color[1], color[2]);
    });
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    material = new THREE.MeshStandardMaterial({ vertexColors: true });
  } else if (model.textureUrl) {
    const texture = new THREE.TextureLoader().load(model.textureUrl);
    material = new THREE.MeshStandardMaterial({ map: texture });
  } else {
    material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
  }

  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);

  // Multi-animation setup
  if (model.animations && model.animations.length) {
    mesh.userData.animations = model.animations;
    mesh.userData.activeAnimation = null;
    mesh.userData.nextAnimation = null;
    mesh.userData.blendProgress = 0; // 0 → current, 1 → next
    mesh.userData.frame = 0;
    mesh.userData.blendSpeed = 0.1; // adjust blending speed
  }

  return mesh;
}

/**
 * Update animations with full dynamic easing support
 * - Uses per-animation frameTime
 * - Supports per-animation blendSpeed
 * - Accepts per-frame easing arrays, easing functions, or multi-phase easing
 */
export function updateAnimations(mesh, deltaTime) {
    const data = mesh.userData;
    if (!data.activeAnimation) return;

    const active = data.activeAnimation;
    const next = data.nextAnimation;
    const positions = mesh.geometry.attributes.position.array;

    // Initialize accumulated time
    if (!data.accumTime) data.accumTime = 0;
    data.accumTime += deltaTime;

    const frameDuration = active.frameTime || 0.033; // default ~30 FPS

    while (data.accumTime >= frameDuration) {
        data.accumTime -= frameDuration;
        const frameIndex = data.frame;
        const activeFrame = active.frames[frameIndex];
        if (!activeFrame) break;

        if (next) {
            const nextFrame = next.frames[frameIndex % next.frames.length];

            // Blend progress
            const t = Math.min(Math.max(data.blendProgress, 0), 1);

            // Default cubic easing in/out
            let smoothT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

            // Optional per-frame dynamic easing
            if (active.easingCurve) {
                if (typeof active.easingCurve === "function") {
                    smoothT = active.easingCurve(t);
                } else if (Array.isArray(active.easingCurve)) {
                    const curve = active.easingCurve;
                    const maxIndex = curve.length - 1;
                    const idx = t * maxIndex;
                    const lower = Math.floor(idx);
                    const upper = Math.min(Math.ceil(idx), maxIndex);
                    const mix = idx - lower;
                    smoothT = curve[lower] * (1 - mix) + curve[upper] * mix;
                } else if (active.easingCurve.phases) {
                    // Multi-phase easing
                    const phases = active.easingCurve.phases;
                    smoothT = evaluateMultiPhaseEasing(phases, t);
                }
            }

            // Apply blending
            activeFrame.vertices.forEach((v, i) => {
                positions[i * 3]     = v[0] * (1 - smoothT) + nextFrame.vertices[i][0] * smoothT;
                positions[i * 3 + 1] = v[1] * (1 - smoothT) + nextFrame.vertices[i][1] * smoothT;
                positions[i * 3 + 2] = v[2] * (1 - smoothT) + nextFrame.vertices[i][2] * smoothT;
            });

            // Advance blending progress with per-animation blend speed
            const blendSpeed = next.blendSpeed ?? data.blendSpeed ?? 0.1;
            data.blendProgress += blendSpeed;

            if (data.blendProgress >= 1) {
                // Finish blend
                data.activeAnimation = next;
                data.nextAnimation = null;
                data.blendProgress = 0;
                data.frame = 0;
            }

        } else {
            // Normal animation without blending
            activeFrame.vertices.forEach((v, i) => {
                positions[i * 3]     = v[0];
                positions[i * 3 + 1] = v[1];
                positions[i * 3 + 2] = v[2];
            });

            // Advance frame index
            data.frame = (data.frame + 1) % active.frames.length;
        }
    }

    // Mark geometry as updated
    mesh.geometry.attributes.position.needsUpdate = true;
}

/**
 * Evaluate multi-phase easing for a normalized t (0..1)
 */
export function evaluateMultiPhaseEasing(phases, t) {
    t = Math.min(Math.max(t, 0), 1);
    for (const phase of phases) {
        if (t >= phase.start && t <= phase.end) {
            const localT = (t - phase.start) / (phase.end - phase.start);
            return phase.curve(localT);
        }
    }
    return t; // fallback linear
}

/**
 * Switch animation with blending
 */
export function playAnimation(mesh, animIndex) {
  if (!mesh.userData.animations) return;
  const newAnim = mesh.userData.animations[animIndex];
  if (!newAnim || mesh.userData.activeAnimation === newAnim) return;

  mesh.userData.nextAnimation = newAnim;
  mesh.userData.blendProgress = 0;
}

// Load model into scene
export async function loadModelIntoScene(scene, cacheId="0", group="0", file="0") {
  const modelData = await fetchModel(cacheId, group, file);
  const mesh = createMeshFromModel(modelData);
  scene.add(mesh);
  return mesh;
}

// Fetch model JSON
export async function fetchModel(cacheId="0", group="0", file="0") {
  const url = `/api/model?cache=${encodeURIComponent(cacheId)}&group=${encodeURIComponent(group)}&file=${encodeURIComponent(file)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Model fetch failed: ${res.status}`);
  return await res.json();
}

/**
 * Generates an array of easing values for a given number of frames.
 */
export function generateFrameEasing(frameCount, easingFunc) {
    const easingValues = [];
    for (let i = 0; i < frameCount; i++) {
        const t = i / (frameCount - 1); // normalized 0..1
        easingValues.push(easingFunc(t));
    }
    return easingValues;
}

/**
 * Example easing functions:
 */

// Cubic ease in/out
export const cubicEaseInOut = t =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// Quadratic ease in/out
export const quadEaseInOut = t =>
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

// Sinusoidal ease in/out
export const sineEaseInOut = t =>
    0.5 * (1 - Math.cos(Math.PI * t));

/**
 * Auto-generate multi-phase easing curves.
 */
export function createMultiPhaseEasing(phasesInput) {
    let currentStart = 0;
    const phases = phasesInput.map(p => {
        const phase = {
            start: currentStart,
            end: currentStart + p.duration,
            curve: p.easing
        };
        currentStart += p.duration;
        return phase;
    });

    // Ensure end of last phase is exactly 1
    if (phases.length > 0) phases[phases.length - 1].end = 1;

    return { phases };
}

/**
 * Generate a precomputed easing array from multi-phase easing.
 */
export function generateEasingArray(multiPhaseEasing, frameCount) {
    const easingValues = [];
    for (let i = 0; i < frameCount; i++) {
        const t = i / (frameCount - 1); // normalized 0..1
        easingValues.push(evaluateMultiPhaseEasing(multiPhaseEasing.phases, t));
    }
    return easingValues;
}

/**
 * Shortcut helper: create multi-phase easing and generate precomputed array
 */
export function createMultiPhaseEasingArray(phasesInput, frameCount) {
    const multiPhase = createMultiPhaseEasing(phasesInput);
    const easingArray = generateEasingArray(multiPhase, frameCount);
    return { ...multiPhase, easingArray };
}