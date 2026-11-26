import { vec3 } from 'gl-matrix';
import Drawable from './Drawable';

class Cube extends Drawable {
  indices!: Uint32Array;
  positions!: Float32Array;
  normals!: Float32Array;
  uvs!: Float32Array;
  center: vec3;
  size: vec3;

  constructor(
    size: vec3 = vec3.fromValues(1, 1, 1),
    center: vec3 = vec3.fromValues(0, 0, 0)
  ) {
    super();
    this.size = vec3.clone(size);
    this.center = vec3.clone(center);
  }

  create() {
    const hx = this.size[0] * 0.5;
    const hy = this.size[1] * 0.5;
    const hz = this.size[2] * 0.5;
    const [cx, cy, cz] = this.center;

    // 6 faces * 4 vertices = 24 vertices (separate vertices per face for crisp flat normals)
    const faces: Array<{ normal: [number, number, number]; corners: [number, number, number][] }> = [
      { // Front (+Z)
        normal: [0, 0, 1],
        corners: [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]],
      },
      { // Back (-Z)
        normal: [0, 0, -1],
        corners: [[hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz]],
      },
      { // Right (+X)
        normal: [1, 0, 0],
        corners: [[hx, -hy, hz], [hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz]],
      },
      { // Left (-X)
        normal: [-1, 0, 0],
        corners: [[-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz]],
      },
      { // Top (+Y)
        normal: [0, 1, 0],
        corners: [[-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], [-hx, hy, -hz]],
      },
      { // Bottom (-Y)
        normal: [0, -1, 0],
        corners: [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz]],
      },
    ];

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const faceUVs: [number, number][] = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ];

    faces.forEach((face, faceIndex) => {
      const baseVertex = faceIndex * 4;
      const [nx, ny, nz] = face.normal;

      for (let i = 0; i < 4; i++) {
        const [x, y, z] = face.corners[i];
        positions.push(cx + x, cy + y, cz + z, 1);
        normals.push(nx, ny, nz, 0);
        uvs.push(faceUVs[i][0], faceUVs[i][1]);
      }

      indices.push(
        baseVertex, baseVertex + 1, baseVertex + 2,
        baseVertex, baseVertex + 2, baseVertex + 3
      );
    });

    this.positions = new Float32Array(positions);
    this.normals = new Float32Array(normals);
    this.uvs = new Float32Array(uvs);
    this.indices = new Uint32Array(indices);

    this.upload(this.positions, this.normals, this.indices, this.uvs);
  }
}

export default Cube;