// materials/Material.ts
import { getDevice } from '../rendering/gpuDeviceRef';
import {
  getCanvasFormat,
  getObjectBindGroupLayout,
  getSampleCount,
  VERTEX_BUFFER_LAYOUTS,
} from '../rendering/pipelineConfig';

export type PipelineOptions = {
  cullMode?: GPUCullMode;
  blend?: GPUBlendState;
  depthWriteEnabled?: boolean;
};

export default abstract class Material {
  private static pipelineCache = new Map<string, GPURenderPipeline>();

  abstract readonly pipeline: GPURenderPipeline;
  abstract readonly bindGroup: GPUBindGroup | null;

  // this will be called by subclasses to get or create a pipeline 
  // based on the shader source and options

  // if the material layout / source is unique, we will make a new
  // pipeline and add to the pipeline cache. Otherwise, just return the
  // existing pipeline from the cache
  protected static getOrCreatePipeline(
    shaderSource: string,
    materialBindGroupLayout?: GPUBindGroupLayout,
    options?: PipelineOptions, // by default, cullMode is back, depthWriteEnabled is true, and no blending
  ): GPURenderPipeline {
    const cacheKey = `${shaderSource}|${options?.cullMode ?? 'back'}|${options?.depthWriteEnabled ?? true}|${Boolean(options?.blend)}`;
    const cached = this.pipelineCache.get(cacheKey);
    if (cached) return cached;

    const device = getDevice();
    const shader = device.createShaderModule({ code: shaderSource });
    const layouts = materialBindGroupLayout
      ? [getObjectBindGroupLayout(), materialBindGroupLayout]
      : [getObjectBindGroupLayout()];

    const pipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: layouts }),
      vertex: {
        module: shader,
        entryPoint: 'vertexMain',
        buffers: VERTEX_BUFFER_LAYOUTS,
      },
      fragment: {
        module: shader,
        entryPoint: 'fragmentMain',
        targets: [{ format: getCanvasFormat(), blend: options?.blend }],
      },
      primitive: {
        topology: 'triangle-list',
        cullMode: options?.cullMode ?? 'back',
      },
      depthStencil: {
        format: 'depth24plus',
        depthWriteEnabled: options?.depthWriteEnabled ?? true,
        depthCompare: 'less',
      },
      multisample: { count: getSampleCount() },
    });

    this.pipelineCache.set(cacheKey, pipeline);
    return pipeline;
  }

  static clearCache(): void {
    this.pipelineCache.clear();
  }

  destroy(): void {}
}


