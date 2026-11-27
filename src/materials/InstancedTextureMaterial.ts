import { getDevice } from '../rendering/gpuDeviceRef';
import instancedShader from '../shaders/instancedbasic.wgsl?raw';
import { type PipelineOptions } from './Material';
import BaseInstancedMaterial from './BaseInstancedMaterial';

export default class InstancedTextureMaterial extends BaseInstancedMaterial {
  private static bindGroupLayout: GPUBindGroupLayout | null = null;
  readonly bindGroup: GPUBindGroup;
  readonly texture: GPUTexture;

  private static getLayout(): GPUBindGroupLayout {
    if (!this.bindGroupLayout) {
      this.bindGroupLayout = getDevice().createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: { type: 'read-only-storage' },
          },
          { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
          { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
        ],
      });
    }
    return this.bindGroupLayout;
  }

  constructor(
    instanceData: Float32Array,
    instanceCount: number,
    floatsPerInstance: number,
    albedoImage: ImageBitmap,
    shaderSource: string = instancedShader,
    options?: PipelineOptions,
  ) {
    const layout = InstancedTextureMaterial.getLayout();
    super(instanceData, instanceCount, floatsPerInstance, layout, shaderSource, options);

    const device = getDevice();
    this.texture = device.createTexture({
      size: [albedoImage.width, albedoImage.height],
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });

    device.queue.copyExternalImageToTexture(
      { source: albedoImage },
      { texture: this.texture },
      [albedoImage.width, albedoImage.height],
    );

    const sampler = device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      addressModeU: 'repeat',
      addressModeV: 'repeat',
    });

    this.bindGroup = device.createBindGroup({
      layout,
      entries: [
        { binding: 0, resource: { buffer: this.instanceBuffer } },
        { binding: 1, resource: this.texture.createView() },
        { binding: 2, resource: sampler },
      ],
    });
  }

  override destroy(): void {
    super.destroy();
    this.texture.destroy();
  }
}