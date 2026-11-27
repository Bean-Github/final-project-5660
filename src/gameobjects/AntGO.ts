import { vec3 } from 'gl-matrix';
import GameObject from './GameObject';
import ObjDrawable from '../drawables/ObjDrawable';
import antObj from '../assets/ant.obj?raw';
import { randomFloat } from '../utils/helpers';
import Pheromone, { PheromoneType } from './pheromones/Pheromone';
import * as Helpers from '../utils/helpers';
import * as Physics from '../physics/physics';
import { getTime } from '../utils/time';
import AntColonyGO from './AntColonyGO';

const AntState = {
  Searching: 'searching',
  Returning: 'returning',
} as const;

type AntState = typeof AntState[keyof typeof AntState];

export default class AntGO extends GameObject {
  private state: AntState = AntState.Searching;
  private colony: AntColonyGO | null = null;

  // lifetime
  currentLifetime = 0;
  readonly maxLifetime = 30.0; // seconds

  // pheromone drop settings
  private timeBetweenPheromoneDrops = 0.3; // seconds
  private timeSinceLastPheromoneDrop = 0.0; // seconds
  private timeSinceSource = 0;
  private pheromoneRunOutTime = 15;

  // steering movement settings
  private moveSpeed = 3.0; // units per second
  private acceleration = 8.0; // how quickly the ant turns toward desiredVelocity
  private randomSteerStrength = 1.0;
  //private targetSteerStrength = 3.0;

  // steering forces (XZ plane)
  private randomSteerForce = vec3.create();
  //private targetSteerForce = vec3.create();
  private turnAroundForce = vec3.create();

  private wanderTimer = 0;
  private turnAroundTimer = 0;

  // vision
  private foodDetectionRadius = 10.0; // units
  private foodDetectionAngle = 90.0; // degrees

  // grounded
  private isGrounded = false;

  // pheremone detection
  private pheromoneSteerForce = vec3.create();
  private sensorDst = 2.0;
  private timeBetweenDirUpdate = 0.2; // seconds
  private sensors = [vec3.create(), vec3.create(), vec3.create()];
  private nextDirUpdateTime = 0;
  private pheromoneWeight = 4.0;
  private sensorData = [0, 0, 0];

  constructor(position: vec3) {
    super(position);

    // const ant = new ObjDrawable(antObj);
    // ant.create();

    // this.drawable = ant;
    this.tag = 'ant';
    this.collider = { type: 'sphere', radius: 1.0 };
  }
  
  reset(position: vec3): void {
    vec3.copy(this.position, position);
    this.state = AntState.Searching;
    this.currentLifetime = 0;
    this.timeSinceSource = 0;
    this.turnAroundTimer = 0;
    this.nextDirUpdateTime = 0;
    vec3.set(this.pheromoneSteerForce, 0, 0, 0);
    vec3.set(this.randomSteerForce, 0, 0, 0);

    this.rotationY = randomFloat(0, Math.PI * 2);
    this.velocity[0] = this.forward[0] * this.moveSpeed;
    this.velocity[1] = 0;
    this.velocity[2] = this.forward[2] * this.moveSpeed;
  }

  setColony(colony: AntColonyGO): void {
    this.colony = colony;
  }

  getState(): AntState {
    return this.state;
  }

  override start(): void {
    this.rotationY = randomFloat(0, Math.PI * 2);
    this.velocity[0] = this.forward[0] * this.moveSpeed;
    this.velocity[2] = this.forward[2] * this.moveSpeed;
  }

  override update(dt: number): void {
    this.currentLifetime += dt;

    this.dropPheromone(dt);
    this.handleRandomSteering(dt);

    if (this.state === AntState.Searching) {
      this.handleSearchSteering(dt);
    } else if (this.state === AntState.Returning) {
      this.handleReturnSteering(dt);
    }

    // TODO: handle collision steering
    this.updateMovement(dt);

    if (this.currentLifetime >= this.maxLifetime) {
      this.colony?.respawnAnt(this);
    }
  }

