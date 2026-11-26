import { getDevice } from '../rendering/gpuDeviceRef';

export default abstract class Drawable {
  count = 0;

  private positionBuffer?: GPUBuffer;
  private normalBuffer?: GPUBuffer;
  private indexBuffer?: GPUBuffer;
  private uvBuffer?: GPUBuffer;

  abstract create(): void;

  protected upload(
    positions: Float32Array,
    normals: Float32Array,
    indices: Uint32Array,
    uvs: Float32Array
  ): void {
    this.destroy();

    const device = getDevice();

    this.positionBuffer = device.createBuffer({
      size: positions.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    this.normalBuffer = device.createBuffer({
      size: normals.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    this.indexBuffer = device.createBuffer({
      size: indices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });

    this.uvBuffer = device.createBuffer({
      size: uvs.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(this.positionBuffer, 0, positions);
    device.queue.writeBuffer(this.normalBuffer, 0, normals);
    device.queue.writeBuffer(this.indexBuffer, 0, indices);
    device.queue.writeBuffer(this.uvBuffer, 0, uvs);

    this.count = indices.length;
  }

  draw(pass: GPURenderPassEncoder): void {
    if (!this.positionBuffer || !this.normalBuffer || !this.indexBuffer) {
      return;
    }

    pass.setVertexBuffer(0, this.positionBuffer);
    pass.setVertexBuffer(1, this.normalBuffer);
    pass.setIndexBuffer(this.indexBuffer, 'uint32');
    pass.setVertexBuffer(2, this.uvBuffer);
    pass.drawIndexed(this.count);
  }

  destroy(): void {
    this.positionBuffer?.destroy();
    this.normalBuffer?.destroy();
    this.indexBuffer?.destroy();
    this.uvBuffer?.destroy();

    this.positionBuffer = undefined;
    this.normalBuffer = undefined;
    this.indexBuffer = undefined;
    this.uvBuffer = undefined;
  }
}

