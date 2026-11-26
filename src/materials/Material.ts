import { getDevice } from '../rendering/gpuDeviceRef';
import { getPipeline } from '../rendering/gpuRenderPipelineRef';

export default class Material {
  readonly bindGroup: GPUBindGroup;
  readonly texture: GPUTexture;

  constructor(
    albedoImage: ImageBitmap,
  ) {
    const device = getDevice();
    const layout = getPipeline().getBindGroupLayout(1);

    this.texture = device.createTexture({
      size: [albedoImage.width, albedoImage.height],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING |
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


