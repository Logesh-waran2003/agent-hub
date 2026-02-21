import type { Server, Socket } from "socket.io";
import type { SessionManager } from "./session-manager.js";
import { processInput } from "./context-bridge.js";
import { getDb } from "./db.js";
import { v4 as uuid } from "uuid";
import type { TaskInfo } from "./types.js";

export function registerHandlers(io: Server, mgr: SessionManager) {
  // Broadcast helpers
  mgr.setOutputHandler((sessionId, data) => {
    io.emit("session:output", { sessionId, data });
  });
  mgr.setStatusHandler((sessionId, status) => {
    io.emit("session:status", { sessionId, status });
  });

  io.on("connection", (socket: Socket) => {
    // Send full workspace state on connect
    socket.emit("workspace:state", {
      tabs: mgr.getTabs(),
      sessions: mgr.getAllSessions(),
      tasks: getAllTasks(),
    });

    // --- Tabs ---
    socket.on("tab:create", ({ name }, cb) => {
      try { cb({ tab: mgr.createTab(name) }); } catch (e: any) { cb({ error: e.message }); }
    });
    socket.on("tab:rename", ({ tabId, name }) => { mgr.renameTab(tabId, name); io.emit("tab:renamed", { tabId, name }); });
    socket.on("tab:destroy", ({ tabId }, cb) => {
      try { mgr.deleteTab(tabId); io.emit("tab:destroyed", { tabId }); cb?.({}); } catch (e: any) { cb?.({ error: e.message }); }
    });
    socket.on("tab:reorder", ({ tabIds }) => { mgr.reorderTabs(tabIds); io.emit("tab:reordered", { tabIds }); });

    // --- Sessions ---
    socket.on("session:create", (payload, cb) => {
      try {
        const session = mgr.createSession(payload);
        io.emit("session:created", { session });
        cb({ session });
      } catch (e: any) { cb({ error: e.message }); }
    });

    socket.on("session:destroy", ({ sessionId }, cb) => {
      mgr.destroySession(sessionId);
      io.emit("session:destroyed", { sessionId });
      cb?.({});
    });

    socket.on("session:restart", ({ sessionId }, cb) => {
      mgr.restartSession(sessionId);
      const session = mgr.getSessionInfo(sessionId);
      io.emit("session:restarted", { session });
      cb?.({ session });
    });

    socket.on("session:rename", ({ sessionId, name }, cb) => {
      try {
        mgr.renameSession(sessionId, name);
        io.emit("session:renamed", { sessionId, name });
        cb?.({});
      } catch (e: any) { cb?.({ error: e.message }); }
    });

    socket.on("session:input", ({ sessionId, data }) => {
      const processed = processInput(sessionId, data, mgr);
      mgr.writeToSession(sessionId, processed);
    });

    socket.on("session:resize", ({ sessionId, cols, rows }) => {
      mgr.resizeSession(sessionId, cols, rows);
    });

    socket.on("session:attach", ({ sessionId }) => {
      const buf = mgr.getBuffer(sessionId);
      if (buf) socket.emit("session:buffer", { sessionId, data: buf });
    });

    // --- Tasks ---
    socket.on("task:create", (payload, cb) => {
      try {
        const task = createTask(payload);
        io.emit("task:created", { task });
        cb({ task });
      } catch (e: any) { cb({ error: e.message }); }
    });

    socket.on("task:update", (payload, cb) => {
      try {
        const task = updateTask(payload);
        io.emit("task:updated", { task });
        cb?.({ task });
      } catch (e: any) { cb?.({ error: e.message }); }
    });

    socket.on("task:delete", ({ taskId }, cb) => {
      getDb().prepare("DELETE FROM tasks WHERE id = ?").run(taskId);
      io.emit("task:deleted", { taskId });
      cb?.({});
    });

    // --- Mentions list ---
    socket.on("session:mentions", (_, cb) => {
      const sessions = mgr.getAllSessions().map((s) => ({ name: s.name, type: s.type, status: s.status }));
      cb({ sessions });
    });
  });
}

// Task helpers
function getAllTasks(): TaskInfo[] {
  return getDb().prepare("SELECT id, title, description, status, priority, assigned_session as assignedSession, depends_on as dependsOn, created_at as createdAt, started_at as startedAt, completed_at as completedAt FROM tasks ORDER BY priority DESC, created_at ASC").all().map((r: any) => ({
    ...r, dependsOn: r.dependsOn ? JSON.parse(r.dependsOn) : undefined,
  })) as TaskInfo[];
}

function createTask(p: { title: string; description?: string; priority?: number; assignedSession?: string; dependsOn?: string[] }): TaskInfo {
  const id = uuid();
  getDb().prepare("INSERT INTO tasks (id, title, description, priority, assigned_session, depends_on) VALUES (?, ?, ?, ?, ?, ?)").run(
    id, p.title, p.description ?? null, p.priority ?? 0, p.assignedSession ?? null, p.dependsOn ? JSON.stringify(p.dependsOn) : null
  );
  return { id, title: p.title, description: p.description, status: "pending", priority: p.priority ?? 0, assignedSession: p.assignedSession, dependsOn: p.dependsOn, createdAt: Math.floor(Date.now() / 1000) };
}

function updateTask(p: { taskId: string; title?: string; status?: string; assignedSession?: string; priority?: number }): TaskInfo {
  const db = getDb();
  if (p.title) db.prepare("UPDATE tasks SET title = ? WHERE id = ?").run(p.title, p.taskId);
  if (p.status) {
    db.prepare("UPDATE tasks SET status = ? WHERE id = ?").run(p.status, p.taskId);
    if (p.status === "active") db.prepare("UPDATE tasks SET started_at = unixepoch() WHERE id = ?").run(p.taskId);
    if (p.status === "done") db.prepare("UPDATE tasks SET completed_at = unixepoch() WHERE id = ?").run(p.taskId);
  }
  if (p.assignedSession !== undefined) db.prepare("UPDATE tasks SET assigned_session = ? WHERE id = ?").run(p.assignedSession, p.taskId);
  if (p.priority !== undefined) db.prepare("UPDATE tasks SET priority = ? WHERE id = ?").run(p.priority, p.taskId);
  return db.prepare("SELECT id, title, description, status, priority, assigned_session as assignedSession, depends_on as dependsOn, created_at as createdAt, started_at as startedAt, completed_at as completedAt FROM tasks WHERE id = ?").get(p.taskId) as TaskInfo;
}
