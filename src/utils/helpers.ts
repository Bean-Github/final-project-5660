import { mat4, vec3 } from 'gl-matrix';
import { getViewProj } from '../rendering/cameraRef';
import type { Ray } from '../physics/physics';

// random util functions

export function randomFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}

export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

export function clamp01(value: number): number {
    return clamp(value, 0, 1);
}

export function randomOnSphere(radius: number): vec3 {
    const u = Math.random();
    const v = Math.random();

    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);

    return vec3.fromValues(x, y, z);
}

export function randomOnCircle(radius: number): vec3 {
    const angle = Math.random() * 2 * Math.PI;
    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle);

    return vec3.fromValues(x, 0, z);
}


export function rotateToward(current: vec3, target: vec3, maxAngle: number): vec3 {
    const currentDir = vec3.normalize(vec3.create(), current);
    const targetDir = vec3.normalize(vec3.create(), target);

    const dot = vec3.dot(currentDir, targetDir);
    const angle = Math.acos(clamp(dot, -1, 1));

    if (angle < 1e-6) {
        return vec3.clone(currentDir);
    }

    if (dot < -0.999999) {
        const fallback = Math.abs(currentDir[0]) < 0.9
        ? vec3.fromValues(1, 0, 0)
        : vec3.fromValues(0, 1, 0);
        const axis = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), currentDir, fallback));
        const cos = Math.cos(maxAngle);
        const sin = Math.sin(maxAngle);
        const result = vec3.scale(vec3.create(), currentDir, cos);
        vec3.scaleAndAdd(result, result, vec3.cross(vec3.create(), axis, currentDir), sin);
        return vec3.normalize(result, result);
    }

    const t = Math.min(1, maxAngle / angle);
    const result = vec3.slerp(vec3.create(), currentDir, targetDir, t);
    vec3.normalize(result, result);
    return result;
}

// ray intersection things
export function screenToWorldRay(ndcX: number, ndcY: number): Ray {
  const viewProj = getViewProj();

  const invViewProj = mat4.invert(mat4.create(), viewProj);
  if (!invViewProj) {
    return { origin: vec3.create(), direction: vec3.fromValues(0, 0, -1) };
  }

  // Unproject near (z = 0) and far (z = 1) points in WebGPU clip space
  const nearPoint = vec3.transformMat4(vec3.create(), vec3.fromValues(ndcX, ndcY, 0), invViewProj);
  const farPoint  = vec3.transformMat4(vec3.create(), vec3.fromValues(ndcX, ndcY, 1), invViewProj);

  const direction = vec3.sub(vec3.create(), farPoint, nearPoint);
  vec3.normalize(direction, direction);

  return { origin: nearPoint, direction };
}


// rendering things
export async function loadBitmap(url: string): Promise<ImageBitmap> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load texture: ${url}`);

  return createImageBitmap(await response.blob());
}


