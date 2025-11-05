import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

export function loadLights(scene) {
	const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
	scene.add(ambientLight);

	const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
	directionalLight.position.set(5, 10, 7.5);
	scene.add(directionalLight);
}
