/// <reference types="@webgpu/types" />

import { vec3, mat4 } from 'gl-matrix';
import type ObjectManager from '../ObjectManager';
import Scene, { loadBitmap } from './Scene';
import BallGO from '../gameobjects/BallGO';
import Material from '../materials/Material';
import AntGO from '../gameobjects/AntGO';

import antmanColorUrl from '../assets/antmancolor.png';
import antColorUrl from '../assets/antskin.png';

export default class SampleScene extends Scene {
    
  constructor(objectManager: ObjectManager) {
    super(objectManager);
  }

   async setupScene(objectManager: ObjectManager): Promise<void> {
    // Implementation for setting up the sample scene
    const image = await loadBitmap(antColorUrl);

    const material = new Material(
        image
    );

    //const ball = new BallGO(vec3.fromValues(0, 0, 0));
    //ball.setMaterial(material);

    const ant = new AntGO(vec3.fromValues(0, 0, 0));
    ant.setMaterial(material);

    ant.setColor(vec3.fromValues(0.7, 0.2, 0.2)); // Set ant color to red

    //objectManager.add(ball);
    objectManager.add(ant);
  }

    destroyScene(): void {
        
    }
}



