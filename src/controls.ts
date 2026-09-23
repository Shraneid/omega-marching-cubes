export type SdfFn = (position: [number, number, number]) => number;

export const length = (v: number[]) => {
    let sum = 0;
    for (const p of v) {
        sum += p ** 2;
    }
    return Math.sqrt(sum);
};
export const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);
export const dot = (v1: number[], v2: number[]) => {
    return v1.reduce((sum, val, i) => sum + val * v2[i], 0);
};

export const SDF_PRESETS: { name: string; source: string }[] = [
    {
        name: "sphere",
        source: `
const radius = 1;
return length(position) - radius;
        `,
    },
    {
        name: "torus",
        source: `
const t = [0.5, 0.25];
const q = [length([position[0], position[2]]) - t[0], position[1]];
return length(q) - t[1];
        `,
    },
    {
        name: "box",
        source: `    
const b = [0.3, 0.2, .6];
const q = [
    Math.abs(position[0]) - b[0],
    Math.abs(position[1]) - b[1],
    Math.abs(position[2]) - b[2],
];

const max2 = Math.max(q[1], q[2]);

return (
    length([Math.max(q[0], 0.0), Math.max(q[1], 0.0), Math.max(q[2], 0.0)]) +
    Math.min(Math.max(q[0], max2), 0.0)
);
        `,
    },
    {
        name: "cone",
        source: `    
const c = [1, 2];
const h = 5;

const q = [(h * c[0]) / c[1], -h];

const w = [length([position[0], position[2]]), position[1]];
const a = [
    w[0] - q[0] * clamp(dot(w, q) / dot(q, q), 0.0, 1.0),
    w[1] - q[1] * clamp(dot(w, q) / dot(q, q), 0.0, 1.0),
];
const b = [w[0] - q[0] * clamp(w[0] / q[0], 0.0, 1.0), w[1] - q[1]];
const k = q[1] >= 0 ? 1 : -1;
const d = Math.min(dot(a, a), dot(b, b));
const s = Math.max(k * (w[0] * q[1] - w[1] * q[0]), k * (w[1] - q[1]));
return Math.sqrt(d) * (s >= 0 ? 1 : -1);
        `,
    },
];

export const DEFAULT_SDF_SOURCE = SDF_PRESETS[1].source; // torus

export const compileSdf = (source: string): SdfFn => {
    // eslint-disable-next-line no-new-func -- intentional: user-authored SDF (local dev tool)
    const fn = new Function("position", "length", "clamp", "dot", `"use strict";\n${source}`) as (
        position: [number, number, number],
        len: typeof length,
        cla: typeof clamp,
        dott: typeof dot,
    ) => number;

    const sample = fn([0.12, 0.34, 0.56], length, clamp, dot);
    if (typeof sample !== "number" || !Number.isFinite(sample)) {
        throw new Error("SDF must return a finite number");
    }
    return (position) => fn(position, length, clamp, dot);
};

export const controls = {
    maxScale: 50,
    restart: true,
    sdf: compileSdf(DEFAULT_SDF_SOURCE),
};

export const MIN_SCALE = 4;
export const MAX_SCALE = 150;

export const setMaxScale = (value: number) => {
    const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.round(value)));
    controls.maxScale = clamped;
    controls.restart = true;
    return clamped;
};

export const setSdf = (source: string) => {
    controls.sdf = compileSdf(source);
    controls.restart = true;
};
