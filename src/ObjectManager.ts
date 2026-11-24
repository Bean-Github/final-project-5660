import GameObject from './GameObject';

export default class ObjectManager {
  private readonly objects = new Set<GameObject>();

  add<T extends GameObject>(object: T): T {
    this.objects.add(object);
    return object;
  }

  getAll(): readonly GameObject[] {
    return [...this.objects];
  }

  destroy(object: GameObject): void {
    object.destroy();
    
    this.objects.delete(object);
  }

  destroyAll(): void {
    for (const object of [...this.objects]) {
      object.destroy();
    }

    this.objects.clear();
  }

  get count(): number {
    return this.objects.size;
  }

  update(dt: number): void {
    // objects added during this update start next frame.
    for (const object of [...this.objects]) {
      if (this.objects.has(object)) {
        object.update(dt);
      }
    }
  }

  draw(pass: GPURenderPassEncoder) {
    for (const object of [...this.objects]) {
      if (this.objects.has(object)) {
        object.draw(pass);
      }
    }
  }
}
