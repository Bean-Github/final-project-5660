import { vec3 } from 'gl-matrix';
import GameObject from '../GameObject';
import Icosphere from '../../drawables/Icosphere';
import InstancedMaterial from '../../materials/InstancedMaterial';
import SpatialHash from '../../utils/SpatialHash';
import Pheromone, { PheromoneType } from './Pheromone';

const MAX_PHEROMONES = 1000000;
const FLOATS_PER_INSTANCE = 8; // vec4(x, y, z, scale) + vec4(r, g, b, a)

export default class PheromoneSystemGO extends GameObject {
  private pheromones: Pheromone[] = [];
  private instanceData = new Float32Array(MAX_PHEROMONES * FLOATS_PER_INSTANCE);
  private instancedMaterial: InstancedMaterial;

  homePheromones = new SpatialHash<Pheromone>(2.0);
  foodPheromones = new SpatialHash<Pheromone>(2.0);

  constructor() {
    super(vec3.fromValues(0, 0, 0));

    // ONE shared mesh for all pheromones
    const sphere = new Icosphere(vec3.fromValues(0, 0, 0), 0.1, 2);
    sphere.create();
    this.drawable = sphere;

    // Pre-allocated storage buffer for up to MAX_PHEROMONES
    this.instancedMaterial = new InstancedMaterial(this.instanceData, 0, FLOATS_PER_INSTANCE);
    this.setMaterial(this.instancedMaterial);
    this.tag = 'pheromone_system';
  }

  addPheromone(position: vec3, type: PheromoneType): void {
    if (this.pheromones.length >= MAX_PHEROMONES) return;

    const p = new Pheromone(vec3.clone(position), type);
    this.pheromones.push(p);
    this.getGrid(type).insert(p);
  }

  queryPheromones(type: PheromoneType, center: vec3, radius: number): Pheromone[] {
    return this.getGrid(type).queryRadius(center, radius);
  }

  override start(): void { }

  override update(dt: number): void {
    // age pheromones & remove expired ones
    for (let i = this.pheromones.length - 1; i >= 0; i--) {
      const p = this.pheromones[i];
      p.currentLifetime += dt;

      if (p.currentLifetime >= p.maxLifetime) {
        this.getGrid(p.type).remove(p);
        // Fast O(1) swap-and-pop removal
        this.pheromones[i] = this.pheromones[this.pheromones.length - 1];
        this.pheromones.pop();
      }
    }

    // pack active pheromones into the Float32Array
    const count = this.pheromones.length;
    for (let i = 0; i < count; i++) {
      const p = this.pheromones[i];
      const offset = i * FLOATS_PER_INSTANCE;

      // Shrink slightly as it evaporates
      const remaining = 1.0 - p.currentLifetime / p.maxLifetime;

      this.instanceData[offset + 0] = p.position[0];
      this.instanceData[offset + 1] = p.position[1];
      this.instanceData[offset + 2] = p.position[2];
      this.instanceData[offset + 3] = 1.0; // scale

      // Blue for LeavingHome, Red for ReturningFromFood
      if (p.type === PheromoneType.LeavingHome) {
        this.instanceData[offset + 4] = 0.0;
        this.instanceData[offset + 5] = 0.0;
        this.instanceData[offset + 6] = 1.0;
      } else {
        this.instanceData[offset + 4] = 1.0;
        this.instanceData[offset + 5] = 0.0;
        this.instanceData[offset + 6] = 0.0;
      }
      this.instanceData[offset + 7] = remaining; // alpha
    }

    // upload only the active slice to the GPU
    this.instancedMaterial.updateInstances(this.instanceData, count);
  }

  private getGrid(type: PheromoneType): SpatialHash<Pheromone> {
    return type === PheromoneType.LeavingHome
      ? this.homePheromones
      : this.foodPheromones;
  }
}

