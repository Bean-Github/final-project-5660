import { vec3 } from 'gl-matrix';
import GameObject from './GameObject';
import ObjDrawable from '../drawables/ObjDrawable';
import antObj from '../assets/ant.obj?raw';
import { randomFloat, clamp } from '../utils/helpers'; // your util file
import PheremoneGO, { PheremoneType } from './PheremoneGO';

export default class AntGO extends GameObject {
  private timeBetweenPheremoneDrops = 1.0; // seconds
  private timeSinceLastPheremoneDrop = 0.0; // seconds

  // random movement settings
  private moveSpeed = 3.0; // units per second
  private maxTurnSpeed = 90.0; // degrees per second

  private targetRotationY = 0;
  private wanderTimer = 0;

  constructor(position: vec3) {
    super(position);

    const ant = new ObjDrawable(antObj);
    ant.create();

    this.drawable = ant;
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

    const fwd = this.forward;
    this.velocity[0] = fwd[0] * this.moveSpeed;
    this.velocity[2] = fwd[2] * this.moveSpeed;

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
  }
}