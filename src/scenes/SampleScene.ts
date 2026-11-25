/// <reference types="@webgpu/types" />

import { vec3, mat4 } from 'gl-matrix';
import type ObjectManager from '../ObjectManager';
import Scene, { loadBitmap } from './Scene';
import BallGO from '../gameobjects/BallGO';
import Material from '../materials/Material';
import antmanColorUrl from '../assets/antmancolor.png';
import AntGO from '../gameobjects/AntGO';

export default class SampleScene extends Scene {
    
  constructor(objectManager: ObjectManager) {
    super(objectManager);
  }

   async setupScene(objectManager: ObjectManager, device: GPUDevice, pipeline: GPURenderPipeline): Promise<void> {
    // Implementation for setting up the sample scene
    const image = await loadBitmap(antmanColorUrl);
    const material = new Material(
        device,
        pipeline.getBindGroupLayout(1),
        image,
    );

    const ball = new BallGO(vec3.fromValues(0, 0, 0));
    ball.setMaterial(material);

    const ant = new AntGO(vec3.fromValues(1, 0, 0));
    ant.setMaterial(material);

    objectManager.add(ball);
    objectManager.add(ant);
  }
}



