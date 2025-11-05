import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

let camera, renderer;

export function initScene() {
	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0x111111);

	camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
	camera.position.z = 5;

	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.body.appendChild(renderer.domElement);

	return scene;
}

export function animateScene(scene, camera, renderer, objects = []) {
	function animate() {
		requestAnimationFrame(animate);
		objects.forEach((obj) => obj.rotation && (obj.rotation.x += 0.01) && (obj.rotation.y += 0.01));
		renderer.render(scene, camera);
	}
	animate();
}

export { camera, renderer };
