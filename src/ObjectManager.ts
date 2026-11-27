import { vec4 } from 'gl-matrix';
import GameObject from './gameobjects/GameObject';
import { getDevice } from './rendering/gpuDeviceRef';
import { getViewProj } from './rendering/cameraRef'
import Material from './materials/Material';
import type Scene from './scenes/Scene';

import TextureMaterial from './materials/TextureMaterial';
import { getObjectBindGroupLayout } from './rendering/pipelineConfig';
import toonShaderSource from './shaders/toon.wgsl?raw';
import * as Textures from './utils/textures';
import { getTime } from './utils/time';

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

  // we store a map from gameobject to its corresponding render data,
  // which includes the uniform buffer and bind group for that object
  private readonly renderData = new Map<GameObject, ObjectRenderData>();
  private readonly device: GPUDevice;

  lightDir: vec4 = vec4.fromValues(0.5, 0.8, 0.2, 0.0);

  sceneRef: Scene | null = null;
  defaultMaterial: Material | null = null;

  constructor() {
    this.device = getDevice();
  }

  async setupObjectManager(): Promise<void> {
    // Any setup logic for the ObjectManager can go here
    const defaultImage = Textures.getTexture('default');
    this.defaultMaterial = new TextureMaterial(
        defaultImage,
        toonShaderSource
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
      layout: getObjectBindGroupLayout(),
      entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
    });

    object.start();

    this.objects.add(object);

    if (object.drawable)
    {
      this.renderData.set(object, { uniformBuffer, bindGroup });
    }

    return object;
  }

  update(dt: number): void {
    for (const object of [...this.objects]) {
      if (this.objects.has(object)) 
      {
        object.update(dt);
      }
    }
  }

  draw(pass: GPURenderPassEncoder): void {
    const viewProj = getViewProj();

    let currentPipeline: GPURenderPipeline | null = null;

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
      uniforms[39] = getTime().time; // Current time in seconds

      this.device.queue.writeBuffer(
        renderData.uniformBuffer,
        0,
        uniforms,
      );
      
      const material = object.material ?? this.defaultMaterial!;

      // switch pipelines if this object uses a different shader/pipeline
      if (material.pipeline !== currentPipeline) {
        pass.setPipeline(material.pipeline);
        currentPipeline = material.pipeline;
      }

      pass.setBindGroup(0, renderData.bindGroup);
      if (material.bindGroup) {
        pass.setBindGroup(1, material.bindGroup);
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

