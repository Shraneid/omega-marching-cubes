import { mat4LookAt, mat4Perspective } from "./helper.ts";
import { pushTriangles } from "./cubeMarch.ts";

new WebSocket(`ws://${location.host}/_reload`).onmessage = () => location.reload();

let startTime: number;
let lastFrameTime: number;

// getting the HTML canvas
const canvas: HTMLCanvasElement = document.getElementById("GLCanvas")! as HTMLCanvasElement;

// MAIN SETUP FOR RENDERING
const adapter = await navigator.gpu?.requestAdapter();
const device = await adapter?.requestDevice();

if (!device) {
    throw Error("No gpu detected");
}

const context = canvas.getContext("webgpu");
if (!context) {
    throw Error("Error getting the context");
}

const devicePixelRatio = window.devicePixelRatio;
canvas.width = canvas.clientWidth * devicePixelRatio;
canvas.height = canvas.clientHeight * devicePixelRatio;

const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
context.configure({
    device: device,
    format: presentationFormat,
});
// END MAIN SETUP FOR RENDERING

// LOAD TEXTURES
const loadTextureToBitmap = async (path: string) => {
    const textureResponse = await fetch(path);
    const textureBlob = await textureResponse.blob();

    return await createImageBitmap(textureBlob);
};

const getTexture = async (path: string, label: string) => {
    const bitmap = await loadTextureToBitmap(path);

    const texture = device.createTexture({
        label,
        size: [bitmap.width, bitmap.height, 1],
        format: "rgba8unorm",
        usage:
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.COPY_DST |
            GPUTextureUsage.RENDER_ATTACHMENT,
    });

    device.queue.copyExternalImageToTexture({ source: bitmap }, { texture }, [
        bitmap.width,
        bitmap.height,
    ]);

    return texture;
};

// LOAD SHADERS
const loadWGSL = async (path: string) => {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
        console.log(response);
        throw new Error(`Failed to load shader: ${path}`);
    }
    return response.text();
};

const loadShaderModule = async (path: string): Promise<GPUShaderModule> => {
    const code = await loadWGSL(path);
    const module = device.createShaderModule({ code, label: path });

    const info = await module.getCompilationInfo();
    const errors = info.messages.filter((m) => m.type === "error");
    if (errors.length > 0) {
        for (const m of errors) {
            console.error(`%c${path}:${m.lineNum}:${m.linePos} ${m.message}`, "color:#ff5555");
        }
        throw new Error(
            `Shader compilation failed in ${path}:\n` +
                errors.map((m) => `  ${m.lineNum}:${m.linePos} ${m.message}`).join("\n"),
        );
    }
    return module;
};

const vertexShader = await loadShaderModule("/shaders/vertex.wgsl");
const fragmentShader = await loadShaderModule("/shaders/fragment.wgsl");
// END LOAD SHADERS

const length = (position: number[]) => {
    let sum = 0;
    for (const p of position) {
        sum += p ** 2;
    }
    return Math.sqrt(sum);
};

const sphereSdf = (position: [number, number, number]) => {
    const radius = 1;
    return length(position) - radius;
};

const torusSdf = (position: [number, number, number]) => {
    {
        const t = [0.5, 0.25];
        const q = [length([position[0], position[2]]) - t[0], position[1]];
        return length(q) - t[1];
    }
};

// VERTEX DATA
let verts: number[] = [];
let scale = 0;
let oldScale = 0;
let vertices = new Float32Array(verts);
// END VERTEX DATA

// BUFFERS
const vertexBuffer = device.createBuffer({
    size: 1000000 * 8,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
});
// device.queue.writeBuffer(vertexBuffer, 0, vertices);

