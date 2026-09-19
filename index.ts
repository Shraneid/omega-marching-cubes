import index from './index.html';
import { watch } from "node:fs";

const clients = new Set<Bun.ServerWebSocket>();

const server = Bun.serve({
    port: 3000,
    routes: {
        "/": index,
    },
    websocket: {
        open(ws) { clients.add(ws); },
        close(ws) { clients.delete(ws); },
        message() {},
    },
    fetch(req, server) {
        const { pathname } = new URL(req.url);
        if (pathname === "/_reload" && server.upgrade(req)) return;

        const file = Bun.file(`./public${pathname}`);   // e.g. /shaders/vertex.wgsl -> ./public/shaders/vertex.wgsl
        return file.exists().then((ok) =>
            ok ? new Response(file) : new Response("Not found", { status: 404 }),
        );
    },
});
watch("./public", { recursive: true }, () => {
    for (const ws of clients) ws.send("reload");
});

console.log(`Listening on ${server.url}`);
