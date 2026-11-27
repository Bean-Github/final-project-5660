import { vec3 } from 'gl-matrix';
import GameObject from './GameObject';
import Icosphere from '../drawables/Icosphere';
import InstancedMaterial from '../materials/InstancedMaterial';
import ComputeShader from '../compute/ComputeShader';
import { getDevice } from '../rendering/gpuDeviceRef';

import foodComputeShader from '../compute/foodCompute.wgsl?raw';

export const MAX_FOOD = 10000;
const FLOATS_PER_INSTANCE = 8; // vec4(x, y, z, scale) + vec4(r, g, b, a)

export default class FoodSystemGO extends GameObject {
  private instanceData = new Float32Array(MAX_FOOD * FLOATS_PER_INSTANCE);
  private instancedMaterial: InstancedMaterial;

  private foodCount = 0;
  private foodScale = 1.0;

  // GPU buffers
  private foodsBuffer: GPUBuffer;
  private foodActiveBuffer: GPUBuffer;
  private foodIndirectBuffer: GPUBuffer;

  private paramsBuffer: GPUBuffer;
  private paramsData = new ArrayBuffer(16);
  private paramsU32 = new Uint32Array(this.paramsData);
  private paramsF32 = new Float32Array(this.paramsData);

  private zeroU32 = new Uint32Array([0]);
  private foodCompute: ComputeShader;

  constructor() {
    super(vec3.fromValues(0, 0, 0));

    // Subdivision 1 (80 tris) keeps instanced food fast
    const sphere = new Icosphere(vec3.fromValues(0, 0, 0), 0.2, 1);
    sphere.create();
    this.drawable = sphere;

    this.instancedMaterial = new InstancedMaterial(
      this.instanceData,
      MAX_FOOD,
      FLOATS_PER_INSTANCE,
    );
    this.setMaterial(this.instancedMaterial);
    this.tag = 'food_system';

    const device = getDevice();

    this.foodsBuffer = device.createBuffer({
      size: MAX_FOOD * 16,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this.foodActiveBuffer = device.createBuffer({
      size: MAX_FOOD * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this.paramsBuffer = device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.foodIndirectBuffer = device.createBuffer({
      size: 20,
      usage:
        GPUBufferUsage.INDIRECT |
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_DST,
    });

    const initialIndirect = new Uint32Array([sphere.indexCount, 0, 0, 0, 0]);
    device.queue.writeBuffer(this.foodIndirectBuffer, 0, initialIndirect);

    this.foodCompute = new ComputeShader(
      foodComputeShader,
      [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      ],
      [
        { binding: 0, resource: { buffer: this.paramsBuffer } },
        { binding: 1, resource: { buffer: this.foodsBuffer } },
        { binding: 2, resource: { buffer: this.foodActiveBuffer } },
        { binding: 3, resource: { buffer: this.instancedMaterial.instanceBuffer } },
        { binding: 4, resource: { buffer: this.foodIndirectBuffer } },
      ],
    );
  }

  getFoodsBuffer(): GPUBuffer {
    return this.foodsBuffer;
  }

  getFoodActiveBuffer(): GPUBuffer {
    return this.foodActiveBuffer;
  }

  getFoodCount(): number {
    return this.foodCount;
  }

  addFood(position: vec3): void {
    if (this.foodCount >= MAX_FOOD) return;

    const index = this.foodCount;
    const foodData = new Float32Array([position[0], position[1], position[2], 0]);
    const activeData = new Uint32Array([1]); // set active to 1

    const device = getDevice();
    device.queue.writeBuffer(this.foodsBuffer, index * 16, foodData);
    device.queue.writeBuffer(this.foodActiveBuffer, index * 4, activeData);

    this.foodCount++;
  }

  setFoods(positions: vec3[]): void {
    const count = Math.min(positions.length, MAX_FOOD);
    this.foodCount = count;
    if (count === 0) return;

    const foodData = new Float32Array(count * 4);
    const activeData = new Uint32Array(count);

    for (let i = 0; i < count; i++) {
      foodData[i * 4 + 0] = positions[i][0];
      foodData[i * 4 + 1] = positions[i][1];
      foodData[i * 4 + 2] = positions[i][2];
      foodData[i * 4 + 3] = 0;
      activeData[i] = 1;
    }

    const device = getDevice();
    device.queue.writeBuffer(this.foodsBuffer, 0, foodData);
    device.queue.writeBuffer(this.foodActiveBuffer, 0, activeData);
  }

  override start(): void {}

  override update(_dt: number): void {
    const device = getDevice();

    // Always reset indirect instanceCount so empty food draws 0 instances
    device.queue.writeBuffer(this.foodIndirectBuffer, 4, this.zeroU32);

    if (this.foodCount === 0) return;

    // set the food count and food scale for the compute shader (positions 2 and 3 are padding)
    this.paramsU32[0] = this.foodCount;
    this.paramsF32[1] = this.foodScale;
    this.paramsU32[2] = 0;
    this.paramsU32[3] = 0;
    device.queue.writeBuffer(this.paramsBuffer, 0, this.paramsData);

    const encoder = device.createCommandEncoder();
    this.foodCompute.dispatch(encoder, this.foodCount);
    device.queue.submit([encoder.finish()]);
  }

  override draw(pass: GPURenderPassEncoder): void {
    if (this.drawable) {
      this.drawable.drawIndirect(pass, this.foodIndirectBuffer, 0);
    }
  }
}