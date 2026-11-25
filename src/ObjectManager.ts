import { mat4 } from 'gl-matrix';
import GameObject from './GameObject';
import { getDevice } from './rendering/gpuDevice';
import { getViewProj } from './rendering/cameraRef'

type ObjectRenderData = {
  uniformBuffer: GPUBuffer;
  bindGroup: GPUBindGroup;
};

export default class ObjectManager {
  private readonly objects = new Set<GameObject>();
  private readonly renderData = new Map<GameObject, ObjectRenderData>();
  private readonly device: GPUDevice;
  private readonly pipeline: GPURenderPipeline;

  constructor(pipeline: GPURenderPipeline) {
    this.pipeline = pipeline;
    this.device = getDevice();
  }

  add<T extends GameObject>(object: T): T {
    if (this.objects.has(object)) return object;

    const uniformBuffer = this.device.createBuffer({
      size: 36 * 4, // model matrix + viewProj matrix + color
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
    for (const object of this.objects) {
      const renderData = this.renderData.get(object);
      if (!renderData) continue;

      const uniforms = new Float32Array(36);
      uniforms.set(object.getModelMatrix(), 0); // This object's transform
      uniforms.set(viewProj, 16);               // Shared camera transform
      uniforms.set([1, 0, 0, 1], 32);           // Red

      this.device.queue.writeBuffer(
        renderData.uniformBuffer,
        0,
        uniforms,
      );

      pass.setBindGroup(0, renderData.bindGroup);
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