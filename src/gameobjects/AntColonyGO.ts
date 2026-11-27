import { vec3 } from 'gl-matrix';
import GameObject from './GameObject';
import Cube from '../drawables/Cube';
import AntSystemGO from './AntSystemGO';
import PheromoneSystemGO from './pheromones/PheromoneSystemGO';
import FoodSystemGO from './FoodSystemGO';

export default class AntColonyGO extends GameObject {
  colonyRadius = 1.5;
  antSystem: AntSystemGO | null = null;
  pheromoneSystem: PheromoneSystemGO | null = null;
  foodSystem: FoodSystemGO | null = null;

  constructor(position: vec3) {
    super(position);

    const cube = new Cube(vec3.fromValues(1, 1, 1), vec3.fromValues(0, 0, 0));
    cube.create();

    this.drawable = cube;
    this.tag = 'colony';
    this.collider = { type: 'sphere', radius: this.colonyRadius };
  }

  override start(): void {
    this.pheromoneSystem = this.sceneRef?.spawnObject(new PheromoneSystemGO()) || null;
    if (!this.pheromoneSystem) {
      console.error('Failed to spawn PheromoneSystemGO');
      return;
    }
    this.foodSystem = this.sceneRef?.spawnObject(new FoodSystemGO()) || null;
    if (!this.foodSystem) {
      console.error('Failed to spawn FoodSystemGO');
      return;
    }

    this.antSystem = this.sceneRef?.spawnObject(
      new AntSystemGO(this.pheromoneSystem, this.foodSystem, this.position, this.colonyRadius),
    ) || null;
  }

  override update(dt: number): void {}

  spawnAnts(count: number): void {
    this.antSystem?.spawnAnts(count, this.position);
  }
}