import { vec3 } from 'gl-matrix';
import GameObject from './GameObject';
import Icosphere from '../drawables/Icosphere';


export default class FoodGO extends GameObject {

    constructor(position: vec3)
    {
        super(position);
        
        let sphere = new Icosphere(
            vec3.fromValues(0, 0, 0),
            0.2,
            5,
        );
        sphere.create();

        this.drawable = sphere;

        this.setColor(vec3.fromValues(0, 1, 0)); // green for food

        this.collider = { type: 'sphere', radius: 0.2 };
        
        this.tag = 'food';
    }

    override start(): void {

    }

    override update(dt: number): void {
        // vec3.add(
        //     this.position,                  // Where to store the result
        //     this.position,                  // Current position
        //     vec3.fromValues(dt, 0, 0),     // Movement
        // );

    }



}



