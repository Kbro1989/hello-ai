
import React from 'react';
import ReactDOM from 'react-dom';
import ModelViewer from './components/ModelViewer';

const App: React.FC = () => {
    return (
        <div>
            <h1>AI-assisted 3D Model Viewer</h1>
            <ModelViewer />
        </div>
    );
};

ReactDOM.render(<App />, document.getElementById('app'));
