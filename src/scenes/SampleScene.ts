/// <reference types="@webgpu/types" />

import { vec3, mat4 } from 'gl-matrix';
import type ObjectManager from '../ObjectManager';
import Scene, { loadBitmap } from './Scene';
import Material from '../materials/Material';

import AntGO from '../gameobjects/AntGO';
import antColorUrl from '../assets/antskin.png';
import antmanColorUrl from '../assets/antmancolor.png';

import FoodGO from '../gameobjects/FoodGO';

import * as Helpers from '../helpers';
import { screenToWorldRay } from '../helpers';
import * as Mouse from '../mouse';

export default class SampleScene extends Scene {
    
  constructor(objectManager: ObjectManager) {
    super(objectManager);
  }

    async setupScene(objectManager: ObjectManager): Promise<void> {
        // Implementation for setting up the sample scene
        const antImage = await loadBitmap(antColorUrl);

        const antMaterial = new Material(
            antImage
        );

        //const ball = new BallGO(vec3.fromValues(0, 0, 0));
        //ball.setMaterial(material);

        const ant = new AntGO(vec3.fromValues(0, 2, 0));
        ant.setMaterial(antMaterial);

        ant.setColor(vec3.fromValues(0.7, 0.2, 0.2)); // Set ant color to red

        //objectManager.add(ball);
        objectManager.add(ant);
    }

    // if you click the ground place a food there
    updateScene(dt: number): void {
        // get mouse and convert to a ray
        if (!Mouse.pos.isOverCanvas) return;

        if (Mouse.getMouseButtonDown(0)) 
        {
            const ray = screenToWorldRay(Mouse.pos.ndcX, Mouse.pos.ndcY);

            const intersection = Helpers.intersectRayPlane(ray, vec3.fromValues(0, 0, 0), vec3.fromValues(0, 1, 0));

            if (intersection !== null) {
                // spawn food
                const food = new FoodGO(intersection.point);
                this.objectManagerRef.add(food);
            }
        }
    }

    destroyScene(): void {

    }
}



