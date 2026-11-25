/// <reference types="@webgpu/types" />

import { vec3, mat4 } from 'gl-matrix';
import type Drawable from './rendering/Drawable';

export default abstract class GameObject {
  position: vec3;
  rotationX = 0;
  rotationY = 0;
  rotationZ = 0;

  drawable: Drawable | null = null;

  constructor(position: vec3) {
    this.position = vec3.clone(position);
    this.start();
  }

  abstract start(): void;
  abstract update(dt: number): void;

  draw(pass: GPURenderPassEncoder): void
  {
    if (this.drawable) {
      this.drawable.draw(pass);
    }
  }

  getModelMatrix(): mat4 {
    const model = mat4.create();
    mat4.translate(model, model, this.position);
    mat4.rotateX(model, model, this.rotationX);
    mat4.rotateY(model, model, this.rotationY);
    mat4.rotateZ(model, model, this.rotationZ);
    return model;
  }

  destroy(): void {
    this.drawable?.destroy();
  }
}



