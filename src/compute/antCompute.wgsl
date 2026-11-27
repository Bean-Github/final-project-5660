struct SimParams {
  dt: f32,
  time: f32,
  antCount: u32,
  foodCount: u32,

  colonyPos: vec3<f32>,
  colonyRadius: f32,

  gridX: u32,
  gridY: u32,
  gridZ: u32,
  cellSize: f32,

  worldHalfX: f32,
  worldHalfZ: f32,
  maxPheromones: u32,
  maxLifetime: f32,

  moveSpeed: f32,
  gridMax: f32,
  pad1: f32,
  pad2: f32,
};

struct Ant {
  pos: vec3<f32>,
  rotationY: f32,

  vel: vec3<f32>,
  state: u32, // 0 = Searching, 1 = Returning

  randomSteer: vec3<f32>,
  wanderTimer: f32,

  pheromoneSteer: vec3<f32>,
  nextDirUpdateTime: f32,

  lastPheromonePos: vec3<f32>,
  timeSinceSource: f32,

  currentLifetime: f32,
  rngState: u32,
  isGrounded: u32,
  carriedFood: u32,
};

struct AntInstance {
  model: mat4x4<f32>,
  color: vec4<f32>,
};

struct Food {
  pos: vec3<f32>,
  pad: f32,
};

struct PheromoneInstance {
  posScale: vec4<f32>, // xyz = pos, w = scale
  color: vec4<f32>,    // rgb = color, w = alpha
};

@group(0) @binding(0) var<uniform> params: SimParams;
@group(0) @binding(1) var<storage, read_write> ants: array<Ant>;
@group(0) @binding(2) var<storage, read_write> instances: array<AntInstance>;
@group(0) @binding(3) var<storage, read_write> pheromoneGrid: array<vec2<f32>>;
@group(0) @binding(4) var<storage, read_write> foods: array<Food>;
@group(0) @binding(5) var<storage, read_write> foodActive: array<atomic<u32>>;
@group(0) @binding(6) var<storage, read_write> pheromoneInstances: array<PheromoneInstance>;
@group(0) @binding(7) var<storage, read_write> pheromoneHead: atomic<u32>;

// --- Randomness Helpers ---
fn nextRand(state: ptr<function, u32>) -> f32 {
  let prev = *state;
  *state = prev * 747796405u + 2891336453u;
  let word = ((prev >> ((prev >> 28u) + 4u)) ^ prev) * 277803737u;
  let result = (word >> 22u) ^ word;
  return f32(result) / 4294967295.0;
}

fn randRange(state: ptr<function, u32>, minVal: f32, maxVal: f32) -> f32 {
  return minVal + nextRand(state) * (maxVal - minVal);
}

// --- 3D Grid Helpers ---
fn worldToGridIndex(pos: vec3<f32>) -> i32 {
  let gx = i32(floor((pos.x + params.worldHalfX) / params.cellSize));
  let gy = i32(floor(pos.y / params.cellSize));
  let gz = i32(floor((pos.z + params.worldHalfZ) / params.cellSize));
  if (gx < 0 || gy < 0 || gz < 0 ||
      gx >= i32(params.gridX) || gy >= i32(params.gridY) || gz >= i32(params.gridZ)) {
    return -1;
  }
  return (gy * i32(params.gridZ) + gz) * i32(params.gridX) + gx;
}

fn samplePheromone(pos: vec3<f32>, channel: u32) -> f32 {
  let cx = i32(floor((pos.x + params.worldHalfX) / params.cellSize));
  let cy = i32(floor(pos.y / params.cellSize));
  let cz = i32(floor((pos.z + params.worldHalfZ) / params.cellSize));
  var sum = 0.0;

  for (var dy = -1; dy <= 1; dy++) {
    let y = cy + dy;
    if (y < 0 || y >= i32(params.gridY)) { continue; }
    for (var dz = -1; dz <= 1; dz++) {
      let z = cz + dz;
      if (z < 0 || z >= i32(params.gridZ)) { continue; }
      for (var dx = -1; dx <= 1; dx++) {
        let x = cx + dx;
        if (x < 0 || x >= i32(params.gridX)) { continue; }
        let idx = (y * i32(params.gridZ) + z) * i32(params.gridX) + x;
        let cell = pheromoneGrid[idx];
        let val = select(cell.x, cell.y, channel == 1u);
        sum += val * val;
      }
    }
  }
  return sum;
}

// STEERING
fn flipAround(ant: ptr<function, Ant>) {
  (*ant).rotationY += 3.14159265;
  (*ant).vel.x = -(*ant).vel.x;
  (*ant).vel.z = -(*ant).vel.z;
  (*ant).randomSteer = vec3<f32>(0.0);
  (*ant).pheromoneSteer = vec3<f32>(0.0);
  (*ant).wanderTimer = 0.0;
  (*ant).nextDirUpdateTime = 0.0;
  (*ant).timeSinceSource = 0.0;
  (*ant).currentLifetime = 0.0;
}

