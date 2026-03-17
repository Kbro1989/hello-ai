// src/rsmv/viewer/jsondisplay.tsx
import * as React from "react";
export default function JsonDisplay({ obj }) {
    return (React.createElement("div", { style: { maxHeight: "40vh", overflow: "auto", fontFamily: "monospace" } },
        React.createElement("pre", { style: { whiteSpace: "pre-wrap", margin: 0 } }, obj === undefined ? "—" : JSON.stringify(obj, null, 2))));
}
