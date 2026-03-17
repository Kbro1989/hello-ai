import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter';
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
    const handleColorChange = (e) => {
        setColor(e.target.value);
        if (model) {
            model.material.color.set(e.target.value);
        }
    };
    const exportModel = (format) => {
        if (!model)
            return;
        const exporter = format === 'gltf' ? new GLTFExporter() : new OBJExporter();
        const options = format === 'gltf' ? { binary: true } : {};
        exporter.parse(model, (result) => {
            const blob = new Blob([format === 'gltf' ? result : result], { type: 'text/plain' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `model.${format}`;
            link.click();
        }, options);
    };
    return (React.createElement("div", null,
        React.createElement("div", { ref: mountRef, style: { width: '800px', height: '600px' } }),
        React.createElement("div", null,
            React.createElement("input", { type: "color", value: color, onChange: handleColorChange }),
            React.createElement("button", { onClick: () => exportModel('gltf') }, "Export as GLTF"),
            React.createElement("button", { onClick: () => exportModel('obj') }, "Export as OBJ"))));
};
export default ModelViewer;
