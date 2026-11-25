/// <reference types="@webgpu/types" />

import { vec3, mat4 } from 'gl-matrix';
import type ObjectManager from '../ObjectManager';

// helpers
export async function loadBitmap(url: string): Promise<ImageBitmap> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load texture: ${url}`);

  return createImageBitmap(await response.blob());
}

export default abstract class Scene {
    
    constructor(objectManager: ObjectManager) {
    
    }





  async setupScene(objectManager: ObjectManager, device: GPUDevice, pipeline: GPURenderPipeline): Promise<void>
  {
        
  }

  
}



