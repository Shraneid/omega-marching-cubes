// Shared state between the React UI (writer) and the WebGPU render loop (reader).
// `maxScale` caps the ramp; the loop animates the actual scale from MIN_SCALE up
// to it. `sdf` is the density function the mesher samples. Changing either sets
// `restart`, which makes the loop replay the ramp with the current state.
export type SdfFn = (position: [number, number, number]) => number;

// Helper exposed to user-authored SDF source (referenced as `length(...)`).
export const length = (v: number[]) => {
    let sum = 0;
    for (const p of v) {
        sum += p ** 2;
    }
    return Math.sqrt(sum);
};

export const SDF_PRESETS: { name: string; source: string }[] = [
    {
        name: "sphere",
        source: `const radius = 1;
return length(position) - radius;`,
    },
    {
        name: "torus",
        source: `const t = [0.5, 0.25];
const q = [length([position[0], position[2]]) - t[0], position[1]];
return length(q) - t[1];`,
    },
];

export const DEFAULT_SDF_SOURCE = SDF_PRESETS[1].source; // torus

// Compiles the body of `(position) => { ... }` into an SdfFn. `length` and the
// global `Math` are available inside. Throws if the code is invalid or does not
// return a finite number for a sample position.
export const compileSdf = (source: string): SdfFn => {
    // eslint-disable-next-line no-new-func -- intentional: user-authored SDF (local dev tool)
    const fn = new Function("position", "length", `"use strict";\n${source}`) as (
        position: [number, number, number],
        len: typeof length,
    ) => number;

    const sample = fn([0.12, 0.34, 0.56], length);
    if (typeof sample !== "number" || !Number.isFinite(sample)) {
        throw new Error("SDF must return a finite number");
    }
    return (position) => fn(position, length);
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
