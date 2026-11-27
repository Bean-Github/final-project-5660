import { vec3 } from 'gl-matrix';
import GameObject from './GameObject';
import AntGO from './AntGO';
import instancedAntShader from '../shaders/instancedant.wgsl?raw';

import * as Textures from '../utils/textures';

import ObjDrawable from '../drawables/ObjDrawable';
import antObj from '../assets/ant.obj?raw';
import InstancedTextureMaterial from '../materials/InstancedTextureMaterial';

const MAX_ANTS = 100000;
const FLOATS_PER_INSTANCE = 20; // mat4x4 model + vec4(r, g, b, a)

// this renders all the ants using instancing
export default class AntSystemGO extends GameObject {
    private ants: AntGO[] = [];
    private instanceData = new Float32Array(MAX_ANTS * FLOATS_PER_INSTANCE);
    private instancedMaterial: InstancedTextureMaterial;

    constructor() {
        super(vec3.fromValues(0, 0, 0));

        // ONE shared mesh for all pheromones
        const ant = new ObjDrawable(antObj);
        ant.create();
        this.drawable = ant;
        this.setColor(vec3.fromValues(1.0, 66/255, 56/255)); // Set ant color to red

        const antImage = Textures.getTexture('ant');

        // Pre-allocated storage buffer for up to MAX_PHEROMONES
        this.instancedMaterial = new InstancedTextureMaterial(
            this.instanceData, 0, FLOATS_PER_INSTANCE, antImage, instancedAntShader
        );

        this.setMaterial(this.instancedMaterial);
        this.tag = 'ant_system';
    }

    async setMaterial(material: InstancedTextureMaterial): Promise<void> {
        this.material = material;
    }

    addAnt(ant: AntGO): void {
        if (this.ants.length >= MAX_ANTS) return;

        this.ants.push(ant);
    }

    removeAnt(ant: AntGO): void {
        const index = this.ants.indexOf(ant);
        if (index !== -1) {
            // swap and pop
            this.ants[index] = this.ants[this.ants.length - 1];
            this.ants.pop();
        }
    }

    override start(): void { }

    override update(dt: number): void {
        // pack active pheromones into the Float32Array
        const count = this.ants.length;
        for (let i = 0; i < count; i++) {
            const ant = this.ants[i];
            const offset = i * FLOATS_PER_INSTANCE;

            const remaining = 1.0 - ant.currentLifetime / ant.maxLifetime;

            // set model matrix
            const modelMatrix = ant.getModelMatrix();
            this.instanceData.set(modelMatrix, offset); // 16 floats for mat4x4

            // set color (r, g, b, a)
            this.instanceData[offset + 16] = remaining; // r
            this.instanceData[offset + 17] = remaining; // g
            this.instanceData[offset + 18] = remaining; // b
            this.instanceData[offset + 19] = remaining; // a
        }

        // upload only the active slice to the GPU
        this.instancedMaterial.updateInstances(this.instanceData, count);
    }

}

