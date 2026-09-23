import { createRoot } from "react-dom/client";
import { Controls } from "./Controls.tsx";

const container = document.getElementById("ui");
if (container) {
    createRoot(container).render(<Controls />);
}
