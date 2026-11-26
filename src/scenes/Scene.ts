/// <reference types="@webgpu/types" />

import { vec3, mat4 } from 'gl-matrix';
import type ObjectManager from '../ObjectManager';
import type GameObject from '../gameobjects/GameObject';
import Material from '../materials/Material';

// helpers

export default abstract class Scene {
    private objectManagerRef: ObjectManager;

    constructor(objectManager: ObjectManager) {
        this.objectManagerRef = objectManager;
        objectManager.sceneRef = this;
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
        object.sceneRef = this;
        
        
        return this.objectManagerRef.add(object);
    }
  
}



