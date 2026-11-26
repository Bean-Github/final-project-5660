import { vec3 } from 'gl-matrix';
import type GameObject from '../gameobjects/GameObject';
import { getObjectManager } from '../ObjectManager';

export type Ray = {
  origin: vec3;
  direction: vec3;
};

export type RayHit = {
  object: GameObject;
  point: vec3;
  normal: vec3;
  distance: number;
};

export type QueryOptions = {
  ignore?: GameObject; // Prevent an ant from hitting itself
  tag?: string;        // Only hit objects with this tag
};

// --- Primitive Intersection Math ---

export function intersectRayPlane(ray: Ray, planePoint: vec3, planeNormal: vec3): { point: vec3; distance: number } | null {
  const denom = vec3.dot(planeNormal, ray.direction);

  if (Math.abs(denom) < 1e-6) {
    return null;
  }

  const diff = vec3.sub(vec3.create(), planePoint, ray.origin);
  const t = vec3.dot(diff, planeNormal) / denom;

  if (t < 0) {
    return null;
  }

  return {
    point: vec3.scaleAndAdd(vec3.create(), ray.origin, ray.direction, t),
    distance: t,
  };
}

function intersectRaySphere(
  ray: Ray,
  center: vec3,
  radius: number,
  maxDistance: number,
): { distance: number; point: vec3; normal: vec3 } | null {
  const oc = vec3.sub(vec3.create(), ray.origin, center);
  const b = vec3.dot(oc, ray.direction);
  const c = vec3.dot(oc, oc) - radius * radius;
  const disc = b * b - c;

  if (disc < 0) return null;

  let t = -b - Math.sqrt(disc);
  if (t < 0) t = -b + Math.sqrt(disc); // Ray started inside sphere
  if (t < 0 || t > maxDistance) return null;

  const point = vec3.scaleAndAdd(vec3.create(), ray.origin, ray.direction, t);
  const normal = vec3.normalize(vec3.create(), vec3.sub(vec3.create(), point, center));
  return { distance: t, point, normal };
}

function intersectRayAABB(
  ray: Ray,
  center: vec3,
  halfExtents: vec3,
  maxDistance: number,
): { distance: number; point: vec3; normal: vec3 } | null {
  let tMin = 0;
  let tMax = maxDistance;
  let hitAxis = -1;
  let hitSign = 0;

  for (let i = 0; i < 3; i++) {
    const min = center[i] - halfExtents[i];
    const max = center[i] + halfExtents[i];

    if (Math.abs(ray.direction[i]) < 1e-8) {
      if (ray.origin[i] < min || ray.origin[i] > max) return null;
    } else {
      const invD = 1 / ray.direction[i];
      let t1 = (min - ray.origin[i]) * invD;
      let t2 = (max - ray.origin[i]) * invD;
      let sign = -1;

      if (t1 > t2) {
        [t1, t2] = [t2, t1];
        sign = 1;
      }

      if (t1 > tMin) {
        tMin = t1;
        hitAxis = i;
        hitSign = sign;
      }
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return null;
    }
  }

  const point = vec3.scaleAndAdd(vec3.create(), ray.origin, ray.direction, tMin);
  const normal = vec3.create();
  if (hitAxis !== -1) normal[hitAxis] = hitSign;

  return { distance: tMin, point, normal };
}

// --- Scene Queries ---
let objects: readonly GameObject[] = [];

function updatePhysicsObjects() {
    const objectManager = getObjectManager();
    if (objectManager) {
        objects = objectManager.getAll();
    }
    else {
        objects = [];
    }
}

export function raycast(
  ray: Ray,
  maxDistance = Infinity,
  options: QueryOptions = {},
): RayHit | null {

    updatePhysicsObjects();

  let closest: RayHit | null = null;
  let closestDist = maxDistance;

  for (const obj of objects) {
    if (!obj.collider) continue;
    if (options.ignore && obj === options.ignore) continue;
    if (options.tag && obj.tag !== options.tag) continue;

    let hit = null;
    if (obj.collider.type === 'sphere') {
      hit = intersectRaySphere(ray, obj.position, obj.collider.radius, closestDist);
    } else if (obj.collider.type === 'box') {
      hit = intersectRayAABB(ray, obj.position, obj.collider.halfExtents, closestDist);
    }

    if (hit && hit.distance < closestDist) {
      closestDist = hit.distance;
      closest = { object: obj, ...hit };
    }
  }

  return closest;
}

export function sphereCast(
  ray: Ray,
  castRadius: number,
  maxDistance = Infinity,
  options: QueryOptions = {},
): RayHit | null {
    updatePhysicsObjects();
    
  let closest: RayHit | null = null;
  let closestDist = maxDistance;

  for (const obj of objects) {
    if (!obj.collider) continue;
    if (options.ignore && obj === options.ignore) continue;
    if (options.tag && obj.tag !== options.tag) continue;

    let hit = null;
    if (obj.collider.type === 'sphere') {
      // Sweeping a sphere against a sphere is identical to raycasting against a combined radius
      const expanded = intersectRaySphere(
        ray,
        obj.position,
        obj.collider.radius + castRadius,
        closestDist,
      );
      if (expanded) {
        const contactPoint = vec3.scaleAndAdd(
          vec3.create(),
          obj.position,
          expanded.normal,
          obj.collider.radius,
        );
        hit = { distance: expanded.distance, point: contactPoint, normal: expanded.normal };
      }
    } else if (obj.collider.type === 'box') {
      // Fast approximation: expand the AABB by castRadius
      const expandedHalf = vec3.fromValues(
        obj.collider.halfExtents[0] + castRadius,
        obj.collider.halfExtents[1] + castRadius,
        obj.collider.halfExtents[2] + castRadius,
      );
      hit = intersectRayAABB(ray, obj.position, expandedHalf, closestDist);
    }

    if (hit && hit.distance < closestDist) {
      closestDist = hit.distance;
      closest = { object: obj, ...hit };
    }
  }

  return closest;
}

export function overlapSphere(
  center: vec3,
  radius: number,
  options: QueryOptions = {},
): GameObject[] {
    updatePhysicsObjects();

  const results: GameObject[] = [];

  for (const obj of objects) {
    if (!obj.collider) continue;
    if (options.ignore && obj === options.ignore) continue;
    if (options.tag && obj.tag !== options.tag) continue;

    if (obj.collider.type === 'sphere') {
      const combined = radius + obj.collider.radius;
      if (vec3.squaredDistance(center, obj.position) <= combined * combined) {
        results.push(obj);
      }
    } else if (obj.collider.type === 'box') {
      // Closest point on AABB to sphere center
      const h = obj.collider.halfExtents;
      const cx = Math.max(obj.position[0] - h[0], Math.min(center[0], obj.position[0] + h[0]));
      const cy = Math.max(obj.position[1] - h[1], Math.min(center[1], obj.position[1] + h[1]));
      const cz = Math.max(obj.position[2] - h[2], Math.min(center[2], obj.position[2] + h[2]));
      const dx = center[0] - cx, dy = center[1] - cy, dz = center[2] - cz;
      if (dx * dx + dy * dy + dz * dz <= radius * radius) {
        results.push(obj);
      }
    }
  }

  return results;
}