@vertex
fn vertexMain(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
    var points = array<vec2f, 3>(
    vec2f( 0.0,  0.6),
    vec2f(-0.6, -0.6),
    vec2f( 0.6, -0.6)
    );
    return vec4f(points[i], 0.0, 1.0);
}

@fragment
fn fragmentMain() -> @location(0) vec4f {
    return vec4f(0.2, 0.85, 0.45, 1.0);
}



