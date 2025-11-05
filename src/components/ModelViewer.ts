import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { Model3D } from '../types/models';

export class ModelViewer {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private orbit: OrbitControls;
    private transform: TransformControls;
    private currentModel?: THREE.Object3D;
    private models: Map<string, Model3D>;

    constructor(private container: HTMLElement) {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.models = new Map();
        
        this.setupScene();
        this.setupControls();
        this.setupLights();
        this.setupEventListeners();
        this.animate();
    }

    private setupScene(): void {
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);
        
        this.camera.position.set(5, 5, 5);
        this.scene.background = new THREE.Color(0x2a2a2a);
        
        // Add grid helper
        const grid = new THREE.GridHelper(10, 10);
        this.scene.add(grid);
    }

    private setupControls(): void {
        this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbit.enableDamping = true;
        
        this.transform = new TransformControls(this.camera, this.renderer.domElement);
        this.transform.addEventListener('dragging-changed', (event) => {
            this.orbit.enabled = !event.value;
        });
        
        this.scene.add(this.transform);
    }

    private setupLights(): void {
        const ambient = new THREE.AmbientLight(0xffffff, 0.5);
        const directional = new THREE.DirectionalLight(0xffffff, 0.8);
        directional.position.set(5, 5, 5);
        directional.castShadow = true;
        
        this.scene.add(ambient, directional);
    }

    private setupEventListeners(): void {
        window.addEventListener('resize', () => {
            this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        });
    }

    private animate = (): void => {
        requestAnimationFrame(this.animate);
        this.orbit.update();
        this.renderer.render(this.scene, this.camera);
    }

    public async loadModel(model: Model3D): Promise<void> {
        if (this.currentModel) {
            this.scene.remove(this.currentModel);
        }

        // Create mesh from geometry
        const material = new THREE.MeshStandardMaterial();
        const mesh = new THREE.Mesh(model.geometry, material);
        
        // Apply textures if available
        if (model.textures?.diffuse) {
            const texture = new THREE.TextureLoader().load(model.textures.diffuse.data);
            material.map = texture;
        }

        this.currentModel = mesh;
        this.scene.add(mesh);
        this.transform.attach(mesh);
        this.models.set(model.id, model);
        
        // Center camera on model
        const box = new THREE.Box3().setFromObject(mesh);
        const center = box.getCenter(new THREE.Vector3());
        this.orbit.target.copy(center);
    }

    public setTransformMode(mode: 'translate' | 'rotate' | 'scale'): void {
        this.transform.setMode(mode);
    }

    public captureScreenshot(): string {
        this.renderer.render(this.scene, this.camera);
        return this.renderer.domElement.toDataURL();
    }
}