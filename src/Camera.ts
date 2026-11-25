import { vec3, mat4 } from 'gl-matrix';

const WORLD_UP = vec3.fromValues(0, 1, 0);

class Camera {
  projectionMatrix: mat4 = mat4.create();
  viewMatrix: mat4 = mat4.create();

  fovy = Math.PI / 4;
  aspectRatio = 1;
  near = 0.1;
  far = 1000;

  moveSpeed = 4;
  mouseSensitivity = 0.004;

  private canvas: HTMLCanvasElement;
  private eye: vec3;
  private pivot: vec3;
  private distance: number;
  private yaw: number;
  private pitch: number;

  private keys = new Set<string>();
  private dragMode: 'look' | 'orbit' | null = null;
  private pointerId: number | null = null;
  private lastX = 0;
  private lastY = 0;

  constructor(canvas: HTMLCanvasElement, position: vec3, target: vec3) {
    this.canvas = canvas;
    this.eye = vec3.clone(position);
    this.pivot = vec3.clone(target);
    this.distance = Math.max(vec3.distance(position, target), 0.01);

    const direction = vec3.create();
    vec3.sub(direction, target, position);
    vec3.normalize(direction, direction);

    this.yaw = Math.atan2(direction[0], -direction[2]);
    this.pitch = Math.asin(Math.max(-1, Math.min(1, direction[1])));

    // Allow the canvas to receive keyboard focus.
    canvas.tabIndex = 0;

    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);
    canvas.addEventListener('contextmenu', this.onContextMenu);
    canvas.addEventListener('blur', this.onBlur);

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);

    this.update(0);
  }

  private forward(): vec3 {
    return vec3.fromValues(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch),
    );
  }

  private onPointerDown = (event: PointerEvent): void => {
    this.canvas.focus();

    if (event.altKey && event.button === 0) {
      this.dragMode = 'orbit';
    } else if (event.button === 2) {
      this.dragMode = 'look';
    } else {
      return;
    }

    this.pointerId = event.pointerId;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.dragMode || event.pointerId !== this.pointerId) return;

    const dx = event.clientX - this.lastX;
    const dy = event.clientY - this.lastY;
    this.lastX = event.clientX;
    this.lastY = event.clientY;

    this.yaw += dx * this.mouseSensitivity;
    this.pitch -= dy * this.mouseSensitivity;
    this.pitch = Math.max(-1.55, Math.min(1.55, this.pitch));

    const forward = this.forward();

    if (this.dragMode === 'orbit') {
      // Keep the pivot fixed; move the camera around it.
      vec3.scaleAndAdd(this.eye, this.pivot, forward, -this.distance);
    } else {
      // Keep the camera fixed; change where it looks.
      vec3.scaleAndAdd(this.pivot, this.eye, forward, this.distance);
    }
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;

    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }

    this.pointerId = null;
    this.dragMode = null;
  };

  private onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    if (document.activeElement !== this.canvas) return;

    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE',
         'ShiftLeft', 'ShiftRight'].includes(event.code)) {
      this.keys.add(event.code);
      event.preventDefault();
    }
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private onBlur = (): void => {
    this.keys.clear();
  };

  setAspectRatio(aspectRatio: number): void {
    this.aspectRatio = aspectRatio;
  }

  updateProjectionMatrix(): void {
    mat4.perspectiveZO(
      this.projectionMatrix,
      this.fovy,
      this.aspectRatio,
      this.near,
      this.far,
    );
  }

  update(dt: number): void {
    const forward = this.forward();
    const right = vec3.create();
    vec3.cross(right, forward, WORLD_UP);
    vec3.normalize(right, right);

    const movement = vec3.create();

    if (this.keys.has('KeyW')) vec3.add(movement, movement, forward);
    if (this.keys.has('KeyS')) vec3.sub(movement, movement, forward);
    if (this.keys.has('KeyD')) vec3.add(movement, movement, right);
    if (this.keys.has('KeyA')) vec3.sub(movement, movement, right);
    if (this.keys.has('KeyE')) vec3.add(movement, movement, WORLD_UP);
    if (this.keys.has('KeyQ')) vec3.sub(movement, movement, WORLD_UP);

    if (vec3.squaredLength(movement) > 0) {
      vec3.normalize(movement, movement);

      const boost = this.keys.has('ShiftLeft') ||
                    this.keys.has('ShiftRight') ? 3 : 1;
      const step = this.moveSpeed * boost * dt;

      // Move both together, preserving the current look direction.
      vec3.scaleAndAdd(this.eye, this.eye, movement, step);
      vec3.scaleAndAdd(this.pivot, this.pivot, movement, step);
    }

    mat4.lookAt(this.viewMatrix, this.eye, this.pivot, WORLD_UP);
  }

  getViewProj(): mat4 {
    const viewProj = mat4.create();
    mat4.multiply(viewProj, this.projectionMatrix, this.viewMatrix);
    return viewProj;
  }

  dispose(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    this.canvas.removeEventListener('blur', this.onBlur);

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);

    if (this.pointerId !== null &&
        this.canvas.hasPointerCapture(this.pointerId)) {
      this.canvas.releasePointerCapture(this.pointerId);
    }

    this.keys.clear();
  }
}

export default Camera;