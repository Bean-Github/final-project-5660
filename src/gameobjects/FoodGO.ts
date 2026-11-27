// import { vec3 } from 'gl-matrix';
// import GameObject from './GameObject';
// import Icosphere from '../drawables/Icosphere';
// import type AntSystemGO from './AntSystemGO';


// export default class FoodGO extends GameObject {

//     antSystem: AntSystemGO;

//     // need access to the food's position in the active buffer.
//     // when that value is set to 0, the food is no longer active and can be removed from the scene.
//     activeIndex: number;

//     constructor(position: vec3, antSystem: AntSystemGO)
//     {
//         super(position);
        
//         this.antSystem = antSystem;

//         let sphere = new Icosphere(
//             vec3.fromValues(0, 0, 0),
//             0.2,
//             2,
//         );
//         sphere.create();

//         this.drawable = sphere;
//         this.activeIndex = -1;

//         this.setColor(vec3.fromValues(0, 1, 0)); // green for food

//         this.collider = { type: 'sphere', radius: 0.2 };
//         this.tag = 'food';
//     }

//     override start(): void {
//         // add yourself to the ant system's food list
//         this.antSystem.addFood(this);
//     }

//     override update(dt: number): void {
        

//     }



// }



