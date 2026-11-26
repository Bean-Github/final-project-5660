// materials/TextureMaterial.ts
import { getDevice } from '../rendering/gpuDeviceRef';
import lambertShader from '../shaders/lambert.wgsl?raw';
import Material, { type PipelineOptions } from './Material';

export default class TextureMaterial extends Material {
  private static bindGroupLayout: GPUBindGroupLayout | null = null;

  readonly pipeline: GPURenderPipeline;
  readonly bindGroup: GPUBindGroup;
  readonly texture: GPUTexture;

  private static getLayout(): GPUBindGroupLayout {
    if (!this.bindGroupLayout) {
      this.bindGroupLayout = getDevice().createBindGroupLayout({
        entries: [
          { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
          { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
        ],
      });
    }
    return this.bindGroupLayout;
  }

  constructor(
    albedoImage: ImageBitmap,
    shaderSource: string = lambertShader,
    options?: PipelineOptions,
  ) {
    super();

    const device = getDevice();
    const layout = TextureMaterial.getLayout();
    this.pipeline = Material.getOrCreatePipeline(shaderSource, layout, options);

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
        { binding: 0, resource: this.texture.createView() },
        { binding: 1, resource: sampler },
      ],
    });
  }

  destroy(): void {
    this.texture.destroy();
  }
}


