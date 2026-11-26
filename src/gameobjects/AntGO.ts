import { vec3 } from 'gl-matrix';
import GameObject from './GameObject';
import ObjDrawable from '../drawables/ObjDrawable';
import antObj from '../assets/ant.obj?raw';
import { randomFloat, clamp } from '../utils/helpers'; // your util file
import PheremoneGO, { PheremoneType } from './PheremoneGO';
import * as Physics from '../physics/physics';
import * as Helpers from '../utils/helpers';

export default class AntGO extends GameObject {
  private timeBetweenPheremoneDrops = 1.0; // seconds
  private timeSinceLastPheremoneDrop = 0.0; // seconds
  
  // random movement settings
  private moveSpeed = 3.0; // units per second
  private maxTurnSpeed = 180.0; // degrees per second

  private targetRotationY = 0;
  private wanderTimer = 0;
  
  // vision
  private foodDetectionRadius = 5.0; // units
  private foodDetectionAngle = 90.0; // degrees

  constructor(position: vec3) {
    super(position);

    const ant = new ObjDrawable(antObj);
    ant.create();

    this.drawable = ant;

    this.tag = 'ant';

    this.collider = { type: 'sphere', radius: 1.0 };
  }

  override start(): void {
    this.rotationY = randomFloat(0, Math.PI * 2);
    this.targetRotationY = this.rotationY;
  }

  override update(dt: number): void {
    // pick a new random heading periodically
    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0) {
      this.targetRotationY = this.rotationY + randomFloat(-Math.PI * 0.6, Math.PI * 0.6);
      this.wanderTimer = randomFloat(0.4, 1.5);
    }

    // smoothly turn toward the target heading (shortest angle)
    const angleDiff = Math.atan2(
      Math.sin(this.targetRotationY - this.rotationY),
      Math.cos(this.targetRotationY - this.rotationY),
    );
    const maxStep = this.maxTurnSpeed * (Math.PI / 180) * dt;
    this.rotationY += clamp(angleDiff, -maxStep, maxStep);

    this.velocity[0] = this.forward[0] * this.moveSpeed;
    this.velocity[2] = this.forward[2] * this.moveSpeed;

    this.velocity[1] -= 9.81 * dt;
    this.applyPhysics(dt);

    if (this.position[1] < 0) {
      this.position[1] = 0;
      this.velocity[1] = 0;
    }

    // spawn pheremone periodically
    this.timeSinceLastPheremoneDrop += dt;

    if (this.timeSinceLastPheremoneDrop >= this.timeBetweenPheremoneDrops) {
      this.timeSinceLastPheremoneDrop = 0;
      const pheremone = new PheremoneGO(vec3.clone(this.position), PheremoneType.LeavingHome);

      this.sceneRef?.spawnObject(pheremone);
    }


    // checking the environment for food and pheremones
        
    // const hit = sphereCast(
    //     allObjects,
    //     { origin: this.position, direction: this.forward },
    //     0.25, // ant body radius
    //     1.5,  // look-ahead distance
    //     { ignore: this, tag: 'obstacle' },
    // );

    // if (hit) {
    // // Steer away along the surface normal
    // this.targetRotationY = Math.atan2(hit.normal[0], hit.normal[2]);
    // }

    // smell nearby pheromones
    const pheromones = Physics.overlapSphere(this.position, 2.0, {
        ignore: this,
        tag: 'pheromone',
    });
    
    // smell out nearby food
    const nearbyFood = Physics.overlapSphere(this.position, this.foodDetectionRadius, {
        ignore: this,
        tag: 'food',
    });

    // cull out the nearby food by angle
    const cosHalfAngle = Math.cos((this.foodDetectionAngle * Math.PI) / 180);

    const filteredFood = nearbyFood.filter((food) => {
        const toFood = vec3.fromValues(
            food.position[0] - this.position[0],
            0,
            food.position[2] - this.position[2],
        );

        if (vec3.squaredLength(toFood) < 1e-6) return true;

        vec3.normalize(toFood, toFood);
        return vec3.dot(this.forward, toFood) >= cosHalfAngle;
    });

    // if there is nearby food, steer towards it
    if (filteredFood.length > 0) {
        // find closest food
        const closestFood = filteredFood.reduce((closest, food) => {
            const closestDist = vec3.distance(this.position, closest.position);
            const foodDist = vec3.distance(this.position, food.position);
            return foodDist < closestDist ? food : closest;
        }, filteredFood[0]);

        this.targetRotationY = Math.atan2(
            closestFood.position[0] - this.position[0],
            closestFood.position[2] - this.position[2]
        );
    }
    
    for (const food of nearbyFood) {
        // If the ant is close enough to the food, "eat" it
        const distanceToFood = vec3.distance(this.position, food.position);
        if (distanceToFood < 0.5) {
            this.sceneRef?.destroyObject(food);
            break; // Only eat one food at a time
        }
    }
  }
}

