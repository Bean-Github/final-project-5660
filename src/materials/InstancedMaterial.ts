import { getDevice } from '../rendering/gpuDeviceRef';
import instancedShader from '../shaders/instancedbasic.wgsl?raw';
import { type PipelineOptions } from './Material';
import BaseInstancedMaterial from './BaseInstancedMaterial';

export default class InstancedMaterial extends BaseInstancedMaterial {
  private static bindGroupLayout: GPUBindGroupLayout | null = null;
  readonly bindGroup: GPUBindGroup;

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
    floatsPerInstance: number,
    shaderSource: string = instancedShader,
    options?: PipelineOptions,
  ) {
    const layout = InstancedMaterial.getLayout();
    super(instanceData, instanceCount, floatsPerInstance, layout, shaderSource, options);

    this.bindGroup = getDevice().createBindGroup({
      layout,
      entries: [{ binding: 0, resource: { buffer: this.instanceBuffer } }],
    });
  }
}