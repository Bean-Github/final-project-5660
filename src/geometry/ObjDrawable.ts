import Drawable from '../rendering/Drawable';

type Point = [number, number, number];
type Corner = { position: Point; normal?: Point; uv?: [number, number] };

export default class ObjDrawable extends Drawable {
  private readonly source: string;

  constructor(source: string) {
    super();
    this.source = source;
  }

  create(): void {
    const sourcePositions: Point[] = [];
    const sourceNormals: Point[] = [];
    const sourceUVs: [number, number][] = [];

    const positions: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];

    function resolveIndex(text: string, length: number): number {
      const index = Number(text);

      // OBJ indices start at 1. Negative indices count backward.
      const resolved = index > 0 ? index - 1 : length + index;

      if (!Number.isInteger(index) || index === 0 ||
          resolved < 0 || resolved >= length) {
        throw new Error(`Invalid OBJ index: ${text}`);
      }

      return resolved;
    }

    function parseCorner(text: string): Corner {
      // Possible forms: v, v/vt, v//vn, v/vt/vn
      const [positionIndex, uvIndex, normalIndex] = text.split('/');

      const position =
        sourcePositions[resolveIndex(positionIndex, sourcePositions.length)];

      const normal = normalIndex
        ? sourceNormals[resolveIndex(normalIndex, sourceNormals.length)]
        : undefined;

      const uv = uvIndex ? sourceUVs[resolveIndex(uvIndex, sourceUVs.length)] : undefined;
      
      return { position, normal, uv };
    }

    function faceNormal(a: Point, b: Point, c: Point): Point {
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];

      const x = uy * vz - uz * vy;
      const y = uz * vx - ux * vz;
      const z = ux * vy - uy * vx;
      const length = Math.hypot(x, y, z) || 1;

      return [x / length, y / length, z / length];
    }

    function addTriangle(a: Corner, b: Corner, c: Corner): void {
      const fallbackNormal =
        faceNormal(a.position, b.position, c.position);

      for (const corner of [a, b, c]) {
        const p = corner.position;
        const n = corner.normal ?? fallbackNormal;

        positions.push(p[0], p[1], p[2], 1);
        normals.push(n[0], n[1], n[2], 0);
        indices.push(indices.length);
        uvs.push(corner.uv ? corner.uv[0] : 0, corner.uv ? corner.uv[1] : 0);
      }
    }

    for (const rawLine of this.source.split(/\r?\n/)) {
      const line = rawLine.split('#')[0].trim();
      if (!line) continue;

      const [kind, ...values] = line.split(/\s+/);

      if (kind === 'v' && values.length >= 3) {
        sourcePositions.push([
          Number(values[0]),
          Number(values[1]),
          Number(values[2]),
        ]);
      } else if (kind === 'vn' && values.length >= 3) {
        sourceNormals.push([
          Number(values[0]),
          Number(values[1]),
          Number(values[2]),
        ]);
      } else if (kind === 'f' && values.length >= 3) {
        const corners = values.map(parseCorner);

        // Turn a polygon into triangles: 0-1-2, 0-2-3, etc.
        for (let i = 1; i < corners.length - 1; i++) {
          addTriangle(corners[0], corners[i], corners[i + 1]);
        }
      } else if (kind === 'vt' && values.length >= 2) {
        sourceUVs.push([Number(values[0]), 1 - Number(values[1])]);
      }
    }

    if (indices.length === 0) {
      throw new Error('OBJ contains no faces');
    }

    this.upload(
      new Float32Array(positions),
      new Float32Array(normals),
      new Uint32Array(indices),
      new Float32Array(uvs)
    );
  }
}