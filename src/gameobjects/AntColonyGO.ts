import { vec3 } from 'gl-matrix';
import GameObject from './GameObject';
import Cube from '../drawables/Cube';
import SpatialHash from '../utils/SpatialHash';
import Pheromone, { PheromoneType } from './pheromones/Pheromone';
import PheromoneSystemGO from './pheromones/PheromoneSystemGO';
import AntGO from './AntGO';
import type Material from '../materials/Material';

export default class AntColonyGO extends GameObject {
  ants: AntGO[] = [];
  foodCount = 0;
  colonyRadius = 1.5;

  // Separate spatial hashes so searching/returning ants only scan relevant pheromones
  pheromoneSystem: PheromoneSystemGO | null;

  private antMaterial: Material;
    
  constructor(position: vec3, antMaterial: Material) {
    super(position);

    const cube = new Cube(
      vec3.fromValues(1, 1, 1),
      vec3.fromValues(0, 0, 0)
    );
    cube.create();

    this.drawable = cube;
    this.tag = 'colony';
    this.collider = { type: 'sphere', radius: this.colonyRadius };
    this.antMaterial = antMaterial;

    this.pheromoneSystem = this.sceneRef?.spawnObject(new PheromoneSystemGO()) || null;

    if (!this.pheromoneSystem) {
      console.error('Failed to spawn PheromoneSystemGO for AntColonyGO');
    }
  }

  override start(): void {}

  override update(dt: number): void {
    // if an ant is within the colony radius and it is returning, it should return to the colony

    // for (const ant of this.ants) {
    //     const distanceToColony = vec3.distance(this.position, ant.position);
    //     if (distanceToColony <= this.colonyRadius && ant.getState() === 'returning') {
    //         this.returnAnt(ant);
    //         this.spawnAnt();
    //     }
    // }
  }

  spawnAnt(): AntGO {
    const ant = new AntGO(vec3.clone(this.position));
    ant.setColony(this);
    ant.setMaterial(this.antMaterial);
    ant.setColor(vec3.fromValues(0.7, 0.2, 0.2)); // Set ant color to red

    this.ants.push(ant);
    this.sceneRef?.spawnObject(ant);
    return ant;
  }

  spawnAnts(count: number): void {
    for (let i = 0; i < count; i++) {
      this.spawnAnt();
    }
  }

  /** Called by a returning ant when it reaches the colony. */
  returnAnt(ant: AntGO): void {
    this.foodCount += 1;
    this.ants = this.ants.filter((a) => a !== ant);
    this.sceneRef?.destroyObject(ant);
  }

  addPheromone(position: vec3, type: PheromoneType): void {
    this.pheromoneSystem?.addPheromone(position, type);
  }

  queryPheromones(type: PheromoneType, center: vec3, radius: number): Pheromone[] {
    return this.pheromoneSystem?.queryPheromones(type, center, radius) || [];
  }

}

