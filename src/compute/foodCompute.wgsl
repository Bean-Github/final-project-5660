struct FoodParams {
  foodCount: u32,
  scale: f32,
  _pad0: u32,
  _pad1: u32,
};

struct FoodInstance {
  posScale: vec4<f32>, // xyz = position, w = scale
  color: vec4<f32>,    // rgba
};

struct DrawIndexedIndirect {
  indexCount: u32,
  instanceCount: atomic<u32>,
  firstIndex: u32,
  baseVertex: u32,
  firstInstance: u32,
};

@group(0) @binding(0) var<uniform> params: FoodParams;
@group(0) @binding(1) var<storage, read> foods: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read> foodActive: array<u32>;
@group(0) @binding(3) var<storage, read_write> visibleInstances: array<FoodInstance>;
@group(0) @binding(4) var<storage, read_write> indirect: DrawIndexedIndirect;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let idx = id.x;
  if (idx >= params.foodCount) {
    return;
  }

  if (foodActive[idx] == 0u) {
    return;
  }

  let outIdx = atomicAdd(&indirect.instanceCount, 1u);
  let pos = foods[idx].xyz;

  visibleInstances[outIdx].posScale = vec4<f32>(pos, params.scale);
  visibleInstances[outIdx].color = vec4<f32>(0.0, 1.0, 0.0, 1.0);
}