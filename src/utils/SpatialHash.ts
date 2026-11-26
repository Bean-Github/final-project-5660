import { vec3 } from 'gl-matrix';

export interface SpatialItem {
  position: vec3;
}

export default class SpatialHash<T extends SpatialItem> {
  private cellSize: number;
  private cells = new Map<string, Set<T>>();
  private itemToCell = new Map<T, string>();

  constructor(cellSize = 2.0) {
    this.cellSize = cellSize;
  }

  private getCellCoords(x: number, z: number): [number, number] {
    return [
      Math.floor(x / this.cellSize),
      Math.floor(z / this.cellSize),
    ];
  }

  private getKey(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  insert(item: T): void {
    const [cx, cz] = this.getCellCoords(item.position[0], item.position[2]);
    const key = this.getKey(cx, cz);

    let cell = this.cells.get(key);
    if (!cell) {
      cell = new Set<T>();
      this.cells.set(key, cell);
    }

    cell.add(item);
    this.itemToCell.set(item, key);
  }

  remove(item: T): void {
    const key = this.itemToCell.get(item);
    if (!key) return;

    const cell = this.cells.get(key);
    if (cell) {
      cell.delete(item);
      if (cell.size === 0) {
        this.cells.delete(key);
      }
    }

    this.itemToCell.delete(item);
  }

  /** Call if a stored object moves (not needed for static pheromones). */
  update(item: T): void {
    const [cx, cz] = this.getCellCoords(item.position[0], item.position[2]);
    const newKey = this.getKey(cx, cz);
    const oldKey = this.itemToCell.get(item);

    if (oldKey === newKey) return;

    this.remove(item);
    this.insert(item);
  }

  queryRadius(center: vec3, radius: number): T[] {
    const results: T[] = [];
    const radiusSq = radius * radius;

    const [minX, minZ] = this.getCellCoords(center[0] - radius, center[2] - radius);
    const [maxX, maxZ] = this.getCellCoords(center[0] + radius, center[2] + radius);

    for (let cx = minX; cx <= maxX; cx++) {
      for (let cz = minZ; cz <= maxZ; cz++) {
        const cell = this.cells.get(this.getKey(cx, cz));
        if (!cell) continue;

        for (const item of cell) {
          const dx = item.position[0] - center[0];
          const dz = item.position[2] - center[2];
          if (dx * dx + dz * dz <= radiusSq) {
            results.push(item);
          }
        }
      }
    }

    return results;
  }

  clear(): void {
    this.cells.clear();
    this.itemToCell.clear();
  }

  get size(): number {
    return this.itemToCell.size;
  }
}