// Cloudflare Worker + File System Access API polyfills

declare function showDirectoryPicker(options?: any): Promise<any>;
declare function showOpenFilePicker(options?: any): Promise<any>;
declare function showSaveFilePicker(options?: any): Promise<any>;

// Basic shims for dynamic imports or generated modules
declare module "generated/*" {
  const value: any;
  export = value;
}

// Ensure Three.js OrbitControls has event methods
declare module "three/examples/jsm/controls/OrbitControls.js" {
  import { EventDispatcher } from "three";
  export class OrbitControls extends EventDispatcher {
    constructor(object: any, domElement?: HTMLElement);
    update(): void;
    dispose(): void;
  }
}