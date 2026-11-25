export default class Material {
  readonly bindGroup: GPUBindGroup;
  readonly texture: GPUTexture;

  constructor(
    device: GPUDevice,
    layout: GPUBindGroupLayout,
    image: ImageBitmap,
  ) {
    this.texture = device.createTexture({
      size: [image.width, image.height],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING |
             GPUTextureUsage.COPY_DST |
             GPUTextureUsage.RENDER_ATTACHMENT,
    });

    device.queue.copyExternalImageToTexture(
      { source: image },
      { texture: this.texture },
      [image.width, image.height],
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