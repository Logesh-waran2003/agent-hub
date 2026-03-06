import { watch, readFileSync } from "fs";
import type { Server } from "socket.io";

/**
 * PROGRESS.json required shape (KanbanBoard.tsx depends on this — do NOT change):
 *
 * {
 *   phase: string,           // phase label in header
 *   current_task: string,    // subtitle in header
 *   status: string,          // e.g. "active" | "planning" | "paused"
 *   updated_at: string,      // ISO date
 *   columns: {
 *     done:        Card[],
 *     in_progress: Card[],
 *     todo:        Card[],
 *   }
 * }
 *
 * Card: { id: string, title: string, commit?: string, files?: number,
 *         subtasks?: { id: string, title: string,
 *                      status: "done"|"in_progress"|"blocked"|"todo" }[] }
 *
 * The file also contains a "_schema" key with the same documentation.
 */
const PROGRESS_FILES = (process.env.PROGRESS_FILES ?? "")
  .split(",")
  .map((p) => p.trim())
  .filter(Boolean);

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
