struct SceneUniforms {
  model: mat4x4<f32>,
  viewProj: mat4x4<f32>,
  color: vec4f,
};

@group(0) @binding(0)
var<uniform> scene: SceneUniforms;

struct VertexOutput {
  @builtin(position) clipPosition: vec4f,
  @location(0) normal: vec3f,
};

@vertex
fn vertexMain(
  @location(0) position: vec4f,
  @location(1) normal: vec4f,
) -> VertexOutput {
  var output: VertexOutput;
  output.clipPosition = scene.viewProj * scene.model * position;
  output.normal = normalize((scene.model * vec4f(normal.xyz, 0.0)).xyz);
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let light = normalize(vec3f(0.5, 0.8, 1.0));
  let diffuse = max(dot(normalize(input.normal), light), 0.0);

  return vec4f(
    scene.color.rgb * (0.2 + 0.8 * diffuse),
    scene.color.a
  );
}