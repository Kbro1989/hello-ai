// src/rsmv/viewer/jsondisplay.tsx
import * as React from "react";

export default function JsonDisplay({ obj }: { obj: unknown }) {
  return (
    <div style={{ maxHeight: "40vh", overflow: "auto", fontFamily: "monospace" }}>
      <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
        {obj === undefined ? "—" : JSON.stringify(obj, null, 2)}
      </pre>
    </div>
  );
}
