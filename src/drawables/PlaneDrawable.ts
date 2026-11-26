import Drawable from './Drawable';

export default class PlaneDrawable extends Drawable {
  private readonly size: number;
  private readonly tiles: number;

  constructor(size = 20, tiles = 20) {
    super();
    this.size = size;
    this.tiles = tiles;
  }

  create(): void {
    const h = this.size * 0.5;
    const t = this.tiles;

    // 4 corners on the XZ plane (y = 0)
    const positions = new Float32Array([
      -h, 0, -h, 1,
      -h, 0,  h, 1,
       h, 0,  h, 1,
       h, 0, -h, 1,
    ]);

    // All normals point straight up (+Y)
    const normals = new Float32Array([
      0, 1, 0, 0,
      0, 1, 0, 0,
      0, 1, 0, 0,
      0, 1, 0, 0,
    ]);

    // UVs repeat `tiles` times across the plane
    const uvs = new Float32Array([
      0, 0,
      0, t,
      t, t,
      t, 0,
    ]);

    // CCW winding facing +Y
    const indices = new Uint32Array([0, 1, 2, 0, 2, 3]);

    this.upload(positions, normals, indices, uvs);
  }
}

