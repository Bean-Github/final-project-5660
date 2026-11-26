import { vec3 } from 'gl-matrix';
import GameObject from './GameObject';
import ObjDrawable from '../drawables/ObjDrawable';
import antmanObj from '../assets/antman.obj?raw';
import antObj from '../assets/ant.obj?raw';

export default class AntGO extends GameObject {
  constructor(position: vec3) {
    super(position);

    const ant = new ObjDrawable(antObj);
    ant.create();

    this.drawable = ant;
  }

  override start(): void {}

  override update(dt: number): void {
    


  }
}

