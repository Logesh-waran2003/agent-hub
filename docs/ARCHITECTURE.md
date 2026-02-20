# Technical Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│                                                              │
│  Next.js App (React + TypeScript)                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ WorkspaceLayout                                        │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐              │ │
│  │  │ Tab: Proj │ │ Tab: Proj │ │ Tab: Misc│              │ │
│  │  │    A      │ │    B      │ │          │              │ │
│  │  └──────────┘ └──────────┘ └──────────┘              │ │
│  │  ┌─────────────────────────────────────┐              │ │
│  │  │ PanelGroup (react-resizable-panels) │              │ │
│  │  │  ┌─────────────┐ ┌───────────────┐ │              │ │
│  │  │  │ Terminal     │ │ Terminal      │ │              │ │
│  │  │  │ (xterm.js)  │ │ (xterm.js)    │ │              │ │
│  │  │  │ @kiro-main  │ │ @dev-server   │ │              │ │
│  │  │  └─────────────┘ └───────────────┘ │              │ │
│  │  └─────────────────────────────────────┘              │ │
│  │  ┌─────────────────────────────────────┐              │ │
│  │  │ BottomPanel: TaskManager | Memory   │              │ │
│  │  └─────────────────────────────────────┘              │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │ Socket.IO (WebSocket)
┌──────────────────────────┴──────────────────────────────────┐
│                    Node.js Server                            │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ SessionMgr   │  │ ContextBridge│  │ MemoryStore  │      │
│  │              │  │              │  │              │      │
│  │ • PTY pool   │  │ • @mention   │  │ • SQLite     │      │
│  │ • lifecycle  │  │   parsing    │  │ • sqlite-vec │      │
│  │ • output buf │  │ • context    │  │ • embeddings │      │
│  │ • resize     │  │   injection  │  │ • search     │      │
│  └──────┬───────┘  └──────────────┘  └──────────────┘      │
│         │          ┌──────────────┐                          │
│         │          │ TaskManager  │                          │
│         │          │ • CRUD       │                          │
│         │          │ • assignment │                          │
│         │          │ • deps       │                          │
│         │          └──────────────┘                          │
│         │                                                    │
│    ┌────┴────┐ ┌────────┐ ┌────────┐ ┌────────┐           │
│    │ PTY #1  │ │ PTY #2 │ │ PTY #3 │ │ PTY #N │           │
│    │kiro-cli │ │npm dev │ │ bash   │ │ ...    │           │
│    └─────────┘ └────────┘ └────────┘ └────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## Server Architecture

### Custom Server (Why not Next.js API routes)

node-pty requires long-lived processes. Next.js API routes are request/response oriented. We use a custom Express server that:
1. Serves the Next.js app (via `next()` handler)
2. Manages Socket.IO connections for terminal I/O
3. Holds PTY process pool in memory
4. Runs SQLite for persistence

```
server/
├── index.ts              ← Express + Socket.IO + Next.js integration
├── session-manager.ts    ← PTY lifecycle, output ring buffers
├── context-bridge.ts     ← @mention parsing + context injection
├── memory-store.ts       ← SQLite + sqlite-vec operations
├── task-manager.ts       ← Task CRUD + assignment
├── embedding.ts          ← Groq API embedding calls
└── types.ts              ← Shared server types
```

### Session Manager

Each terminal session is a `Session` object:

```typescript
interface Session {
  id: string;                    // UUID
  name: string;                  // @mention handle, unique
  command: string;               // "kiro-cli chat --resume" or "npm run dev"
  cwd: string;                   // working directory
  type: "kiro" | "shell";       // kiro = has @mention + /commands; shell = passthrough
  tabId: string;                 // which tab group
  pty: IPty;                     // node-pty process
  outputBuffer: RingBuffer;      // last 1000 lines of output
  status: "running" | "stopped" | "crashed";
  createdAt: number;
}
```

**Output Ring Buffer**: Each PTY's output is captured into a fixed-size ring buffer (1000 lines). This is what `@mention` reads from. No disk I/O, pure memory.

**PTY Lifecycle**:
- Server starts with zero PTY processes. Sessions are created only by user action
- `create(name, command, cwd, tabId)` → spawn PTY, register in map
- `destroy(id)` → kill PTY, remove from map
- `restart(id)` → kill + respawn with same config
- `resize(id, cols, rows)` → PTY resize signal

### Context Bridge

Intercepts input going to kiro-type sessions:

```
User types: "@frontend-dev what errors are showing?"
                    │
                    ▼
         ┌─────────────────┐
         │  Parse @mentions │ ← regex: /@([\w-]+)/g
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │ Resolve sessions │ ← lookup by name in SessionManager
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │ Capture context  │ ← read last N lines from each session's ring buffer
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │ Build message    │ ← "[Context from @frontend-dev:\n...\n]\nwhat errors..."
         └────────┬────────┘
                  │
                  ▼
              Send to PTY
```

**Only active for `type: "kiro"` sessions.** Shell sessions get raw passthrough.

### Memory Store

SQLite with sqlite-vec for vector similarity search.

