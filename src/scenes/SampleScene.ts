/// <reference types="@webgpu/types" />

import { vec3, vec2 } from 'gl-matrix';
import type ObjectManager from '../ObjectManager';
import Scene from './Scene';
import antColorUrl from '../assets/antskin.png';

import FoodGO from '../gameobjects/FoodGO';

import GroundGO from '../gameobjects/GroundGO';

import * as Helpers from '../utils/helpers';
import * as Physics from '../physics/physics';
import { screenToWorldRay } from '../utils/helpers';
import * as Mouse from '../utils/mouse';
import AntColonyGO from '../gameobjects/AntColonyGO';
import TextureMaterial from '../materials/TextureMaterial';
import toonShaderSource from '../shaders/toon.wgsl?raw';

export default class SampleScene extends Scene {
    
  constructor(objectManager: ObjectManager) {
    super(objectManager);
  }

    async setupScene(): Promise<void> {
        // Implementation for setting up the sample scene

        //const ball = new BallGO(vec3.fromValues(0, 0, 0));
        //ball.setMaterial(material);

        const colony = new AntColonyGO(vec3.fromValues(0, 0, 0));
        this.spawnObject(colony);

        colony.spawnAnts(400);

        // make plane
        const ground = new GroundGO(vec3.fromValues(0, 0, 0), vec2.fromValues(200, 200));
        this.spawnObject(ground);
    }

    // if you click the ground place a food there
    updateScene(dt: number): void {
        // get mouse and convert to a ray
        if (!Mouse.pos.isOverCanvas) return;

        if (Mouse.getMouseButtonDown(0)) 
        {
            const ray = screenToWorldRay(Mouse.pos.ndcX, Mouse.pos.ndcY);

            const intersection = Physics.intersectRayPlane(ray, vec3.fromValues(0, 0, 0), vec3.fromValues(0, 1, 0));

            if (intersection !== null) {
                // spawn food
                const food = new FoodGO(intersection.point);
                this.spawnObject(food);
            }
        }
    }

    destroyScene(): void {

    }
}



