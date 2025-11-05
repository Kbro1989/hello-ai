import * as THREE from 'https://unpkg.com/three@0.126.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.126.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.126.0/examples/jsm/loaders/GLTFLoader.js';

// 1. Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcccccc);

// Add GridHelper
const gridHelper = new THREE.GridHelper(10, 10);
scene.add(gridHelper);

// Add AxesHelper
const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

// 2. Camera Setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

// 3. Renderer Setup
const canvas = document.querySelector('#renderer-canvas');
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });

// 4. Camera Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // an animation loop is required when damping is enabled
controls.dampingFactor = 0.25;
controls.screenSpacePanning = false;
controls.maxPolarAngle = Math.PI / 2;

// 5. GLTF Loader
const loader = new GLTFLoader();

function loadGLTFModel(url) {
  loader.load(
    url,
    function (gltf) {
      scene.add(gltf.scene);
      console.log('Model loaded successfully!', gltf);
    },
    undefined,
    function (error) {
      console.error('An error occurred while loading the model:', error);
    }
  );
}

// --- Sample GLTF Model Loading (for testing) ---
// You can replace this with your own GLTF model URL
const sampleModelUrl = 'https://threejs.org/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf';
loadGLTFModel(sampleModelUrl);

// 6. Animation Loop
function animate() {
  requestAnimationFrame(animate);

  controls.update(); // only required if controls.enableDamping is set to true

  renderer.render(scene, camera);
}
animate();

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Chat Interface Logic
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const messagesDiv = document.getElementById('messages');

chatForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = chatInput.value.trim();
  if (message) {
    addMessage(message, 'user');
    chatInput.value = '';
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });
      const data = await response.json();
      addMessage(data.response, 'ai');
    } catch (error) {
      console.error('Error sending message to AI:', error);
      addMessage('Error: Could not connect to AI.', 'ai');
    }
  }
});

function addMessage(text, sender) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', sender);
  messageElement.textContent = text;
  messagesDiv.appendChild(messageElement);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

import './animation/animationDemo.js';