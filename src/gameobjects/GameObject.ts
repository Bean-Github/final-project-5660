/// <reference types="@webgpu/types" />

import { vec3, mat4 } from 'gl-matrix';
import type Drawable from '../drawables/Drawable';
import type Material from '../materials/Material';
import Scene, { getScene } from '../scenes/Scene';
import ObjectManager, { getObjectManager } from '../ObjectManager';
import BaseInstancedMaterial from '../materials/BaseInstancedMaterial';

export type Collider =
  | { type: 'sphere'; radius: number }
  | { type: 'box'; halfExtents: vec3 };


export default abstract class GameObject {
  position: vec3;
  velocity: vec3 = vec3.fromValues(0, 0, 0);
  rotationX = 0;
  rotationY = 0;
  rotationZ = 0;

  color: vec3 = vec3.fromValues(1, 1, 1);

  drawable: Drawable | null = null;
  material: Material | null = null;
  
  tag = 'default';
  collider: Collider | null = null;

  setMaterial(material: Material): void {
    this.material = material;
  }

  constructor(position: vec3) {
    this.position = vec3.clone(position);
  }

  abstract start(): void;
  abstract update(dt: number): void;

  setColor(color: vec3): void {
    this.color = vec3.clone(color);
  }

  draw(pass: GPURenderPassEncoder): void
  {
    if (this.drawable) {
      const instanceCount =
        this.material instanceof BaseInstancedMaterial ? this.material.instanceCount : 1;

      if (instanceCount > 0) {
        this.drawable.draw(pass, instanceCount);
      }
    }
  }

  getModelMatrix(): mat4 {
    const model = mat4.create();
    mat4.translate(model, model, this.position);
    mat4.rotateY(model, model, this.rotationY); // yaw
    mat4.rotateX(model, model, this.rotationX); // pitch
    mat4.rotateZ(model, model, this.rotationZ); // roll
    return model;
  }

  /// HELPERS
  get right(): vec3 {
    const m = this.getModelMatrix();
    return vec3.normalize(vec3.create(), vec3.fromValues(m[0], m[1], m[2]));
  }

  get up(): vec3 {
    const m = this.getModelMatrix();
    return vec3.normalize(vec3.create(), vec3.fromValues(m[4], m[5], m[6]));
  }

  get forward(): vec3 {
    const m = this.getModelMatrix();
    // Use (-m[8], -m[9], -m[10]) instead if your meshes face -Z
    return vec3.normalize(vec3.create(), vec3.fromValues(m[8], m[9], m[10]));
  }

  moveLocal(rightAmount: number, upAmount: number, forwardAmount: number): void {
    vec3.scaleAndAdd(this.position, this.position, this.right, rightAmount);
    vec3.scaleAndAdd(this.position, this.position, this.up, upAmount);
    vec3.scaleAndAdd(this.position, this.position, this.forward, forwardAmount);
  }

  applyPhysics(dt: number, damping = 0): void {
    vec3.scaleAndAdd(this.position, this.position, this.velocity, dt);
    if (damping > 0) {
      vec3.scale(this.velocity, this.velocity, Math.max(0, 1 - damping * dt));
    }
  }

  lookAt(target: vec3): void {
    const dir = vec3.sub(vec3.create(), target, this.position);
    if (vec3.length(dir) < 1e-6) return;
    vec3.normalize(dir, dir);

    this.rotationY = Math.atan2(dir[0], dir[2]);
    this.rotationX = -Math.asin(Math.max(-1, Math.min(1, dir[1])));
  }

  get sceneRef(): Scene | null {
    return getScene();
  }
  get objectManagerRef(): ObjectManager | null {
    return getObjectManager();
  }

  // warning: this will not remove the object from the scene or object manager, it will just clean up resources
  destroy(): void {
    this.drawable?.destroy();
  }
}



