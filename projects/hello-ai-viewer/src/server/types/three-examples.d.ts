declare module 'three/examples/jsm/controls/OrbitControls' {
  export class OrbitControls {
    constructor(object: THREE.Camera, domElement?: HTMLElement);
    enabled: boolean;
    target: THREE.Vector3;
    minDistance: number;
    maxDistance: number;
    minZoom: number;
    maxZoom: number;
    minPolarAngle: number;
    maxPolarAngle: number;
    minAzimuthAngle: number;
    maxAzimuthAngle: number;
    enableDamping: boolean;
    dampingFactor: number;
    enableZoom: boolean;
    zoomSpeed: number;
    enableRotate: boolean;
    rotateSpeed: number;
    enablePan: boolean;
    panSpeed: number;
    screenSpacePanning: boolean;
    keyPanSpeed: number;
    autoRotate: boolean;
    autoRotateSpeed: number;
    keys: { LEFT: string; UP: string; RIGHT: string; BOTTOM: string; };
    mouseButtons: { LEFT: THREE.MOUSE; MIDDLE: THREE.MOUSE; RIGHT: THREE.MOUSE; };
    touches: { ONE: THREE.TOUCH; TWO: THREE.TOUCH; };
    target0: THREE.Vector3;
    position0: THREE.Vector3;
    zoom0: number;
    getPolarAngle(): number;
    getAzimuthalAngle(): number;
    listenToKeyEvents(domElement: HTMLElement): void;
    saveState(): void;
    reset(): void;
    update(): boolean;
    dispose(): void;
    [Symbol.iterator](): Iterator<any>;
  }
}

declare module 'three/examples/jsm/exporters/GLTFExporter' {
  export class GLTFExporter {
    constructor();
    parse(
      input: THREE.Object3D | THREE.Object3D[],
      onDone: (gltf: object) => void,
      options?: object
    ): void;
  }
}

declare module 'three/examples/jsm/exporters/STLExporter' {
  export class STLExporter {
    constructor();
    parse(scene: THREE.Object3D, options?: object): string;
  }
}
