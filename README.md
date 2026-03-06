# AI Agents Hub

A web-based workspace for running and coordinating multiple AI coding agents (Claude Code, kiro-cli, or any CLI tool) in parallel — with live terminal streaming, cross-agent context injection, and a real-time Kanban board.

---

## Why

When you're running 3+ AI agents in parallel, the problems are:
- Switching between terminal windows to check progress
- Copy-pasting output from one agent into another's context
- No visibility into what each agent is doing at a glance

Hub solves all three.

---

## Key Features

### `@mention` Context Bridge
Type `@agent-name` in any session's input — Hub automatically injects that agent's last terminal output as context before sending. No copy-paste, no window switching.

```
You: @researcher summarize what you found and write the tests
```

Hub intercepts the message, appends the last output of `@researcher`'s terminal, and sends the enriched prompt to the current agent.

### Live Terminal Streaming
Real PTY sessions (via `node-pty`) streamed to the browser over WebSockets. Full xterm.js rendering with resize support. Not a tmux wrapper — actual terminal emulation in the browser.

### Real-time Kanban Board
Agents write a `PROGRESS.json` file as they work. Hub watches it and updates the board live — no refresh needed. See which tasks are done, in progress, and upcoming across all agents.

### Tabs + Sessions
Organize agents into tabs. Each tab can have multiple terminal panes in a resizable grid. Sessions persist across page reloads (SQLite-backed). Auto-restart on crash.

### Task Queue
Create tasks, assign them to sessions, track status — separate from the agent-driven Kanban.

---

## Getting Started

```bash
git clone https://github.com/Logesh-waran2003/hub
cd hub
npm install
npm run dev
```

Open `http://localhost:3000`.

**Keyboard shortcuts:**
- `N` — new session
- `K` — toggle Kanban board
- `T` — toggle light/dark theme

---

## Kanban Board (PROGRESS.json)

Tell your agents to write progress to a JSON file and Hub will display it live.

Set the path via env:
```bash
PROGRESS_FILES=/path/to/project/PROGRESS.json npm run dev
```

Multiple files (comma-separated):
```bash
PROGRESS_FILES=/project-a/PROGRESS.json,/project-b/PROGRESS.json npm run dev
```

Required shape:
```json
{
  "phase": "Phase 2 — Backend",
  "current_task": "Implementing auth middleware",
  "status": "active",
  "updated_at": "2026-03-07T12:00:00Z",
  "columns": {
    "done": [{ "id": "1", "title": "Database schema" }],
    "in_progress": [{ "id": "2", "title": "Auth middleware", "subtasks": [
      { "id": "2a", "title": "JWT validation", "status": "done" },
      { "id": "2b", "title": "Session store", "status": "in_progress" }
    ]}],
    "todo": [{ "id": "3", "title": "API endpoints" }]
  }
}
```

---

## Stack

- **Frontend**: Next.js 16, xterm.js, socket.io-client, Zustand, Tailwind v4, Framer Motion
- **Backend**: Express + socket.io, node-pty, better-sqlite3
- **Runtime**: Node.js 20+

---

## License

MIT
