# AI Agents Hub — Product Requirements Document

## Overview

AI Agents Hub is a web-based multi-terminal workspace for managing multiple AI coding agents (Kiro CLI) and development processes from a single interface. It replaces manual tmux window/pane management with a visual, intelligent orchestration layer.

The core differentiator is the **@mention context bridge**: from any terminal, reference another terminal by name to pull its output as context into the current conversation. This enables cross-session awareness that no existing tool provides.

## Problem Statement

When working with multiple Kiro CLI sessions across different projects:

1. **Context switching is manual** — Alt-tabbing between tmux panes, copy-pasting output from one session to another
2. **No shared memory** — Each Kiro CLI session is isolated; insights from one project don't inform another
3. **No task coordination** — No way to assign, track, or sequence tasks across sessions
4. **Terminal management overhead** — Creating, naming, arranging tmux panes is repetitive
5. **No persistent state** — Closing tmux loses layout, session history, and context

## Target User

Solo developer running 3-6 concurrent Kiro CLI sessions alongside dev servers, build processes, and shell terminals. Needs to coordinate work across projects while maintaining visual access to all terminal output.

## Core Features

### F1: Multi-Terminal Workspace

Tabbed workspace with resizable split panes. Each pane hosts a full terminal emulator (xterm.js) connected to a server-side PTY process.

- **Tabs** — Group related terminals (e.g., "Project A" tab has kiro-cli + dev server + shell)
- **Split panes** — Horizontal and vertical splits within each tab, freely resizable
- **Any command** — Not limited to kiro-cli; run npm, python, shell, anything
- **No auto-start** — App launches with an empty workspace. User creates terminals on demand. No kiro-cli spawned by default
- **Named sessions** — Each terminal has a unique `@name` used for cross-referencing
- **Persistent layout** — Tab/pane arrangement saved and restored on reload
- **Session lifecycle** — Create, rename, close, restart terminals from UI

### F2: @Mention Context Bridge

Type `@session-name` in any kiro-cli terminal to inject context from another terminal.

**How it works:**
1. User types: `@frontend-dev what errors are showing?`
2. Server intercepts the input before it reaches the PTY
3. Server captures last N lines from the `frontend-dev` terminal's output buffer
4. Server constructs: `[Context from @frontend-dev (last 50 lines):\n...\n]\nwhat errors are showing?`
5. This combined message is sent to the kiro-cli PTY

**Capabilities:**
- Reference any terminal by its `@name`
- Multiple references in one message: `@api-server and @frontend-dev are both erroring`
- Autocomplete `@` suggestions (show available session names)
- Configurable context window (how many lines to capture, default 50)
- Works only in kiro-cli type terminals (detected by session type)

### F3: Shared Memory Store

SQLite database with vector search for storing and retrieving context across all sessions.

**Auto-capture:**
- Periodically snapshot kiro-cli session summaries (every N minutes or on significant output)
- Store with session name, timestamp, and embedding vector

**Manual save:**
- From any kiro-cli session, type `/remember <note>` to save to shared memory
- Server intercepts, stores in DB, does NOT forward to PTY

**Search:**
- Memory viewer panel in UI with semantic search
- From kiro-cli: `/recall <query>` to search memory and inject results as context

**Schema:**
- Content + embedding vector (for semantic search via sqlite-vec)
- Session source, timestamp, tags
- Embedding model: Groq API (already configured) or local Ollama

### F4: Task Manager

Central task board for coordinating work across sessions.

- **Create tasks** with title, description, priority
- **Assign to session** — Task gets sent as a message to that kiro-cli terminal
- **Dependencies** — Task B waits for Task A to complete
- **Status tracking** — pending → active → done (manual or auto-detected)
- **UI panel** — Bottom drawer or sidebar showing all tasks with filters
- **Telegram integration** — Create/check tasks from Telegram via nanobot

### F5: Session Health & Monitoring

- Green/yellow/red status indicator per terminal
- Detect crashed processes (PTY exit)
- Auto-restart option for server processes
- CPU/memory indicators (optional, future)

## Non-Functional Requirements

- **Performance** — Terminal rendering at 60fps via WebGL addon; no input lag
- **Reliability** — Server-side PTY processes survive page refresh; reconnect seamlessly
- **Security** — Local-only (localhost); no auth needed for v1
- **Storage** — All data in single SQLite file; easy backup
- **Startup** — Auto-start via systemd service (like nanobot gateway)

## Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Frontend framework | Next.js | 15 | App Router, SSR, TypeScript |
| Terminal emulator | xterm.js | 5.x | @xterm/xterm + addons |
| Terminal rendering | @xterm/addon-webgl | 5.x | GPU-accelerated rendering |
| Terminal sizing | @xterm/addon-fit | 5.x | Auto-fit to container |
| Panel layout | react-resizable-panels | latest | Split panes with drag resize |
| Styling | Tailwind CSS | 4.x | Utility-first CSS |
| Backend runtime | Node.js | 22+ | Server runtime |
| HTTP server | Express | 4.x | API routes + static serving |
| WebSocket | Socket.IO | 4.x | Bidirectional terminal I/O |
| PTY | node-pty | 1.x | Spawn terminal processes |
| Database | better-sqlite3 | 11.x | SQLite with sync API |
| Vector search | sqlite-vec | latest | KNN search on embeddings |
| Embeddings | Groq API | — | Text → vector (already configured) |

## Out of Scope (v1)

- Multi-user / authentication
- Remote server terminals (SSH)
- Git integration
- File browser
- Code editor (use kiro-cli for that)
- Mobile responsive (desktop-first)

## Success Metrics

- Replace tmux for daily workflow within 1 week of launch
- All 3-6 kiro-cli sessions manageable from single browser tab
- @mention context bridge saves >5 copy-paste operations per hour
- Shared memory surfaces relevant context without manual search

## Milestones

| Phase | Scope | Duration |
|-------|-------|----------|
| 1 | Multi-terminal with tabs + splits | 2-3 days |
| 2 | @mention context bridge | 2-3 days |
| 3 | SQLite + vector memory store | 2 days |
| 4 | Task manager | 2 days |
| 5 | Polish, systemd, Telegram integration | 2 days |
