struct SphereParams {
  dt: f32,
  count: u32,
  maxLifetime: f32,
  pad: f32,
};

struct PheromoneInstance {
  posScale: vec4<f32>, // xyz = world pos, w = scale
  color: vec4<f32>,    // rgb = color, w = alpha
};

struct DrawIndexedIndirectArgs {
  indexCount: u32,
  instanceCount: atomic<u32>,
  firstIndex: u32,
  baseVertex: i32,
  firstInstance: u32,
};

@group(0) @binding(0) var<uniform> params: SphereParams;
@group(0) @binding(1) var<storage, read_write> instances: array<PheromoneInstance>;
@group(0) @binding(2) var<storage, read_write> visibleInstances: array<PheromoneInstance>;
@group(0) @binding(3) var<storage, read_write> indirect: DrawIndexedIndirectArgs;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let idx = id.x;
  if (idx >= params.count) { return; }

  let currentScale = instances[idx].posScale.w;
  if (currentScale <= 0.0) { return; }

  let decay = params.dt / params.maxLifetime;
  let nextVal = max(currentScale - decay, 0.0);

  instances[idx].posScale.w = nextVal;
  instances[idx].color.w = nextVal;

  // Compact living pheromones into visibleInstances
  if (nextVal > 0.0) {
    let outIdx = atomicAdd(&indirect.instanceCount, 1u);
    visibleInstances[outIdx] = instances[idx];
  }
}