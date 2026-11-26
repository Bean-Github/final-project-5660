import { mat4, vec4 } from 'gl-matrix';
import GameObject from './gameobjects/GameObject';
import { getDevice } from './rendering/gpuDeviceRef';
import { getViewProj } from './rendering/cameraRef'
import Material from './materials/Material';
import type Scene from './scenes/Scene';
import { getPipeline } from './rendering/gpuRenderPipelineRef';

import { loadBitmap } from './utils/helpers';
import defaultImageUrl from './assets/default.png';

type ObjectRenderData = {
  uniformBuffer: GPUBuffer;
  bindGroup: GPUBindGroup;
};

let activeObjectManager: ObjectManager | null = null;

export function setObjectManager(objectManager: ObjectManager): void {
  activeObjectManager = objectManager;
}

export function getObjectManager(): ObjectManager {
  if (!activeObjectManager) {
    throw new Error('ObjectManager has not been initialized');
  }
  return activeObjectManager;
}

export function clearObjectManager(objectManager: ObjectManager): void {
  if (activeObjectManager === objectManager) activeObjectManager = null;
}

export default class ObjectManager {
  private readonly objects = new Set<GameObject>();
  private readonly renderData = new Map<GameObject, ObjectRenderData>();
  private readonly device: GPUDevice;
  private readonly pipeline: GPURenderPipeline;

  lightDir: vec4 = vec4.fromValues(0.5, 0.8, 1.0, 0.0);

  sceneRef: Scene | null = null;
  defaultMaterial: Material | null = null;

  constructor() {
    this.pipeline = getPipeline();
    this.device = getDevice();
  }

  async setupObjectManager(): Promise<void> {
    // Any setup logic for the ObjectManager can go here
    const defaultImage = await loadBitmap(defaultImageUrl);
    this.defaultMaterial = new Material(
        defaultImage
    );
  }

  setLightDirection(direction: vec4): void {
    vec4.normalize(this.lightDir, direction);
  }

  add<T extends GameObject>(object: T): T {
    if (this.objects.has(object)) return object;

    const uniformBuffer = this.device.createBuffer({
      size: 40 * 4, // model matrix + viewProj matrix + color + light direction
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
    });

    this.objects.add(object);
    this.renderData.set(object, { uniformBuffer, bindGroup });

    return object;
  }

  update(dt: number): void {
    for (const object of [...this.objects]) {
      if (this.objects.has(object)) object.update(dt);
    }
  }

  draw(pass: GPURenderPassEncoder): void {
    const viewProj = getViewProj();

    // light direction
    vec4.normalize(this.lightDir, this.lightDir);

    for (const object of this.objects) {
      const renderData = this.renderData.get(object);
      if (!renderData) continue;

      const uniforms = new Float32Array(40); // 16 for model, 16 for viewProj, 4 for color, 4 for lightDir
      uniforms.set(object.getModelMatrix(), 0); // This object's transform
      uniforms.set(viewProj, 16);               // Shared camera transform
      uniforms.set(object.color, 32);           // Color
      uniforms.set(this.lightDir, 36);                // Light direction

      this.device.queue.writeBuffer(
        renderData.uniformBuffer,
        0,
        uniforms,
      );
      
      pass.setBindGroup(0, renderData.bindGroup);

      if (object.material) {
        pass.setBindGroup(1, object.material.bindGroup);
      }
      else
      {
        // use a default material
        pass.setBindGroup(1, this.defaultMaterial!.bindGroup);
      }

      object.draw(pass);
    }
  }

  destroy<T extends GameObject>(object: T): void {
    if (!this.objects.delete(object)) return;

    object.destroy();
    this.renderData.get(object)?.uniformBuffer.destroy();
    this.renderData.delete(object);
  }

  destroyAll(): void {
    for (const object of [...this.objects]) this.destroy(object);
  }

  get count(): number {
    return this.objects.size;
  }

  getAll(): readonly GameObject[] {
    return [...this.objects];
  }
}

