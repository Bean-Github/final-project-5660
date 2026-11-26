
import { vec3 } from 'gl-matrix';
import GameObject from './GameObject';
import Icosphere from '../drawables/Icosphere';
import type AntColonyGO from './AntColonyGO';

const PheremoneType = {
    LeavingHome: 0,
    ReturningFromFood: 1
} as const;

type PheremoneType = typeof PheremoneType[keyof typeof PheremoneType];
export { PheremoneType };

export default class PheremoneGO extends GameObject {
    private pheremoneLifetime = 30.0; // seconds
    private currentLifetime = 0.0; // seconds

    private colony: AntColonyGO | null = null;

    private type: PheremoneType;

    constructor(position: vec3, type: PheremoneType)
    {
        super(position);

        this.type = type;
        
        let sphere = new Icosphere(
            vec3.fromValues(0, 0, 0),
            0.1,
            2,
        );
        sphere.create();

        this.drawable = sphere;

        switch (type) {
            case PheremoneType.LeavingHome:
                this.setColor(vec3.fromValues(0, 0, 1)); // blue for leaving home
                break;
            case PheremoneType.ReturningFromFood:
                this.setColor(vec3.fromValues(1, 0, 0)); // red for returning from food
                break;
        }

        this.tag = 'pheromone';
    }

    setColony(colony: AntColonyGO): void {
        this.colony = colony;
    }

    override start(): void {

    }

    override update(dt: number): void {
        this.currentLifetime += dt;
        if (this.currentLifetime >= this.pheremoneLifetime) {
            this.colony?.removePheromone(this, this.type);
        }
    }

    getEvaporateT(): number {
        let t = this.currentLifetime / this.pheremoneLifetime;
        
        if (this.type === PheremoneType.ReturningFromFood) {
            t = 1.0 - t; // higher for more recent pheromones
        }

        return t;
    }

}

