import { vec3 } from 'gl-matrix';
import GameObject from '../GameObject';
import Icosphere from '../../drawables/Icosphere';
import InstancedMaterial from '../../materials/InstancedMaterial';
import ComputeShader from '../../compute/ComputeShader';
import { getDevice } from '../../rendering/gpuDeviceRef';

import pheromoneComputeShader from '../../compute/pheromoneCompute.wgsl?raw';
import pheromoneGridComputeShader from '../../compute/pheromoneGridCompute.wgsl?raw';

export const MAX_PHEROMONES = 200000;
const FLOATS_PER_INSTANCE = 8; // vec4(x, y, z, scale) + vec4(r, g, b, a)

// 3D Grid dimensions: 128 x 32 x 128 = 524,288 cells (~4 MB)
export const PHEROMONE_GRID_X = 128;
export const PHEROMONE_GRID_Y = 32;
export const PHEROMONE_GRID_Z = 128;
export const PHEROMONE_CELL_SIZE = 0.5;
export const PHEROMONE_WORLD_HALF_X = (PHEROMONE_GRID_X * PHEROMONE_CELL_SIZE) * 0.5;
export const PHEROMONE_WORLD_HALF_Z = (PHEROMONE_GRID_Z * PHEROMONE_CELL_SIZE) * 0.5;
export const PHEROMONE_TOTAL_CELLS = PHEROMONE_GRID_X * PHEROMONE_GRID_Y * PHEROMONE_GRID_Z;

export default class PheromoneSystemGO extends GameObject {
  private instanceData = new Float32Array(MAX_PHEROMONES * FLOATS_PER_INSTANCE);
  private instancedMaterial: InstancedMaterial;

  // Settings
  private sphereLifetime = 15.0;
  private gridDecay = 0.15;
  private gridMax = this.gridDecay * this.sphereLifetime; // max pheromone value in grid cells

  // GPU buffers
  private pheromoneGridBuffer: GPUBuffer;
  private pheromoneHeadBuffer: GPUBuffer;

  private sphereParamsBuffer: GPUBuffer;
  private sphereParamsData = new ArrayBuffer(16);
  private sphereParamsF32 = new Float32Array(this.sphereParamsData);
  private sphereParamsU32 = new Uint32Array(this.sphereParamsData);

  private gridParamsBuffer: GPUBuffer;
  private gridParamsData = new ArrayBuffer(16);
  private gridParamsF32 = new Float32Array(this.gridParamsData);
  private gridParamsU32 = new Uint32Array(this.gridParamsData);

  private rawPheromoneBuffer: GPUBuffer;
  private pheromoneIndirectBuffer: GPUBuffer;
  private zeroU32: Uint32Array;

  // Compute shaders
  private sphereDecayCompute: ComputeShader;
  private gridDecayCompute: ComputeShader;

  constructor() {
    super(vec3.fromValues(0, 0, 0));

    // Subdivision 1 (80 tris) or 0 (20 tris) keeps instanced rendering fast
    const sphere = new Icosphere(vec3.fromValues(0, 0, 0), 0.1, 0);
    sphere.create();
    this.drawable = sphere;

    // All slots start at scale 0 (invisible) until ants write to them
    this.instancedMaterial = new InstancedMaterial(
      this.instanceData,
      MAX_PHEROMONES,
      FLOATS_PER_INSTANCE,
    );
    this.setMaterial(this.instancedMaterial);
    this.tag = 'pheromone_system';

    // SETUP COMPUTE SHADER BELOW
    const device = getDevice();

    // 3D Grid buffer: vec2<f32> per cell (x = Home, y = Food)
    this.pheromoneGridBuffer = device.createBuffer({
      size: PHEROMONE_TOTAL_CELLS * 8,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Atomic ring-buffer write index (u32)
    this.pheromoneHeadBuffer = device.createBuffer({
      size: 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this.sphereParamsBuffer = device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.gridParamsBuffer = device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // 200,000-slot raw unfiltered pheromoneInstances buffer
    this.rawPheromoneBuffer = device.createBuffer({
      size: MAX_PHEROMONES * 32,
      usage: GPUBufferUsage.STORAGE,
    });

    // 5 x 4-byte fields = 20 bytes
    this.pheromoneIndirectBuffer = device.createBuffer({
      size: 20,
      usage: GPUBufferUsage.INDIRECT | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Initialize static fields once (indexCount, instanceCount, firstIndex, baseVertex, firstInstance)
    const initialIndirect = new Uint32Array([sphere.indexCount, 0, 0, 0, 0]);
    device.queue.writeBuffer(this.pheromoneIndirectBuffer, 0, initialIndirect);

    // Reusable 4-byte zero buffer
    this.zeroU32 = new Uint32Array([0]);

    this.sphereDecayCompute = new ComputeShader(
      pheromoneComputeShader,
      [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      ],
      [
        { binding: 0, resource: { buffer: this.sphereParamsBuffer } },
        { binding: 1, resource: { buffer: this.rawPheromoneBuffer } },
        { binding: 2, resource: { buffer: this.instancedMaterial.instanceBuffer } },
        { binding: 3, resource: { buffer: this.pheromoneIndirectBuffer } },
      ],
    );

    this.gridDecayCompute = new ComputeShader(
      pheromoneGridComputeShader,
      [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      ],
      [
        { binding: 0, resource: { buffer: this.gridParamsBuffer } },
        { binding: 1, resource: { buffer: this.pheromoneGridBuffer } },
      ],
    );
  }

  override start(): void {}

  override update(dt: number): void {
    const device = getDevice();

    // update sphere decay params
    this.sphereParamsF32[0] = dt;
    this.sphereParamsU32[1] = MAX_PHEROMONES;
    this.sphereParamsF32[2] = this.sphereLifetime;
    this.sphereParamsF32[3] = 0;
    device.queue.writeBuffer(this.sphereParamsBuffer, 0, this.sphereParamsData);

    // update 3D grid decay params
    this.gridParamsF32[0] = dt;
    this.gridParamsF32[1] = this.gridDecay;
    this.gridParamsU32[2] = PHEROMONE_TOTAL_CELLS;
    this.gridParamsF32[3] = this.gridMax;
    device.queue.writeBuffer(this.gridParamsBuffer, 0, this.gridParamsData);

    // Reset the instance count in the indirect buffer
    device.queue.writeBuffer(this.pheromoneIndirectBuffer, 4, this.zeroU32);

    const encoder = device.createCommandEncoder();
    this.sphereDecayCompute.dispatch(encoder, MAX_PHEROMONES);
    this.gridDecayCompute.dispatch(encoder, PHEROMONE_TOTAL_CELLS);
    device.queue.submit([encoder.finish()]);
  }

  getInstanceBuffer(): GPUBuffer {
    return this.rawPheromoneBuffer;
  }

  getGridBuffer(): GPUBuffer {
    return this.pheromoneGridBuffer;
  }

  getHeadBuffer(): GPUBuffer {
    return this.pheromoneHeadBuffer;
  }

  getGridMax(): number {
    return this.gridMax;
  }

  override draw(pass: GPURenderPassEncoder): void {
    if (this.drawable)
    {
      this.drawable.drawIndirect(pass, this.pheromoneIndirectBuffer, 0);
    }
  }
}

