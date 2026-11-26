import { mat4 } from 'gl-matrix';
import type Camera from '../Camera';

let activeCamera: Camera | null = null;

export function setCamera(camera: Camera): void {
  activeCamera = camera;
}

export function getCamera(): Camera {
  if (!activeCamera) {
    throw new Error('Camera has not been initialized');
  }
  return activeCamera;
}

export function clearCamera(camera: Camera): void {
  if (activeCamera === camera) activeCamera = null;
}

export function getViewProj(): mat4 {
  return getCamera().getViewProj();
}

