import { vec3 } from 'gl-matrix';
import GameObject from './GameObject';
import ObjDrawable from '../drawables/ObjDrawable';
import InstancedTextureMaterial from '../materials/InstancedTextureMaterial';
import ComputeShader from '../compute/ComputeShader';
import { getDevice } from '../rendering/gpuDeviceRef';
import { getTime } from '../utils/time';
import * as Textures from '../utils/textures';
import PheromoneSystemGO, {
  MAX_PHEROMONES,
  PHEROMONE_GRID_X,
  PHEROMONE_GRID_Y,
  PHEROMONE_GRID_Z,
  PHEROMONE_CELL_SIZE,
  PHEROMONE_WORLD_HALF_X,
  PHEROMONE_WORLD_HALF_Z,
} from './pheromones/PheromoneSystemGO';

import antObj from '../assets/ant.obj?raw';
import instancedAntShader from '../shaders/instancedant.wgsl?raw';
import antComputeShader from '../compute/antCompute.wgsl?raw';
import type FoodSystemGO from './FoodSystemGO';

const MAX_ANTS = 10000;
const FLOATS_PER_INSTANCE = 20; // mat4x4 model (16) + vec4 color (4)
const ANT_STRIDE_FLOATS = 24;   // 96 bytes per Ant struct
const ANT_STRIDE_BYTES = ANT_STRIDE_FLOATS * 4;

export default class AntSystemGO extends GameObject {
  private instancedMaterial: InstancedTextureMaterial;
  private instanceData = new Float32Array(MAX_ANTS * FLOATS_PER_INSTANCE);

  private antCount = 0;
  private colonyPos = vec3.create();
  private colonyRadius = 1.5;

  private moveSpeed = 3.0;
  private maxLifetime = 30.0;

  // GPU buffers
  private paramsBuffer: GPUBuffer;
  private paramsData = new ArrayBuffer(80); // 20 x 4 bytes
  private paramsF32 = new Float32Array(this.paramsData);
  private paramsU32 = new Uint32Array(this.paramsData);

  private antsBuffer: GPUBuffer;
  //private foodsBuffer: GPUBuffer;
  //private foodActiveBuffer: GPUBuffer;

  private antCompute: ComputeShader;

  private pheromoneSystem: PheromoneSystemGO;
  private foodSystem: FoodSystemGO;

