import * as pty from "node-pty";
import { v4 as uuid } from "uuid";
import { getDb } from "./db.js";
import type { SessionConfig, SessionInfo, TabInfo } from "./types.js";

const BUFFER_MAX_LINES = 1000;

interface LiveSession {
  config: SessionConfig;
  pty: pty.IPty;
  buffer: string[];
  status: "running" | "stopped" | "crashed";
  createdAt: number;
}

export class SessionManager {
  private sessions = new Map<string, LiveSession>();
  private onOutput?: (sessionId: string, data: string) => void;
  private onStatus?: (sessionId: string, status: string) => void;

  setOutputHandler(fn: (sessionId: string, data: string) => void) {
    this.onOutput = fn;
  }

  setStatusHandler(fn: (sessionId: string, status: string) => void) {
    this.onStatus = fn;
  }

  // --- Tab CRUD ---

  createTab(name: string): TabInfo {
    const db = getDb();
    const id = uuid();
    const maxPos = db.prepare("SELECT COALESCE(MAX(position), -1) as m FROM tabs").get() as { m: number };
    db.prepare("INSERT INTO tabs (id, name, position) VALUES (?, ?, ?)").run(id, name, maxPos.m + 1);
    return { id, name, position: maxPos.m + 1, createdAt: Math.floor(Date.now() / 1000) };
  }

  getTabs(): TabInfo[] {
    return getDb().prepare("SELECT id, name, position, created_at as createdAt FROM tabs ORDER BY position").all() as TabInfo[];
  }

  renameTab(tabId: string, name: string) {
    getDb().prepare("UPDATE tabs SET name = ? WHERE id = ?").run(name, tabId);
  }

  deleteTab(tabId: string) {
    const sessions = getDb().prepare("SELECT id FROM sessions WHERE tab_id = ?").all() as { id: string }[];
    for (const s of sessions) this.destroySession(s.id);
    getDb().prepare("DELETE FROM tabs WHERE id = ?").run(tabId);
  }

  reorderTabs(tabIds: string[]) {
    const db = getDb();
    const stmt = db.prepare("UPDATE tabs SET position = ? WHERE id = ?");
    const tx = db.transaction(() => {
      tabIds.forEach((id, i) => stmt.run(i, id));
    });
    tx();
  }

  // --- Session CRUD ---

  createSession(opts: { name: string; command: string; cwd: string; type: "kiro" | "shell"; tabId: string; autoRestart?: boolean }): SessionInfo {
    const db = getDb();
    const id = uuid();
    const config: SessionConfig = { id, name: opts.name, command: opts.command, cwd: opts.cwd, type: opts.type, tabId: opts.tabId, autoRestart: opts.autoRestart ?? false };

    db.prepare("INSERT INTO sessions (id, name, command, cwd, type, tab_id, auto_restart) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
      id, config.name, config.command, config.cwd, config.type, config.tabId, config.autoRestart ? 1 : 0
    );

    this.spawnPty(config);
    return this.getSessionInfo(id)!;
  }

  private spawnPty(config: SessionConfig) {
    const [cmd, ...args] = config.command.split(/\s+/);
    const shell = pty.spawn(cmd, args, {
      name: "xterm-256color",
      cols: 120,
      rows: 30,
      cwd: config.cwd.replace(/^~/, process.env.HOME || "/home"),
      env: { ...process.env, TERM: "xterm-256color" } as Record<string, string>,
    });

    const live: LiveSession = { config, pty: shell, buffer: [], status: "running", createdAt: Date.now() };
    this.sessions.set(config.id, live);

    shell.onData((data) => {
      // Ring buffer
      const lines = data.split("\n");
      for (const line of lines) {
        live.buffer.push(line);
        if (live.buffer.length > BUFFER_MAX_LINES) live.buffer.shift();
      }
      this.onOutput?.(config.id, data);
    });

    shell.onExit(({ exitCode }) => {
      live.status = exitCode === 0 ? "stopped" : "crashed";
      this.onStatus?.(config.id, live.status);
      if (live.status === "crashed" && config.autoRestart) {
        setTimeout(() => this.restartSession(config.id), 2000);
      }
    });
  }

  destroySession(id: string) {
    const live = this.sessions.get(id);
    if (live) {
      try { live.pty.kill(); } catch {}
      this.sessions.delete(id);
    }
    getDb().prepare("DELETE FROM sessions WHERE id = ?").run(id);
  }

  restartSession(id: string) {
    const live = this.sessions.get(id);
    if (!live) return;
    try { live.pty.kill(); } catch {}
    live.buffer = [];
    this.spawnPty(live.config);
  }

  renameSession(id: string, name: string) {
    getDb().prepare("UPDATE sessions SET name = ? WHERE id = ?").run(name, id);
    const live = this.sessions.get(id);
    if (live) live.config.name = name;
  }

  writeToSession(id: string, data: string) {
    this.sessions.get(id)?.pty.write(data);
  }

  resizeSession(id: string, cols: number, rows: number) {
    try { this.sessions.get(id)?.pty.resize(cols, rows); } catch {}
  }

  getSessionInfo(id: string): SessionInfo | undefined {
    const live = this.sessions.get(id);
    if (!live) return;
    return { ...live.config, status: live.status, createdAt: live.createdAt };
  }

  getAllSessions(): SessionInfo[] {
    return Array.from(this.sessions.values()).map((l) => ({
      ...l.config, status: l.status, createdAt: l.createdAt,
    }));
  }

  getBuffer(id: string): string {
    return this.sessions.get(id)?.buffer.join("\n") ?? "";
  }

  getBufferByName(name: string): string {
    for (const l of this.sessions.values()) {
      if (l.config.name === name) return l.buffer.join("\n");
    }
    return "";
  }

  getSessionByName(name: string): LiveSession | undefined {
    for (const l of this.sessions.values()) {
      if (l.config.name === name) return l;
    }
  }

  // Restore sessions from DB on startup
  restoreSessions() {
    const rows = getDb().prepare("SELECT id, name, command, cwd, type, tab_id as tabId, auto_restart as autoRestart FROM sessions").all() as (SessionConfig & { autoRestart: number })[];
    for (const row of rows) {
      this.spawnPty({ ...row, autoRestart: !!row.autoRestart });
    }
  }
}
