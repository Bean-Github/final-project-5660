import { vec3 } from 'gl-matrix';
import GameObject from './GameObject';
import Icosphere from '../drawables/Icosphere';


export default class HomeGO extends GameObject {

    constructor(position: vec3)
    {
        super(position);
        
        let sphere = new Icosphere(
            vec3.fromValues(0, 0, 0),
            1,
            5,
        );
        sphere.create();

        this.drawable = sphere;
    }

    override start(): void {

    }

    override update(dt: number): void {
        
    }



}



