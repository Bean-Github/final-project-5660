import { vec3 } from 'gl-matrix';
import GameObject from './GameObject';
import Cube from '../drawables/Cube';
import SpatialHash from '../utils/SpatialHash';
import Pheromone, { PheromoneType } from './pheromones/Pheromone';
import PheromoneSystemGO from './pheromones/PheromoneSystemGO';

import AntGO from './AntGO';
import AntSystemGO from './AntSystemGO';

import type Material from '../materials/Material';

export default class AntColonyGO extends GameObject {
  ants: AntGO[] = [];
  foodCount = 0;
  colonyRadius = 1.5;

  // Separate spatial hashes so searching/returning ants only scan relevant pheromones
  pheromoneSystem: PheromoneSystemGO | null;
  
  // the ant system handles rendering
  antSystem: AntSystemGO | null;
    
  constructor(position: vec3) {
    super(position);

    const cube = new Cube(
      vec3.fromValues(1, 1, 1),
      vec3.fromValues(0, 0, 0)
    );
    cube.create();

    this.drawable = cube;
    this.tag = 'colony';
    this.collider = { type: 'sphere', radius: this.colonyRadius };

    this.antSystem = this.sceneRef?.spawnObject(new AntSystemGO()) || null;
    this.pheromoneSystem = this.sceneRef?.spawnObject(new PheromoneSystemGO()) || null;

    if (!this.pheromoneSystem) {
      console.error('Failed to spawn PheromoneSystemGO for AntColonyGO');
    }
  }

  override start(): void {}

  override update(dt: number): void {}

  spawnAnt(): AntGO {
    const ant = new AntGO(vec3.clone(this.position));
    ant.setColony(this);
    // ant.setMaterial(this.antMaterial);
    // ant.setColor(vec3.fromValues(0.7, 0.2, 0.2)); // Set ant color to red

    this.ants.push(ant);
    this.sceneRef?.spawnObject(ant);

    this.antSystem?.addAnt(ant);

    return ant;
  }

  spawnAnts(count: number): void {
    for (let i = 0; i < count; i++) {
      this.spawnAnt();
    }
  }

  respawnAnt(ant: AntGO): void {
    // respawn the ant at the colony's position
    ant.reset(this.position);
  }

  /** Called by a returning ant when it reaches the colony. */
  returnAnt(ant: AntGO): void {
    this.foodCount += 1;
    this.ants = this.ants.filter((a) => a !== ant);
  }

  addPheromone(position: vec3, type: PheromoneType): void {
    this.pheromoneSystem?.addPheromone(position, type);
  }

  queryPheromones(type: PheromoneType, center: vec3, radius: number): Pheromone[] {
    return this.pheromoneSystem?.queryPheromones(type, center, radius) || [];
  }

}

