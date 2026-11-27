import { getDevice } from '../rendering/gpuDeviceRef';

export default class ComputeShader {
  readonly pipeline: GPUComputePipeline;
  readonly bindGroup: GPUBindGroup;

  constructor(
    shaderSource: string,
    layoutEntries: GPUBindGroupLayoutEntry[],
    bindEntries: GPUBindGroupEntry[],
    entryPoint = 'main',
  ) {
    const device = getDevice();

    const module = device.createShaderModule({ code: shaderSource });
    const bindGroupLayout = device.createBindGroupLayout({ entries: layoutEntries });

    this.pipeline = device.createComputePipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
      compute: { module, entryPoint },
    });

    this.bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: bindEntries,
    });
  }

  dispatch(encoder: GPUCommandEncoder, totalItems: number, workgroupSize = 64): void {
    if (totalItems === 0) return;

    const pass = encoder.beginComputePass();
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    // Round up so every item gets a thread
    pass.dispatchWorkgroups(Math.ceil(totalItems / workgroupSize));
    pass.end();
  }
}