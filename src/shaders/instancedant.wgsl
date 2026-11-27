struct SceneUniforms {
  model: mat4x4<f32>,
  viewProj: mat4x4<f32>,
  color: vec4f,
  lightDir: vec4f,
};

struct InstanceData {
  model: mat4x4<f32>, // xyz = position, w = scale
  color: vec4<f32>,
};

@group(0) @binding(0) var<uniform> uniforms: SceneUniforms;
@group(1) @binding(0) var<storage, read> instances: array<InstanceData>;
@group(1) @binding(1) var albedoTexture: texture_2d<f32>;
@group(1) @binding(2) var albedoSampler: sampler;


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

  // time in seconds packed into lightDir.w
  let time = uniforms.lightDir.w;

  // Offset phase per ant so they don't pulse in unison
  let phase = f32(idx) * 1.37;
  let speed = 15.0;
  let amplitude = 0.12; // +/- 12% size pulse

  let pulse = 1.0 + sin(time * speed + phase) * amplitude;
  let pulsedPos = vec4f(pos.xyz * pulse, 1.0);

  var output: VertexOutput;
  output.clipPosition = uniforms.viewProj * inst.model * pulsedPos;
  output.normal = normalize((inst.model * vec4f(normal.xyz, 0.0)).xyz);
  output.uv = uv;
  output.instanceID = idx;
  return output;
}

@fragment
fn fragmentMain(
    input: VertexOutput
) -> @location(0) vec4f {
  let inst = instances[input.instanceID];
  let texel = textureSample(albedoTexture, albedoSampler, input.uv);
  let normal = normalize(input.normal);
  let light = normalize(uniforms.lightDir.xyz);

  let diffuse = max(dot(normal, light), 0.0);

  var lighting: f32;
  if (diffuse > 0.7) {
    lighting = 1.0;   // highlight
  } else if (diffuse > 0.4) {
    lighting = 0.75;  // lit
  } else if (diffuse > 0.15) {
    lighting = 0.45;  // midtone
  } else {
    lighting = 0.2;   // shadow
  }

  return vec4f(
    texel.rgb * uniforms.color.rgb * lighting * inst.color.rgb,
    texel.a * uniforms.color.a * inst.color.a,
  );

}
