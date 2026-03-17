
import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { GLTFExporter } from 'three-stdlib';
import { OBJExporter } from 'three-stdlib';

const ModelViewer: React.FC = () => {
    const mountRef = useRef<HTMLDivElement>(null);
    const [model, setModel] = useState<THREE.Object3D | null>(null);
    const [color, setColor] = useState('#ffffff');

    useEffect(() => {
        if (!mountRef.current) return;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xcccccc);

        const camera = new THREE.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
        camera.position.z = 5;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
        mountRef.current.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(5, 10, 7);
        scene.add(light);

        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        // Placeholder for model loading
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);
        setModel(cube);


        return () => {
            mountRef.current?.removeChild(renderer.domElement);
        };
    }, []);

    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setColor(e.target.value);
        if (model) {
            const material = (model as THREE.Mesh).material;
            if (Array.isArray(material)) {
                material.forEach(m => (m as THREE.MeshStandardMaterial).color.set(e.target.value));
            } else {
                (material as THREE.MeshStandardMaterial).color.set(e.target.value);
            }
        }
    };

    const exportModel = (format: 'gltf' | 'obj') => {
        if (!model) return;

        if (format === 'gltf') {
            const exporter = new GLTFExporter();
            const options = { binary: true };
            exporter.parse(model, (result) => {
                const blob = new Blob([result as ArrayBuffer], { type: 'model/gltf-binary' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `model.glb`;
                link.click();
            }, (error) => {
                console.error('An error happened during parsing', error);
            }, options);
        } else {
            const exporter = new OBJExporter();
            const result = exporter.parse(model);
            const blob = new Blob([result], { type: 'text/plain' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `model.obj`;
            link.click();
        }
    };

    return (
        <div>
            <div ref={mountRef} style={{ width: '800px', height: '600px' }}></div>
            <div>
                <input type="color" value={color} onChange={handleColorChange} />
                <button onClick={() => exportModel('gltf')}>Export as GLTF</button>
                <button onClick={() => exportModel('obj')}>Export as OBJ</button>
            </div>
        </div>
    );
};

export default ModelViewer;
