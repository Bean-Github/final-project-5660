/// <reference types="@webgpu/types" />

import { vec3, mat4 } from 'gl-matrix';
import type Drawable from '../rendering/Drawable';
import type Material from '../materials/Material';

export default abstract class GameObject {
  position: vec3;
  rotationX = 0;
  rotationY = 0;
  rotationZ = 0;

  color: vec3 = vec3.fromValues(1, 1, 1);

  drawable: Drawable | null = null;

  material: Material | null = null;

  setMaterial(material: Material): void {
    this.material = material;
  }

  constructor(position: vec3) {
    this.position = vec3.clone(position);
    this.start();
  }

  abstract start(): void;
  abstract update(dt: number): void;

  setColor(color: vec3): void {
    this.color = vec3.clone(color);
  }

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



