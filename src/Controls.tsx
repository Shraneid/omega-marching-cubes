import { useState } from "react";
import {
    controls,
    setMaxScale,
    setSdf,
    SDF_PRESETS,
    DEFAULT_SDF_SOURCE,
    MIN_SCALE,
    MAX_SCALE,
} from "./controls.ts";

const panelStyle: React.CSSProperties = {
    position: "fixed",
    top: 12,
    left: 12,
    zIndex: 10,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: 8,
    borderRadius: 6,
    background: "rgba(0, 0, 0, 0.5)",
    color: "#fff",
    fontFamily: "monospace",
    fontSize: 12,
};

const rowStyle: React.CSSProperties = {
    display: "flex",
    gap: 8,
    alignItems: "center",
};

export const Controls = () => {
    const [maxScale, setMaxScaleState] = useState(controls.maxScale);
    const [source, setSource] = useState(DEFAULT_SDF_SOURCE);
    const [error, setError] = useState<string | null>(null);

    const updateScale = (value: number) => {
        if (Number.isNaN(value)) return;
        setMaxScaleState(setMaxScale(value));
    };

    const evaluate = () => {
        try {
            setSdf(source);
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    };

    return (
        <div style={panelStyle}>
            <div style={rowStyle}>
                <label>max scale</label>
                <input
                    type="range"
                    min={MIN_SCALE}
                    max={MAX_SCALE}
                    step={1}
                    value={maxScale}
                    onChange={(e) => updateScale(e.target.valueAsNumber)}
                />
                <input
                    type="number"
                    min={MIN_SCALE}
                    max={MAX_SCALE}
                    step={1}
                    value={maxScale}
                    style={{ width: "4em" }}
                    onChange={(e) => updateScale(e.target.valueAsNumber)}
                />
            </div>

            <div style={rowStyle}>
                <span>presets:</span>
                {SDF_PRESETS.map((preset) => (
                    <button key={preset.name} onClick={() => setSource(preset.source)}>
                        {preset.name}
                    </button>
                ))}
            </div>

            <label>sdf (position) =&gt; number</label>
            <textarea
                value={source}
                onChange={(e) => setSource(e.target.value)}
                spellCheck={false}
                rows={6}
                style={{ width: "24em", fontFamily: "monospace", fontSize: 12 }}
            />

            <button onClick={evaluate}>evaluate</button>
            {error && <div style={{ color: "#ff6b6b", maxWidth: "24em" }}>{error}</div>}
        </div>
    );
};
