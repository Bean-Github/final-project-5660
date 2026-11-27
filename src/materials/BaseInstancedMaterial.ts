import { getDevice } from '../rendering/gpuDeviceRef';
import Material, { type PipelineOptions } from './Material';

export default abstract class BaseInstancedMaterial extends Material {
  readonly pipeline: GPURenderPipeline;
  abstract readonly bindGroup: GPUBindGroup;
  readonly instanceBuffer: GPUBuffer;
  protected readonly floatsPerInstance: number;
  instanceCount: number;
  readonly isInstanced = true;

  constructor(
    instanceData: Float32Array,
    instanceCount: number,
    floatsPerInstance: number,
    layout: GPUBindGroupLayout,
    shaderSource: string,
    options?: PipelineOptions,
  ) {
    super();

    const device = getDevice();
    this.instanceCount = instanceCount;
    this.floatsPerInstance = floatsPerInstance;
    this.pipeline = Material.getOrCreatePipeline(shaderSource, layout, options);

    this.instanceBuffer = device.createBuffer({
      size: instanceData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(this.instanceBuffer, 0, instanceData);
  }

  updateInstances(instanceData: Float32Array, instanceCount: number): void {
    this.instanceCount = instanceCount;
    if (instanceCount === 0) return;

    const floatCount = instanceCount * this.floatsPerInstance;
    getDevice().queue.writeBuffer(this.instanceBuffer, 0, instanceData, 0, floatCount);
  }

  destroy(): void {
    this.instanceBuffer.destroy();
  }
}