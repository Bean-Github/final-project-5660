struct SceneUniforms {
  model: mat4x4<f32>,
  viewProj: mat4x4<f32>,
  color: vec4f,
  lightDir: vec4f,
};

@group(0) @binding(0)
var<uniform> scene: SceneUniforms;

@group(1) @binding(0) var albedoTexture: texture_2d<f32>;
@group(1) @binding(1) var albedoSampler: sampler;


struct VertexOutput {
  @builtin(position) clipPosition: vec4f,
  @location(0) normal: vec3f,
  @location(1) uv: vec2f
};

@vertex
fn vertexMain(
  @location(0) position: vec4f,
  @location(1) normal: vec4f,
  @location(2) uv: vec2f
) -> VertexOutput {
  var output: VertexOutput;
  output.clipPosition = scene.viewProj * scene.model * position;
  output.normal = normalize((scene.model * vec4f(normal.xyz, 0.0)).xyz);
  output.uv = uv;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let texel = textureSample(albedoTexture, albedoSampler, input.uv);
  let normal = normalize(input.normal);
  let light = normalize(scene.lightDir.xyz);

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
    texel.rgb * scene.color.rgb * lighting,
    texel.a * scene.color.a,
  );
}

