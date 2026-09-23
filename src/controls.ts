export const controls = {
    maxScale: 50,
    restart: true,
};

export const MIN_SCALE = 4;
export const MAX_SCALE = 150;

export const setMaxScale = (value: number) => {
    const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.round(value)));
    controls.maxScale = clamped;
    controls.restart = true;
    return clamped;
};
