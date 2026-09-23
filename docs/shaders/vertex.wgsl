struct Uniforms {
    view: mat4x4<f32>,
    projection: mat4x4<f32>
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexIn {
    @location(0) pos: vec3f,
};

struct VertexOut {
    @builtin(position) pos: vec4f,
    @location(0) worldPos: vec3f,
};

@vertex
fn vs(input: VertexIn) -> VertexOut {
    var out: VertexOut;

    out.pos = uniforms.projection * uniforms.view * vec4f(input.pos, 1.0);
    out.worldPos = input.pos;

    return out;
}
