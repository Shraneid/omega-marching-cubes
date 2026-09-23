import { useState } from "react";
import { controls, setMaxScale, MIN_SCALE, MAX_SCALE } from "./controls.ts";

const panelStyle: React.CSSProperties = {
    position: "fixed",
    top: 12,
    left: 12,
    zIndex: 10,
    display: "flex",
    gap: 8,
    alignItems: "center",
    padding: 8,
    borderRadius: 6,
    background: "rgba(0, 0, 0, 0.5)",
    color: "#fff",
    fontFamily: "monospace",
};

export const Controls = () => {
    const [maxScale, setMaxScaleState] = useState(controls.maxScale);

    const update = (value: number) => {
        if (Number.isNaN(value)) return;
        setMaxScaleState(setMaxScale(value));
    };

    return (
        <div style={panelStyle}>
            <label>max scale</label>
            <input
                type="range"
                min={MIN_SCALE}
                max={MAX_SCALE}
                step={1}
                value={maxScale}
                onChange={(e) => update(e.target.valueAsNumber)}
            />
            <input
                type="number"
                min={MIN_SCALE}
                max={MAX_SCALE}
                step={1}
                value={maxScale}
                style={{ width: "4em" }}
                onChange={(e) => update(e.target.valueAsNumber)}
            />
        </div>
    );
};