  private handleSearchSteering(dt: number): void {
    // smell out nearby food
    const nearbyFood = Physics.overlapSphere(this.position, this.foodDetectionRadius, {
      ignore: this,
      tag: 'food',
    });

    // cull out the nearby food by angle
    const cosHalfAngle = Math.cos((this.foodDetectionAngle * 0.5 * Math.PI) / 180);

    const filteredFood = nearbyFood.filter((food) => {
      const toFood = vec3.fromValues(
        food.position[0] - this.position[0],
        0,
        food.position[2] - this.position[2],
      );

      if (vec3.squaredLength(toFood) < 1e-6) return true;

      vec3.normalize(toFood, toFood);
      return vec3.dot(this.forward, toFood) >= cosHalfAngle;
    });

    // if there is nearby food, steer strongly toward it and set random force to 0
    if (filteredFood.length > 0) {
      const closestFood = filteredFood.reduce((closest, food) => {
        const closestDist = vec3.distance(this.position, closest.position);
        const foodDist = vec3.distance(this.position, food.position);
        return foodDist < closestDist ? food : closest;
      }, filteredFood[0]);

      const dirToFood = vec3.fromValues(
        closestFood.position[0] - this.position[0],
        0,
        closestFood.position[2] - this.position[2],
      );

      if (vec3.squaredLength(dirToFood) > 1e-6) {
        vec3.normalize(dirToFood, dirToFood);
        vec3.scale(this.pheromoneSteerForce, dirToFood, 1.0);
      }
      vec3.set(this.randomSteerForce, 0, 0, 0);
    } else { // otherwise, just continue steering randomly
      this.handlePheromoneSteering(dt);
    }

    if (nearbyFood.length > 0) {
      // check if close enough to grab food
      for (const food of nearbyFood) {
        const distanceToFood = vec3.distance(this.position, food.position);
        if (distanceToFood < 0.5) {
          this.sceneRef?.destroyObject(food);
          this.switchToReturning();
          break;
        }
      }
    }

  }

  private handleReturnSteering(dt: number): void {
    if (!this.colony) return;

    const distToHome = vec3.distance(this.position, this.colony.position);

    if (distToHome < this.colony.colonyRadius) {
      this.switchToSearching();
      this.colony.returnAnt(this);
      return;
    }

    // Steer directly to home once in perception range
    if (distToHome < this.foodDetectionRadius) {
      const dirToHome = vec3.fromValues(
        this.colony.position[0] - this.position[0],
        0,
        this.colony.position[2] - this.position[2],
      );
      if (vec3.squaredLength(dirToHome) > 1e-6) {
        vec3.normalize(dirToHome, dirToHome);
        vec3.scale(this.pheromoneSteerForce, dirToHome, this.pheromoneWeight);
      }
      vec3.set(this.randomSteerForce, 0, 0, 0);
    } 
    else {
      this.handlePheromoneSteering(dt);
    }
  }


