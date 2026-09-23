const MAX_STEPS: i32 = 40;
const MAX_DISTANCE: f32 = 100.0f;
const EPSILON: f32 = 0.01f;
const MARCH_SIZE: f32 = 0.16f;

struct Uniforms {
    view: mat4x4f,
    projection: mat4x4f,
    cameraPosition: vec4f,
    deltaTime: f32,
    elapsedTime: f32
}
@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOut {
    @builtin(position) pos: vec4f,
    @location(0) worldPos: vec3f,
};

@fragment
fn fs(in: VertexOut) -> @location(0) vec4f {
    let norm = normalize(cross(dpdy(in.worldPos), dpdx(in.worldPos)));

    const lightDir = normalize(vec3(3, 2.5, -1));
    const lightColor = vec3(1);
    const objectColor = vec3(1, 0.1, .1);

    const ambient = vec3(.2, .1, .1);

    let diff = max(dot(norm, lightDir), 0.0);
    let diffuse = diff * lightColor;

    let viewDir = normalize(uniforms.cameraPosition.xyz - in.worldPos);
    let reflectDir = reflect(-lightDir, norm);

    let spec = pow(max(dot(viewDir, reflectDir), 0.0), 32);
    let specular = .5 * spec * lightColor;

    return vec4((ambient + diffuse) * objectColor + specular, 1.0);
}