import CameraControls from '3d-view-controls';
import { vec3, mat4 } from 'gl-matrix';

class Camera {
  controls: ReturnType<typeof CameraControls>;
  projectionMatrix: mat4 = mat4.create();
  viewMatrix: mat4 = mat4.create();

  fovy = Math.PI / 4; // radians
  aspectRatio = 1;
  near = 0.1;
  far = 1000;

  constructor(canvas: HTMLCanvasElement, position: vec3, target: vec3) {
    this.controls = CameraControls(canvas, {
      eye: position,
      center: target,
    });
    this.update();
  }

  setAspectRatio(aspectRatio: number) {
    this.aspectRatio = aspectRatio;
  }

  updateProjectionMatrix() {
    mat4.perspectiveZO(
      this.projectionMatrix,
      this.fovy,
      this.aspectRatio,
      this.near,
      this.far,
    );
  }

  update() {
    this.controls.tick();
    mat4.lookAt(
      this.viewMatrix,
      this.controls.eye,
      this.controls.center,
      this.controls.up,
    );
  }
}

export default Camera;