fn handlePheromoneSteering(ant: ptr<function, Ant>, forward: vec3<f32>, right: vec3<f32>) {
  if (params.time <= (*ant).nextDirUpdateTime) {
    return;
  }

  (*ant).nextDirUpdateTime = params.time + 0.2;
  let sensorDst = 2.0;
  let pheromoneWeight = 4.0;

  let leftDir = normalize(vec3<f32>(forward.x - right.x, 0.0, forward.z - right.z));
  let rightDir = normalize(vec3<f32>(forward.x + right.x, 0.0, forward.z + right.z));

  // if state is 0 (searching), target channel is 1 (food pheromone), else target channel is 0 (home pheromone)
  // basically look for the opposite pheromone type of what the ant is dropping
  let targetChannel = select(0u, 1u, (*ant).state == 0u);

  let c = samplePheromone((*ant).pos + forward * sensorDst, targetChannel);
  let l = samplePheromone((*ant).pos + leftDir * sensorDst, targetChannel);
  let r = samplePheromone((*ant).pos + rightDir * sensorDst, targetChannel);

  let total = c + l + r;
  if (total > 0.0) {
    let steer = forward * (c * c) + leftDir * (l * l) + rightDir * (r * r);
    if (dot(steer, steer) > 1e-6) {
      let scale = min(total, 5.0) * pheromoneWeight;
      (*ant).pheromoneSteer = normalize(steer) * scale;
    }
  } else {
    (*ant).pheromoneSteer = vec3<f32>(0.0);
  }
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let idx = id.x;
  if (idx >= params.antCount) { return; }

  var ant = ants[idx];
  let dt = params.dt;
  ant.currentLifetime += dt;

  let forward = vec3<f32>(sin(ant.rotationY), 0.0, cos(ant.rotationY));
  let right = vec3<f32>(cos(ant.rotationY), 0.0, -sin(ant.rotationY));

  // PHEROMONE DROPPING
  ant.timeSinceSource += dt;
  if (ant.timeSinceSource < 15.0 && ant.isGrounded == 1u) {
    let diff = ant.pos - ant.lastPheromonePos;
    if (dot(diff, diff) >= 0.81) { // 0.9^2
      ant.lastPheromonePos = ant.pos;

      // Write to 3D grid for sensing
      let cellIdx = worldToGridIndex(ant.pos);
      if (cellIdx >= 0) {
        var cell = pheromoneGrid[cellIdx];
        if (ant.state == 0u) {
          cell.x = min(cell.x + 1.0, params.gridMax); // x is the blue pheromone (leaving home)
        } else {
          cell.y = min(cell.y + 1.0, params.gridMax); // y is the red pheromone (returning to colony)
        }
        pheromoneGrid[cellIdx] = cell;
      }

      // Write to instanced sphere ring buffer for rendering
      let slot = atomicAdd(&pheromoneHead, 1u) % params.maxPheromones;
      pheromoneInstances[slot].posScale = vec4<f32>(ant.pos, 1.0);
      pheromoneInstances[slot].color = select(
        vec4<f32>(0.0, 0.0, 1.0, 1.0), // LeavingHome (blue)
        vec4<f32>(1.0, 0.0, 0.0, 1.0), // Returning (red)
        ant.state == 1u // if state is returning, use red, else use blue
      );
    }
  }

  // RANDOM STEERING
  ant.wanderTimer -= dt;
  if (ant.wanderTimer <= 0.0) {
    ant.wanderTimer = randRange(&ant.rngState, 0.3, 1.0);
    var bestDir = forward;
    var bestDot = -1.0;
    for (var i = 0; i < 4; i++) {
      let angle = randRange(&ant.rngState, 0.0, 6.2831853);
      let cand = vec3<f32>(sin(angle), 0.0, cos(angle));
      let d = dot(forward, cand);
      if (d > bestDot) {
        bestDot = d;
        bestDir = cand;
      }
    }
    ant.randomSteer = bestDir;
  }

  // SEARCHING FOR FOOD STEERING
  if (ant.state == 0u) {
    // Searching: check food
    var foundFood = false;
    var closestDistSq = 100.0; // 10.0^2
    var closestFoodPos = vec3<f32>(0.0);
    let cosHalfAngle = cos(55.0 * 3.14159265 / 180.0);

    // Loop through all food items to find the closest one within a certain range or cone
    for (var f = 0u; f < params.foodCount; f++) {
      if (atomicLoad(&foodActive[f]) != 1u) { continue; } // skip eaten (0) and carried (2)

      let toFood = vec3<f32>(foods[f].pos.x - ant.pos.x, 0.0, foods[f].pos.z - ant.pos.z);
      let distSq = dot(toFood, toFood);

      if (distSq < 0.25) {
        let res = atomicCompareExchangeWeak(&foodActive[f], 1u, 2u); // set to carried
        if (res.exchanged) {
          ant.state = 1u;
          ant.carriedFood = f;
          flipAround(&ant);
          foundFood = false;
          break;
        }
      }

      if (distSq < closestDistSq) {
        let inCloseRange = distSq <= 16.0; // 4.0^2
        let inCone = dot(forward, normalize(toFood)) >= cosHalfAngle;
        if (inCloseRange || inCone) {
          closestDistSq = distSq;
          closestFoodPos = foods[f].pos;
          foundFood = true;
        }
      }
    }

    if (foundFood) {
      let dir = vec3<f32>(closestFoodPos.x - ant.pos.x, 0.0, closestFoodPos.z - ant.pos.z);
      if (dot(dir, dir) > 1e-6) {
        ant.pheromoneSteer = normalize(dir);
      }
      ant.randomSteer = vec3<f32>(0.0);
    } else if (ant.state == 0u) {
      handlePheromoneSteering(&ant, forward, right);
    }
  } 
  // RETURNING TO COLONY STEERING
  else {
    // Returning to colony
    let toHome = vec3<f32>(params.colonyPos.x - ant.pos.x, 0.0, params.colonyPos.z - ant.pos.z);
    let distToHome = length(toHome);

    if (distToHome < params.colonyRadius) {
      atomicStore(&foodActive[ant.carriedFood], 0u); // delivered -> hide it
      ant.state = 0u;
      flipAround(&ant);
    } else if (distToHome < 10.0) {
      ant.pheromoneSteer = (toHome / max(distToHome, 1e-6)) * 4.0;
      ant.randomSteer = vec3<f32>(0.0);
    } else {
      handlePheromoneSteering(&ant, forward, right);
    }
  }

  // MOVEMENT & PHYSICS
  let steerForce = ant.randomSteer + ant.pheromoneSteer;
  if (dot(steerForce, steerForce) > 1e-6) {
    let desiredVel = normalize(steerForce) * params.moveSpeed;
    var horizVel = vec3<f32>(ant.vel.x, 0.0, ant.vel.z);
    var accel = (desiredVel - horizVel) * 8.0;
    let accelMag = length(accel);
    if (accelMag > 8.0) {
      accel = accel * (8.0 / accelMag);
    }
    horizVel += accel * dt;
    let speed = length(horizVel);
    if (speed > params.moveSpeed) {
      horizVel = horizVel * (params.moveSpeed / speed);
    }
    ant.vel.x = horizVel.x;
    ant.vel.z = horizVel.z;
  }

  if (ant.vel.x * ant.vel.x + ant.vel.z * ant.vel.z > 1e-6) {
    ant.rotationY = atan2(ant.vel.x, ant.vel.z);
  }

  ant.vel.y -= 9.81 * dt; // gravity
  ant.pos += ant.vel * dt;

  if (ant.pos.y <= 0.0) {
    ant.pos.y = 0.0;
    ant.vel.y = 0.0;
    ant.isGrounded = 1u;
  } else {
    ant.isGrounded = 0u;
  }

  // RESPAWN
  if (ant.currentLifetime >= params.maxLifetime) {
    if (ant.state == 1u) {
      // Drop the food on the ground where the ant died
      foods[ant.carriedFood].pos.y = 0.0;
      atomicStore(&foodActive[ant.carriedFood], 1u);
    }

    ant.pos = params.colonyPos;
    ant.state = 0u;
    ant.currentLifetime = 0.0;
    ant.timeSinceSource = 0.0;
    ant.nextDirUpdateTime = 0.0;
    ant.randomSteer = vec3<f32>(0.0);
    ant.pheromoneSteer = vec3<f32>(0.0);
    ant.lastPheromonePos = params.colonyPos;
    ant.rotationY = randRange(&ant.rngState, 0.0, 6.2831853);
    ant.vel = vec3<f32>(sin(ant.rotationY) * params.moveSpeed, 0.0, cos(ant.rotationY) * params.moveSpeed);
  }

  ants[idx] = ant;

  // write to instanced buffer for rendering
  let c = cos(ant.rotationY);
  let s = sin(ant.rotationY);

  if (ant.state == 1u) {
    let headForward = vec3<f32>(s, 0.0, c);
    foods[ant.carriedFood].pos = ant.pos + headForward * 0.67 + vec3<f32>(0.0, 0.3, 0.0);
  }

  let remaining = clamp(1.0 - ant.currentLifetime / params.maxLifetime, 0.0, 1.0);

  instances[idx].model = mat4x4<f32>(
    vec4<f32>(c,  0.0, -s,  0.0),
    vec4<f32>(0.0, 1.0, 0.0, 0.0),
    vec4<f32>(s,  0.0,  c,  0.0),
    vec4<f32>(ant.pos.x, ant.pos.y, ant.pos.z, 1.0)
  );

  // if the ant is returning to the colony, make it yellowish, else keep it same color
  if (ant.state == 1u) {
    instances[idx].color = vec4<f32>(remaining, remaining, 0.0, remaining);
  } else {
    instances[idx].color = vec4<f32>(remaining, remaining, remaining, remaining);
  }
}

