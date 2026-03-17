// src/rsmv/3d/rsmodel.ts
import * as THREE from "three";

/**
 * Minimal RSModel shim with properties used by scenenodes.tsx
 * Replace with the real RSModel implementation when available.
 */

export class RSModel {
  public targetAnimId: number = -1;
  public animations?: Record<number, any>;
  public currentAnimation?: any;
  public rootnode: THREE.Object3D;
  public name?: string;

  constructor(..._args: any[]) {
    // root node used for scene placement in scenenodes.tsx
    this.rootnode = new THREE.Group();
  }

  setAnimation(animId: number) {
    this.targetAnimId = Number(animId);
    if (this.animations && this.animations[animId]) {
      this.currentAnimation = this.animations[animId];
    }
  }

  loadAnimation(animId: number) {
    return Promise.resolve(this.animations?.[animId]);
  }

  addToScene(renderer: any) {
    // If the real renderer expects a ThreeJsSceneElement, this is a stub that
    // attaches the model's root node to the renderer.scene if present.
    try {
      if (renderer && renderer.scene && typeof renderer.scene.add === "function") {
        renderer.scene.add(this.rootnode);
      }
    } catch (e) {
      // no-op
    }
  }

  cleanup() {
    // detach / dispose children — minimal
    this.rootnode.clear?.();
  }
}

export default RSModel;