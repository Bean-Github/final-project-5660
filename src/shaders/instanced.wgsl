struct SceneUniforms {
  model: mat4x4<f32>,
  viewProj: mat4x4<f32>,
  color: vec4f,
  lightDir: vec4f,
};

struct InstanceData {
  posScale: vec4<f32>, // xyz = position, w = scale
  color: vec4<f32>,
};

@group(0) @binding(0) var<uniform> uniforms: SceneUniforms;
@group(1) @binding(0) var<storage, read> instances: array<InstanceData>;

struct VertexOutput {
  @builtin(position) clipPosition: vec4f,
  @location(0) normal: vec3f,
  @location(1) uv: vec2f,
  @location(2) @interpolate(flat) instanceID: u32,
};


@vertex
fn vertexMain(
  @location(0) pos: vec4<f32>,
  @location(1) normal: vec4<f32>,
  @location(2) uv: vec2<f32>,
  @builtin(instance_index) idx: u32,
) -> VertexOutput {
  let inst = instances[idx];
  let worldPos = pos.xyz * inst.posScale.w + inst.posScale.xyz;

  var out: VertexOutput;
  out.clipPosition = uniforms.viewProj * vec4f(worldPos, 1.0);
  out.normal = normalize(normal.xyz);
  out.uv = uv;
  out.instanceID = idx;
  return out;
}

@fragment
fn fragmentMain(
    input: VertexOutput
) -> @location(0) vec4f {
  let inst = instances[input.instanceID];

  return vec4f(inst.color.rgb * uniforms.color.rgb, inst.color.a * uniforms.color.a);
}
