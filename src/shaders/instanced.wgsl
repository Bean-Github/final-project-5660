struct SceneUniforms {
  model: mat4x4<f32>,
  viewProj: mat4x4<f32>,
  color: vec4f,
  lightDir: vec4f,
};

struct InstanceData {
  model: mat4x4<f32>,
  color: vec4<f32>,
};

@group(0) @binding(0) var<uniform> uniforms: SceneUniforms;
@group(1) @binding(0) var<storage, read> instances: array<InstanceData>;

@vertex
fn vertexMain(
  @location(0) pos: vec4<f32>,
  @location(1) normal: vec4<f32>,
  @location(2) uv: vec2<f32>,
  @builtin(instance_index) idx: u32,
) -> VertexOut {
  let inst = instances[idx];
  var out: VertexOut;
  out.position = uniforms.viewProj * inst.model * pos;
  out.color = inst.color;
  out.normal = normalize((uniforms.model * vec4f(normal.xyz, 0.0)).xyz);
  out.uv = uv;
  return out;
}