  constructor(
    pheromoneSystem: PheromoneSystemGO,
    foodSystem: FoodSystemGO,
    colonyPos: vec3 = vec3.fromValues(0, 0, 0),
    colonyRadius = 1.5,
  ) {
    super(vec3.fromValues(0, 0, 0));
    this.pheromoneSystem = pheromoneSystem;
    this.foodSystem = foodSystem;

    vec3.copy(this.colonyPos, colonyPos);
    this.colonyRadius = colonyRadius;

    const antMesh = new ObjDrawable(antObj);
    antMesh.create();
    this.drawable = antMesh;
    this.setColor(vec3.fromValues(255 / 255, 66 / 255, 56 / 255));

    const antImage = Textures.getTexture('ant');
    this.instancedMaterial = new InstancedTextureMaterial(
      this.instanceData,
      0,
      FLOATS_PER_INSTANCE,
      antImage,
      instancedAntShader,
    );
    this.material = this.instancedMaterial;
    this.tag = 'ant_system';

    // SETUP COMPUTE SHADER BELOW
    const device = getDevice();

    this.paramsBuffer = device.createBuffer({
      size: 80,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.antsBuffer = device.createBuffer({
      size: MAX_ANTS * ANT_STRIDE_BYTES,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this.antCompute = new ComputeShader(
      antComputeShader,
      [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 6, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 7, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      ],
      [
        { binding: 0, resource: { buffer: this.paramsBuffer } },
        { binding: 1, resource: { buffer: this.antsBuffer } },
        { binding: 2, resource: { buffer: this.instancedMaterial.instanceBuffer } },
        { binding: 3, resource: { buffer: pheromoneSystem.getGridBuffer() } },
        { binding: 4, resource: { buffer: foodSystem.getFoodsBuffer() } },
        { binding: 5, resource: { buffer: foodSystem.getFoodActiveBuffer() } },
        { binding: 6, resource: { buffer: pheromoneSystem.getInstanceBuffer() } },
        { binding: 7, resource: { buffer: pheromoneSystem.getHeadBuffer() } },
      ],
    );
  }

  setColony(pos: vec3, radius: number): void {
    vec3.copy(this.colonyPos, pos);
    this.colonyRadius = radius;
  }

  spawnAnts(count: number, origin: vec3 = this.colonyPos): void {
    const toSpawn = Math.min(count, MAX_ANTS - this.antCount);
    if (toSpawn <= 0) return;

    const raw = new ArrayBuffer(toSpawn * ANT_STRIDE_BYTES);
    const f32 = new Float32Array(raw);
    const u32 = new Uint32Array(raw);

    for (let i = 0; i < toSpawn; i++) {
      const o = i * ANT_STRIDE_FLOATS;
      const angle = Math.random() * Math.PI * 2;
      const vx = Math.sin(angle) * this.moveSpeed;
      const vz = Math.cos(angle) * this.moveSpeed;

      f32[o + 0] = origin[0];
      f32[o + 1] = origin[1];
      f32[o + 2] = origin[2];
      f32[o + 3] = angle;

      f32[o + 4] = vx;
      f32[o + 5] = 0;
      f32[o + 6] = vz;
      u32[o + 7] = 0;

      f32[o + 8] = 0;
      f32[o + 9] = 0;
      f32[o + 10] = 0;
      f32[o + 11] = Math.random() * 0.5;

      f32[o + 12] = 0;
      f32[o + 13] = 0;
      f32[o + 14] = 0;
      f32[o + 15] = 0;

      f32[o + 16] = origin[0];
      f32[o + 17] = origin[1];
      f32[o + 18] = origin[2];
      f32[o + 19] = 0;

      f32[o + 20] = Math.random() * 5.0;
      u32[o + 21] = ((this.antCount + i + 1) * 747796405) >>> 0;
      u32[o + 22] = 1;
      u32[o + 23] = 0;
    }

    getDevice().queue.writeBuffer(
      this.antsBuffer,
      this.antCount * ANT_STRIDE_BYTES,
      raw,
    );

    this.antCount += toSpawn;
    this.instancedMaterial.instanceCount = this.antCount;
  }

  override start(): void {}

  override update(dt: number): void {
    if (this.antCount === 0) return;

    const device = getDevice();

    // Pack SimParams (80 bytes)
    this.paramsF32[0] = dt;
    this.paramsF32[1] = getTime().time;
    this.paramsU32[2] = this.antCount;
    this.paramsU32[3] = this.foodSystem.getFoodCount();

    this.paramsF32[4] = this.colonyPos[0];
    this.paramsF32[5] = this.colonyPos[1];
    this.paramsF32[6] = this.colonyPos[2];
    this.paramsF32[7] = this.colonyRadius;

    this.paramsU32[8] = PHEROMONE_GRID_X;
    this.paramsU32[9] = PHEROMONE_GRID_Y;
    this.paramsU32[10] = PHEROMONE_GRID_Z;
    this.paramsF32[11] = PHEROMONE_CELL_SIZE;

    this.paramsF32[12] = PHEROMONE_WORLD_HALF_X;
    this.paramsF32[13] = PHEROMONE_WORLD_HALF_Z;
    this.paramsU32[14] = MAX_PHEROMONES;
    this.paramsF32[15] = this.maxLifetime;

    this.paramsF32[16] = this.moveSpeed;
    this.paramsF32[17] = this.pheromoneSystem.getGridMax();
    this.paramsF32[18] = 0;
    this.paramsF32[19] = 0;

    device.queue.writeBuffer(this.paramsBuffer, 0, this.paramsData);

    const encoder = device.createCommandEncoder();
    this.antCompute.dispatch(encoder, this.antCount);
    device.queue.submit([encoder.finish()]);

    this.instancedMaterial.instanceCount = this.antCount;
  }

}