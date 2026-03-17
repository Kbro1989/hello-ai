import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createRoot } from 'react-dom/client';
import ModelViewer from './components/ModelViewer';
const App = () => {
    return (_jsxs("div", { children: [_jsx("h1", { children: "AI-assisted 3D Model Viewer" }), _jsx(ModelViewer, {})] }));
};
const container = document.getElementById('app');
const root = createRoot(container);
root.render(_jsx(App, {}));
