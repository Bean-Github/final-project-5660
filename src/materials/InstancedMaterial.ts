import { getDevice } from '../rendering/gpuDeviceRef';
import instancedShader from '../shaders/instanced.wgsl?raw';
import Material, { type PipelineOptions } from './Material';

export default class InstancedMaterial extends Material {
  private static bindGroupLayout: GPUBindGroupLayout | null = null;

  readonly pipeline: GPURenderPipeline;
  readonly bindGroup: GPUBindGroup;
  readonly instanceBuffer: GPUBuffer;
  private readonly floatsPerInstance: number;
  instanceCount: number;

  private static getLayout(): GPUBindGroupLayout {
    if (!this.bindGroupLayout) {
      this.bindGroupLayout = getDevice().createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: { type: 'read-only-storage' },
          },
        ],
      });
    }
    return this.bindGroupLayout;
  }

  constructor(
    instanceData: Float32Array,
    instanceCount: number,
    floatsPerInstance: number = 8,
    shaderSource: string = instancedShader,
    options?: PipelineOptions,
  ) {
    super();

    const device = getDevice();
    const layout = InstancedMaterial.getLayout();
    this.instanceCount = instanceCount;
    this.floatsPerInstance = floatsPerInstance;
    this.pipeline = Material.getOrCreatePipeline(shaderSource, layout, options);

    this.instanceBuffer = device.createBuffer({
      size: instanceData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(this.instanceBuffer, 0, instanceData);

    this.bindGroup = device.createBindGroup({
      layout,
      entries: [{ binding: 0, resource: { buffer: this.instanceBuffer } }],
    });
  }

  updateInstances(instanceData: Float32Array, instanceCount: number): void {
    this.instanceCount = instanceCount;
    const byteCount = instanceCount * this.floatsPerInstance;

    if (instanceCount === 0) return;

    getDevice().queue.writeBuffer(
        this.instanceBuffer,
        0,
        instanceData,
        0,
        byteCount,
        );
    }

  destroy(): void {
    this.instanceBuffer.destroy();
  }
}