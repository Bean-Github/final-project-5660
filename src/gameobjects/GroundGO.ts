
import { vec3 } from 'gl-matrix';
import GameObject from './GameObject';
import PlaneDrawable from '../drawables/PlaneDrawable';


export default class GroundGO extends GameObject {

    constructor(position: vec3)
    {
        super(position);
        
        let plane = new PlaneDrawable(
            50,
            50,
        );
        plane.create();

        this.drawable = plane;
    }

    override start(): void {

    }

    override update(dt: number): void {

    }



}