**Embedding pipeline:**
1. Text content → Groq API (`nomic-embed-text` or similar) → float32 vector
2. Store in `vec_memory` virtual table alongside metadata in `memory` table

**Two storage paths:**
- **Auto-capture**: Server periodically reads kiro session output buffers, summarizes significant blocks, embeds and stores
- **Manual**: `/remember` and `/recall` commands intercepted before PTY

### Task Manager

Simple CRUD with SQLite persistence. Tasks reference sessions by name.

**Assignment flow:**
1. User creates task in UI, assigns to `@kiro-main`
2. Server sends task description as input to that session's PTY
3. Task status updated to "active"
4. Completion detected manually (user marks done) or by output pattern

## Frontend Architecture

```
src/
├── app/
│   ├── layout.tsx                ← Root layout, providers
│   └── page.tsx                  ← Main workspace (single page app)
├── components/
│   ├── workspace/
│   │   ├── WorkspaceLayout.tsx   ← Tab bar + panel container
│   │   ├── TabBar.tsx            ← Tab management (add, rename, close, reorder)
│   │   └── PanelContainer.tsx    ← react-resizable-panels wrapper
│   ├── terminal/
│   │   ├── TerminalPane.tsx      ← xterm.js instance + header bar
│   │   ├── TerminalHeader.tsx    ← Session name, status dot, controls
│   │   └── MentionAutocomplete.tsx ← @mention dropdown
│   ├── tasks/
│   │   ├── TaskPanel.tsx         ← Task list + create form
│   │   └── TaskCard.tsx          ← Individual task display
│   ├── memory/
│   │   └── MemoryViewer.tsx      ← Search + results display
│   └── ui/                       ← Shared UI primitives
├── hooks/
│   ├── useSocket.ts              ← Socket.IO connection management
│   ├── useTerminal.ts            ← xterm.js lifecycle hook
│   └── useWorkspace.ts           ← Workspace state (tabs, sessions, layout)
├── lib/
│   ├── types.ts                  ← Shared TypeScript interfaces
│   └── constants.ts              ← Config values
└── stores/
    └── workspace-store.ts        ← Zustand store for workspace state
```

### State Management

**Zustand** for client-side state (lightweight, no boilerplate):

```typescript
interface WorkspaceState {
  tabs: Tab[];
  activeTabId: string;
  sessions: Map<string, SessionInfo>;
  tasks: Task[];
  // actions
  addTab: (tab: Tab) => void;
  addSession: (session: SessionInfo) => void;
  updateSessionStatus: (id: string, status: string) => void;
  // ...
}
```

**Socket.IO** for real-time sync with server:
- Terminal data streams
- Session status changes
- Task updates

### Terminal Component Lifecycle

```
1. Component mounts
2. Create xterm.js Terminal instance
3. Load addons: FitAddon, WebglAddon
4. Open terminal in container div
5. Emit socket "session:attach" with session ID
6. Socket receives PTY output → terminal.write()
7. terminal.onData() → socket emit "session:input"
8. ResizeObserver → fitAddon.fit() → socket emit "session:resize"
9. Component unmounts → dispose terminal (PTY stays alive server-side)
```

## Data Flow

### Terminal I/O

```
Browser                          Server
  │                                │
  │ socket "session:input"         │
  │ { sessionId, data }     ──►   │ pty.write(data)
  │                                │
  │ socket "session:output"        │
  │ { sessionId, data }     ◄──   │ pty.onData → buffer + emit
  │                                │
  │ socket "session:resize"        │
  │ { sessionId, cols, rows } ──► │ pty.resize(cols, rows)
```

### @Mention Flow

```
Browser                          Server
  │                                │
  │ socket "session:input"         │
  │ { sessionId, data }     ──►   │
  │                                │ if data contains @mention AND session.type === "kiro":
  │                                │   1. parse @names
  │                                │   2. capture context from referenced sessions
  │                                │   3. build augmented message
  │                                │   4. pty.write(augmented)
  │                                │ else:
  │                                │   pty.write(data) // passthrough
```

## Deployment

### systemd Service

```ini
[Unit]
Description=AI Agents Hub
After=network.target

[Service]
WorkingDirectory=/home/logesh/Coding/aiAgents/hub
ExecStart=/usr/bin/node server/dist/index.js
Restart=always
RestartSec=5
Environment="NODE_ENV=production"
Environment="PORT=3000"

[Install]
WantedBy=default.target
```

### Build Pipeline

```bash
# Development
npm run dev          # Next.js dev + custom server with ts-node

# Production
npm run build        # Next.js build + tsc server
npm run start        # Run production server
```

## Performance Considerations

- **WebGL rendering** — xterm.js WebglAddon for 60fps terminal rendering
- **Ring buffer** — Fixed memory per session (1000 lines × ~200 bytes = ~200KB each)
- **Debounced resize** — FitAddon.fit() debounced to avoid excessive PTY resize calls
- **Socket.IO binary** — Terminal data sent as binary frames, not JSON
- **SQLite WAL mode** — Write-ahead logging for concurrent read/write
