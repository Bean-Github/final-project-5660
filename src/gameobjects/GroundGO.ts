
import { vec2, vec3 } from 'gl-matrix';
import GameObject from './GameObject';
import PlaneDrawable from '../drawables/PlaneDrawable';


export default class GroundGO extends GameObject {

    constructor(position: vec3, size: vec2)
    {
        super(position);
        
        let plane = new PlaneDrawable(
            size[0],
            size[1],
        );
        plane.create();

        this.drawable = plane;
    }

    override start(): void {

    }

    override update(dt: number): void {

    }



}



