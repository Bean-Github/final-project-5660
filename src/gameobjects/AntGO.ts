import { vec3 } from 'gl-matrix';
import GameObject from './GameObject';
import ObjDrawable from '../geometry/ObjDrawable';
import antmanObj from '../assets/antman.obj?raw';

export default class AntGO extends GameObject {
  constructor(position: vec3) {
    super(position);

    const antman = new ObjDrawable(antmanObj);
    antman.create();

    this.drawable = antman;
  }

  override start(): void {}

  override update(dt: number): void {}
}

