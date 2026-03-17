import React from 'react';
import { createRoot } from 'react-dom/client';
import ModelViewer from './components/ModelViewer';

const App: React.FC = () => {
    return (
        <div>
            <h1>AI-assisted 3D Model Viewer</h1>
            <ModelViewer />
        </div>
    );
};

const container = document.getElementById('app');
const root = createRoot(container!);
root.render(<App />);