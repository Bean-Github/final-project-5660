// Pheromone.ts
import { vec3 } from 'gl-matrix';

export const PheromoneType = {
  LeavingHome: 0,
  ReturningFromFood: 1,
} as const;
export type PheromoneType = typeof PheromoneType[keyof typeof PheromoneType];

export default class Pheromone {
  position: vec3;
  type: PheromoneType;
  currentLifetime = 0;
  readonly maxLifetime = 30.0;

  constructor(position: vec3, type: PheromoneType) {
    this.position = position;
    this.type = type;
  }

  getEvaporateT(): number {
    let t = this.currentLifetime / this.maxLifetime;
    return t;
  }
}