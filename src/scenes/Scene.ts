/// <reference types="@webgpu/types" />

import { vec3, mat4 } from 'gl-matrix';
import type ObjectManager from '../ObjectManager';
import type GameObject from '../gameobjects/GameObject';
import Material from '../materials/Material';

// helpers
let activeScene: Scene | null = null;

export function setScene(scene: Scene): void {
  activeScene = scene;
}

export function getScene(): Scene {
  if (!activeScene) {
    throw new Error('Scene has not been initialized');
  }
  return activeScene;
}

export function clearScene(scene: Scene): void {
  if (activeScene === scene) activeScene = null;
}

export default abstract class Scene {
    private objectManagerRef: ObjectManager;

    constructor(objectManager: ObjectManager) {
        this.objectManagerRef = objectManager;
    }

    async setupScene(): Promise<void>
    {

    }

    updateScene(dt: number): void
    { }

    destroyScene(): void
    { }


    // scene helpers
    get objectManager(): ObjectManager {
        return this.objectManagerRef;
    }

    spawnObject<T extends GameObject>(object: T): T {        
        return this.objectManagerRef.add(object);
    }

    destroyObject(object: GameObject): void {
        this.objectManagerRef.destroy(object);
    }
}



