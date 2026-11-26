// rendering/pipelineConfig.ts
import { getDevice } from './gpuDeviceRef';

let canvasFormat: GPUTextureFormat | null = null;
let sampleCount = 4;
let objectBindGroupLayout: GPUBindGroupLayout | null = null;

export const VERTEX_BUFFER_LAYOUTS: GPUVertexBufferLayout[] = [
  {
    arrayStride: 16,
    attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x4' }], // position
  },
  {
    arrayStride: 16,
    attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x4' }], // normal
  },
  {
    arrayStride: 8,
    attributes: [{ shaderLocation: 2, offset: 0, format: 'float32x2' }], // uv
  },
];

export function initPipelineConfig(
  format: GPUTextureFormat,
  msaaCount: number,
): void {
  canvasFormat = format;
  sampleCount = msaaCount;

  // Shared Group 0 layout for every object's uniform buffer
  objectBindGroupLayout = getDevice().createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' },
      },
    ],
  });
}

export function getCanvasFormat(): GPUTextureFormat {
  if (!canvasFormat) throw new Error('PipelineConfig not initialized');
  return canvasFormat;
}

export function getSampleCount(): number {
  return sampleCount;
}

export function getObjectBindGroupLayout(): GPUBindGroupLayout {
  if (!objectBindGroupLayout) throw new Error('PipelineConfig not initialized');
  return objectBindGroupLayout;
}