const uniformBuffer = device.createBuffer({
    label: "Uniform Buffer",
    size: 160, // 152 +  padding, rounded at 16 bytes
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
// END BUFFERS

// RENDER TARGET
const RENDER_SCALE = 1.0;
const renderTargetSize = {
    width: canvas.width * RENDER_SCALE,
    height: canvas.height * RENDER_SCALE,
};

const sceneTexture = device.createTexture({
    label: "",
    size: [renderTargetSize.width, renderTargetSize.height],
    format: presentationFormat,
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
});
// END RENDER TARGET

// BIND GROUP LAYOUTS
const renderBindGroupLayout = device.createBindGroupLayout({
    label: "Render Bind Group Layout",
    entries: [
        {
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: { type: "uniform" },
        },
    ],
});
// END BIND GROUP LAYOUTS

// PIPELINES SETUP
const renderPipelineLayout = device.createPipelineLayout({
    label: "Render Pipeline Layout",
    bindGroupLayouts: [renderBindGroupLayout],
});

const renderPipeline = device.createRenderPipeline({
    label: "Render Pipeline",
    layout: renderPipelineLayout,
    primitive: {
        topology: "triangle-list",
        cullMode: "none",
    },
    vertex: {
        module: vertexShader,
        buffers: [
            {
                arrayStride: 3 * 4,
                attributes: [
                    {
                        shaderLocation: 0,
                        offset: 0,
                        format: "float32x3",
                    },
                ],
            },
        ],
    },
    fragment: {
        module: fragmentShader,
        targets: [
            {
                format: presentationFormat,
                blend: {
                    color: {
                        srcFactor: "src-alpha",
                        dstFactor: "one-minus-src-alpha",
                        operation: "add",
                    },
                    alpha: {
                        srcFactor: "one",
                        dstFactor: "one-minus-src-alpha",
                        operation: "add",
                    },
                },
            },
        ],
    },
    // primitive: {
    //     topology: "triangle-list",
    //     cullMode: "back",
    // },
    depthStencil: {
        depthWriteEnabled: true,
        depthCompare: "less",
        format: "depth24plus",
    },
});

const depthTexture = device.createTexture({
    size: [canvas.width, canvas.height],
    format: "depth24plus",
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
});

const depthView = depthTexture.createView();

// BIND GROUPS
const renderBindGroup = device.createBindGroup({
    label: "Render Bind Group",
    layout: renderBindGroupLayout,
    entries: [
        {
            binding: 0,
            resource: { buffer: uniformBuffer },
        },
    ],
});

// Render Pass Descriptors
const renderPassDescriptor = {
    label: "Render Pass Description",
    colorAttachments: [
        {
            view: sceneTexture.createView(),
            clearValue: [0, 0, 0, 1],
            loadOp: "clear",
            storeOp: "store",
        },
    ],
    depthStencilAttachment: {
        view: depthView,
        depthClearValue: 1,
        depthLoadOp: "clear",
        depthStoreOp: "store",
    },
};

// END PIPELINES SETUP

// SENDING BUFFERS TO GPU

// RENDER
const render = (deltaTime: number, elapsedTime: number) => {
    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();

    const encoder = device.createCommandEncoder({ label: "command encoder" });

    // MVP Matrices setup
    const aspect = canvas.width / canvas.height;

    // ORBITING CAMERA
    const angle = elapsedTime / 1000;
    const cameraDepth = 3.0;
    const cameraPos: [number, number, number] = [
        Math.sin(angle) * cameraDepth,
        Math.sin(angle),
        Math.cos(angle) * cameraDepth,
    ];

    // MVP Matrices
    const view = mat4LookAt(cameraPos, [0, 0, 0], [0, 1, 0]);
    const projection = mat4Perspective(Math.PI / 4, aspect, 0.1, 1000.0);

    // UNIFORMS
    device.queue.writeBuffer(uniformBuffer, 0, view);
    device.queue.writeBuffer(uniformBuffer, 64, projection);
    device.queue.writeBuffer(uniformBuffer, 128, new Float32Array([...cameraPos, 0]));
    device.queue.writeBuffer(uniformBuffer, 144, new Float32Array([deltaTime / 1000, elapsedTime]));

    // UPDATE VERTEX BUFFER
    scale = Math.min(4 + Math.floor((elapsedTime / 1000) * 20), 50);
    if (oldScale !== scale) {
        oldScale = scale;
        verts = [];
        pushTriangles(torusSdf, scale, verts);
        vertices = new Float32Array(verts);

        device.queue.writeBuffer(vertexBuffer, 0, vertices);
    }
    // END UPDATE VERTEX BUFFER

    // RENDER PASS
    // @ts-ignore
    const renderPass = encoder.beginRenderPass(renderPassDescriptor);
    renderPass.setPipeline(renderPipeline);
    renderPass.setBindGroup(0, renderBindGroup);

    renderPass.setVertexBuffer(0, vertexBuffer);
    // renderPass.setIndexBuffer(indexBuffer, "uint16");

    renderPass.draw(vertices.length / 3);
    renderPass.end();

    device.queue.submit([encoder.finish()]);
};

const renderLoop = (timestamp: number) => {
    if (startTime === undefined) {
        startTime = timestamp;
        lastFrameTime = timestamp;
    }
    const elapsedTime = timestamp - startTime;
    const deltaTime = timestamp - lastFrameTime;

    render(deltaTime, elapsedTime);

    lastFrameTime = timestamp;
    console.log("looping");
    requestAnimationFrame(renderLoop);
};

requestAnimationFrame(renderLoop);
// END RENDER
