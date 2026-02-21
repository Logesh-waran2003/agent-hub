import express from "express";
import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import { SessionManager } from "./session-manager.js";
import { registerHandlers } from "./socket-handlers.js";
import { startProgressWatcher } from "./progress-watcher.js";
import { getDb } from "./db.js";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);

async function main() {
  // Init DB
  getDb();

  const app = express();
  const server = createServer(app);
  const io = new Server(server, { cors: { origin: "*" } });

  // Session manager
  const mgr = new SessionManager();
  mgr.restoreSessions();

  // Socket handlers
  registerHandlers(io, mgr);
  startProgressWatcher(io);

  // Next.js
  const nextApp = next({ dev, dir: process.cwd() });
  const handle = nextApp.getRequestHandler();
  await nextApp.prepare();
  app.use((req, res) => handle(req, res));

  server.listen(port, () => {
    console.log(`▪ AI Agents Hub running on http://localhost:${port}`);
  });
}

main().catch(console.error);
