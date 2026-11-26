// materials/ShaderMaterial.ts
import Material, { type PipelineOptions } from './Material';

export default class ShaderMaterial extends Material {
  readonly pipeline: GPURenderPipeline;
  readonly bindGroup = null;

  constructor(shaderSource: string, options?: PipelineOptions) {
    super();
    this.pipeline = Material.getOrCreatePipeline(shaderSource, undefined, options);
  }
}