  private handlePheromoneSteering(dt: number): void {
    const currentForwardDir = vec3.fromValues(this.velocity[0], 0, this.velocity[2]);
    if (vec3.squaredLength(currentForwardDir) < 1e-6) {
      vec3.copy(currentForwardDir, this.forward);
      currentForwardDir[1] = 0;
    }
    vec3.normalize(currentForwardDir, currentForwardDir);

    const currentTime = getTime().time;

    // TODO: use pheromone trail to find home instead of just wandering randomly
    if (currentTime > this.nextDirUpdateTime)
		{
			const leftDir = vec3.sub(vec3.create(), currentForwardDir, this.right);
      leftDir[1] = 0;
      vec3.normalize(leftDir, leftDir);

      const rightDir = vec3.add(vec3.create(), currentForwardDir, this.right);
      rightDir[1] = 0;
      vec3.normalize(rightDir, rightDir);

			this.pheromoneSteerForce = vec3.create();
			const centerIndex = 0;
			const leftIndex = 1;
			const rightIndex = 2;

			this.nextDirUpdateTime = currentTime + this.timeBetweenDirUpdate;

      vec3.scaleAndAdd(this.sensors[centerIndex], this.position, currentForwardDir, this.sensorDst);
      vec3.scaleAndAdd(this.sensors[leftIndex], this.position, leftDir, this.sensorDst);
      vec3.scaleAndAdd(this.sensors[rightIndex], this.position, rightDir, this.sensorDst);

			for (let i = 0; i < this.sensors.length; i++)
			{
				this.sensorData[i] = 0;

        const pheromoneEntries = this.colony!.queryPheromones(
          this.state === 
            AntState.Searching ? PheromoneType.ReturningFromFood : PheromoneType.LeavingHome,
          this.sensors[i], 1.0
        );

        const numPheromones = pheromoneEntries.length;

				for (let j = 0; j < numPheromones; j++)
				{
					const evaporateT = pheromoneEntries[j].getEvaporateT();
					let strength = Helpers.clamp01(1 - evaporateT);
					strength = strength * strength;
					this.sensorData[i] += strength;
				}
			}

      const center = this.sensorData[centerIndex];
      const left = this.sensorData[leftIndex];
      const right = this.sensorData[rightIndex];

      const total = center + left + right;
      if (total > 0) {
        // denser trails disproportionately
        const cWeight = center * center;
        const lWeight = left * left;
        const rWeight = right * right;

        vec3.set(this.pheromoneSteerForce, 0, 0, 0);
        vec3.scaleAndAdd(this.pheromoneSteerForce, this.pheromoneSteerForce, currentForwardDir, cWeight);
        vec3.scaleAndAdd(this.pheromoneSteerForce, this.pheromoneSteerForce, leftDir, lWeight);
        vec3.scaleAndAdd(this.pheromoneSteerForce, this.pheromoneSteerForce, rightDir, rWeight);

        if (vec3.squaredLength(this.pheromoneSteerForce) > 1e-6) {
          vec3.normalize(this.pheromoneSteerForce, this.pheromoneSteerForce);

          // force by how strong the trail actually is (weak trail = more wandering, strong trail = locked in)
          const concentrationScale = Math.min(total, 5.0); // cap so it stays bounded
          vec3.scale(this.pheromoneSteerForce, this.pheromoneSteerForce, this.pheromoneWeight * concentrationScale);
          this.turnAroundTimer = 0;
        }
      }
		}  
  }

  private switchToSearching(): void {
    this.state = AntState.Searching;
    this.nextDirUpdateTime = 0;
    vec3.set(this.pheromoneSteerForce, 0, 0, 0);
    this.timeSinceSource = 0;
    this.currentLifetime = 0;
    this.startTurnAround();
  }

  private switchToReturning(): void {
    this.state = AntState.Returning;
    this.timeSinceSource = 0;
    vec3.set(this.pheromoneSteerForce, 0, 0, 0);
    this.nextDirUpdateTime = 0;
    this.currentLifetime = 0;
    this.startTurnAround();
  }

  private startTurnAround(randomStrength = 0.2): void {
    this.turnAroundTimer = 1.5;

    // opposite of current forward on XZ plane + slight perpendicular jitter
    const reverseDir = vec3.fromValues(-this.forward[0], 0, -this.forward[2]);
    const perpAxis = vec3.fromValues(-reverseDir[2], 0, reverseDir[0]);
    const jitter = randomFloat(-1, 1) * randomStrength;

    vec3.scaleAndAdd(this.turnAroundForce, reverseDir, perpAxis, jitter);
    vec3.normalize(this.turnAroundForce, this.turnAroundForce);
  }


  private dropPheromone(dt: number): void {
    this.timeSinceSource += dt;

    const type = this.state === AntState.Searching ? 
      PheromoneType.LeavingHome : PheromoneType.ReturningFromFood;

    if (this.timeSinceSource >= this.pheromoneRunOutTime) return;
    
    this.timeSinceLastPheromoneDrop += dt;

    if (this.timeSinceLastPheromoneDrop >= this.timeBetweenPheromoneDrops && this.isGrounded) {
      this.timeSinceLastPheromoneDrop = 0;
      this.colony!.addPheromone(this.position, type);
    }
  }

