import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { GLTFExporter } from 'three-stdlib';
import { OBJExporter } from 'three-stdlib';
const ModelViewer = () => {
    const mountRef = useRef(null);
    const [model, setModel] = useState(null);
    const [color, setColor] = useState('#ffffff');
    useEffect(() => {
        if (!mountRef.current)
            return;
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
        const loadModel = async (modelId) => {
            try {
                const response = await fetch(`/api/model/${modelId}`);
                const modelData = await response.json();
                // Assuming modelData is a Three.js object
                const loadedModel = new THREE.ObjectLoader().parse(modelData);
                scene.add(loadedModel);
                setModel(loadedModel);
            }
            catch (error) {
                console.error('Error loading model:', error);
            }
        };
        loadModel('123'); // Load a dummy model for now
        return () => {
            mountRef.current?.removeChild(renderer.domElement);
        };
    }, []);
    const handleColorChange = (e) => {
        setColor(e.target.value);
        if (model) {
            const material = model.material;
            if (Array.isArray(material)) {
                material.forEach(m => m.color.set(e.target.value));
            }
            else {
                material.color.set(e.target.value);
            }
        }
    };
    const exportModel = (format) => {
        if (!model)
            return;
        if (format === 'gltf') {
            const exporter = new GLTFExporter();
            const options = { binary: true };
            exporter.parse(model, (result) => {
                const blob = new Blob([result], { type: 'model/gltf-binary' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'model.glb';
                link.click();
            }, (error) => {
                console.error('An error happened during parsing', error);
            }, options);
        }
        else {
            const exporter = new OBJExporter();
            const result = exporter.parse(model);
            const blob = new Blob([result], { type: 'text/plain' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'model.obj';
            link.click();
        }
    };
    return (_jsxs("div", { children: [_jsx("div", { ref: mountRef, style: { width: '800px', height: '600px' } }), _jsxs("div", { children: [_jsx("input", { type: "color", value: color, onChange: handleColorChange }), _jsx("button", { onClick: () => exportModel('gltf'), children: "Export as GLTF" }), _jsx("button", { onClick: () => exportModel('obj'), children: "Export as OBJ" })] })] }));
};
export default ModelViewer;
