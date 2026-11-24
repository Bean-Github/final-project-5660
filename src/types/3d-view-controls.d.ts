declare module '3d-view-controls' {
  import type { vec3 } from 'gl-matrix';

  interface ViewControls {
    eye: vec3;
    center: vec3;
    up: vec3;
    tick(): boolean;
  }

  export default function createCamera(
    element: HTMLElement,
    options?: {
      eye?: vec3;
      center?: vec3;
      up?: vec3;
    },
  ): ViewControls;
}