  private updateMovement(dt: number): void {
    const steerForce = vec3.create();
    vec3.add(steerForce, steerForce, this.randomSteerForce);
    vec3.add(steerForce, steerForce, this.pheromoneSteerForce);

    if (this.turnAroundTimer > 0) {
      const alignment = vec3.dot(this.forward, this.turnAroundForce);
      // exit early if the ant is already facing the turnAroundForce direction
      if (alignment > 0.8) {
        this.turnAroundTimer = 0;
      } else {
        // Apply the turnAroundForce to the steerForce
        const turnWeight = 6.0 * (this.turnAroundTimer / 1.5);
        vec3.scaleAndAdd(steerForce, steerForce, this.turnAroundForce, turnWeight);
        this.turnAroundTimer -= dt;
      }
    }

    // Convert steerForce into desiredVelocity and smoothly accelerate toward it
    if (vec3.squaredLength(steerForce) > 1e-6) {
      const desiredVelocity = vec3.create();
      vec3.normalize(desiredVelocity, steerForce);
      vec3.scale(desiredVelocity, desiredVelocity, this.moveSpeed);

      const currentHorizVel = vec3.fromValues(this.velocity[0], 0, this.velocity[2]);
      const steering = vec3.create();
      vec3.sub(steering, desiredVelocity, currentHorizVel);

      // Clamp acceleration
      const accel = vec3.scale(vec3.create(), steering, this.acceleration);
      const accelMag = vec3.length(accel);
      if (accelMag > this.acceleration) {
        vec3.scale(accel, accel, this.acceleration / accelMag);
      }

      // Apply acceleration and clamp horizontal speed to moveSpeed
      vec3.scaleAndAdd(currentHorizVel, currentHorizVel, accel, dt);
      const speed = vec3.length(currentHorizVel);
      if (speed > this.moveSpeed) {
        vec3.scale(currentHorizVel, currentHorizVel, this.moveSpeed / speed);
      }

      this.velocity[0] = currentHorizVel[0];
      this.velocity[2] = currentHorizVel[2];
    }

    // Face the direction of horizontal movement
    if (this.velocity[0] * this.velocity[0] + this.velocity[2] * this.velocity[2] > 1e-6) {
      this.rotationY = Math.atan2(this.velocity[0], this.velocity[2]);
    }

    // Gravity and physics
    this.velocity[1] -= 9.81 * dt;
    this.applyPhysics(dt);

    if (this.position[1] < 0) {
      this.position[1] = 0;
      this.velocity[1] = 0;

      this.isGrounded = true;
    }
    else if (this.position[1] > 0) {
      this.isGrounded = false;
    }
  }

  private handleRandomSteering(dt: number): void {
    if (this.turnAroundTimer > 0) {
      vec3.set(this.randomSteerForce, 0, 0, 0);
      this.wanderTimer = 0;
      return;
    }

    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0) {
      this.wanderTimer = randomFloat(0.3, 1.0);
      const dir = this.getRandomForwardBiasedDir(4);
      vec3.scale(this.randomSteerForce, dir, this.randomSteerStrength);
    }
  }

  private getRandomForwardBiasedDir(iterations = 4): vec3 {
    const bestDir = vec3.clone(this.forward);
    bestDir[1] = 0;
    let bestDot = -1;

    for (let i = 0; i < iterations; i++) {
      const angle = randomFloat(0, Math.PI * 2);
      const candidate = vec3.fromValues(Math.sin(angle), 0, Math.cos(angle));
      const dot = vec3.dot(this.forward, candidate);
      if (dot > bestDot) {
        bestDot = dot;
        vec3.copy(bestDir, candidate);
      }
    }

    return bestDir;
  }
}


