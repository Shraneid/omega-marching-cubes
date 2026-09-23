// Shared state between the React UI (writer) and the WebGPU render loop (reader).
// `maxScale` caps the ramp; the loop animates the actual scale from MIN_SCALE up
// to it. Changing `maxScale` sets `restart`, which makes the loop replay the ramp.
export const controls = {
    maxScale: 20,
    restart: true,
};

export const MIN_SCALE = 4;
export const MAX_SCALE = 50;

export const setMaxScale = (value: number) => {
    const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.round(value)));
    controls.maxScale = clamped;
    controls.restart = true;
    return clamped;
};
