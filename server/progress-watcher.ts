import { watch, readFileSync } from "fs";
import type { Server } from "socket.io";

const PROGRESS_FILES = [
  "/home/logesh/Coding/current/scaleupstores/code/docs/PROGRESS.json",
];

export function startProgressWatcher(io: Server) {
  function read(path: string) {
    try { return JSON.parse(readFileSync(path, "utf-8")); } catch { return null; }
  }

  // Emit current state on new connections
  io.on("connection", (socket) => {
    const all = PROGRESS_FILES.map((p) => ({ path: p, data: read(p) })).filter((e) => e.data);
    if (all.length) socket.emit("progress:state", all);
    socket.on("progress:request", () => {
      if (all.length) socket.emit("progress:state", all);
    });
  });

  // Watch each file
  for (const path of PROGRESS_FILES) {
    try {
      watch(path, () => {
        const data = read(path);
        if (data) io.emit("progress:update", { path, data });
      });
    } catch {}
  }
}
