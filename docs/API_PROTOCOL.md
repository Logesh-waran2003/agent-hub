# API & WebSocket Protocol

## Transport

All communication between browser and server uses **Socket.IO** over WebSocket. No REST API for v1 — everything is event-driven for real-time terminal I/O.

Socket.IO namespace: `/` (default)

## Connection Lifecycle

```
Browser connects → server sends "workspace:state" with full workspace snapshot
Browser disconnects → PTY processes keep running (server-side)
Browser reconnects → server sends "workspace:state" again, terminals resume
```

## Events: Client → Server

### Session Management

#### `session:create`
Create a new terminal session.

```typescript
// Payload
{
  name: string;          // @mention handle
  command: string;       // shell command to run
  cwd: string;           // working directory
  type: "kiro" | "shell";
  tabId: string;         // tab to place session in
}

// Response event: "session:created"
{
  session: SessionInfo;  // full session object
}
```

#### `session:destroy`
Kill a terminal session.

```typescript
// Payload
{ sessionId: string }

// Response event: "session:destroyed"
{ sessionId: string }
```

#### `session:restart`
Restart a crashed or stopped session.

```typescript
// Payload
{ sessionId: string }

// Response event: "session:restarted"
{ session: SessionInfo }
```

#### `session:rename`
Rename a session's @mention handle.

```typescript
// Payload
{ sessionId: string; name: string }

// Response event: "session:renamed"
{ sessionId: string; name: string }
```

#### `session:resize`
Resize terminal dimensions.

```typescript
// Payload
{ sessionId: string; cols: number; rows: number }

// No response event (fire-and-forget)
```

### Terminal I/O

#### `session:input`
Send keyboard input to a terminal.

```typescript
// Payload
{ sessionId: string; data: string }

// No response event
// Server-side: if session.type === "kiro", check for @mentions and /commands
// Then write to PTY
```

#### `session:attach`
Start receiving output from a session. Called when a terminal pane mounts.

```typescript
// Payload
{ sessionId: string }

// Response: server starts emitting "session:output" for this session
// Also sends "session:buffer" with existing output buffer
```

#### `session:detach`
Stop receiving output from a session. Called when terminal pane unmounts.

```typescript
// Payload
{ sessionId: string }
```

### Tab Management

#### `tab:create`
```typescript
// Payload
{ name: string }

// Response event: "tab:created"
{ tab: TabInfo }
```

#### `tab:destroy`
```typescript
// Payload
{ tabId: string }

// Response event: "tab:destroyed"
{ tabId: string }
// Also destroys all sessions in the tab
```

#### `tab:rename`
```typescript
// Payload
{ tabId: string; name: string }

// Response event: "tab:renamed"
{ tabId: string; name: string }
```

#### `tab:reorder`
```typescript
// Payload
{ tabIds: string[] }  // ordered array of all tab IDs

// Response event: "tab:reordered"
{ tabIds: string[] }
```

### Layout

#### `layout:save`
Save panel layout for a tab.

```typescript
// Payload
{
  tabId: string;
  layout: PanelLayout;  // serialized react-resizable-panels state
}

// No response event (persisted silently)
```

### Task Management

#### `task:create`
```typescript
// Payload
{
  title: string;
  description?: string;
  priority?: number;           // 0=normal, 1=high, 2=urgent
  assignedSession?: string;    // session name
  dependsOn?: string[];        // task IDs
}

// Response event: "task:created"
{ task: TaskInfo }
```

#### `task:update`
```typescript
// Payload
{
  taskId: string;
  title?: string;
  description?: string;
  status?: "pending" | "active" | "done" | "cancelled";
  assignedSession?: string;
  priority?: number;
}

// Response event: "task:updated"
{ task: TaskInfo }
```

#### `task:delete`
```typescript
// Payload
{ taskId: string }

// Response event: "task:deleted"
{ taskId: string }
```

#### `task:send`
Send a task's description to its assigned session as input.

```typescript
// Payload
{ taskId: string }

// Response event: "task:updated" (status → "active")
```

### Memory

#### `memory:search`
Semantic search across shared memory.

```typescript
// Payload
{ query: string; limit?: number }

// Response event: "memory:results"
{
  results: Array<{
    id: number;
    content: string;
    summary?: string;
    sessionName?: string;
    tags?: string[];
    distance: number;
    createdAt: number;
  }>
}
```

#### `memory:save`
Manually save content to shared memory.

```typescript
// Payload
{
  content: string;
  tags?: string[];
  sessionName?: string;
}

// Response event: "memory:saved"
{ id: number }
```

#### `memory:delete`
```typescript
// Payload
{ memoryId: number }

// Response event: "memory:deleted"
{ memoryId: number }
```

## Events: Server → Client

### Workspace State

#### `workspace:state`
Full workspace snapshot, sent on connect/reconnect.

```typescript
{
  tabs: TabInfo[];
  sessions: SessionInfo[];
  tasks: TaskInfo[];
  settings: Record<string, string>;
}
```

### Terminal Output

#### `session:output`
Terminal output data from PTY. Sent as binary when possible.

```typescript
{ sessionId: string; data: string }
```

#### `session:buffer`
Existing output buffer for a session (sent on attach).

```typescript
{ sessionId: string; data: string }
```

### Session Status

#### `session:status`
Session status change (running, stopped, crashed).

```typescript
{ sessionId: string; status: "running" | "stopped" | "crashed" }
```

### Mentions

#### `session:mentions`
Available sessions for @mention autocomplete.

```typescript
{
  sessions: Array<{
    name: string;
    type: string;
    status: string;
  }>
}
```

## Intercepted Commands

These are typed in kiro-type terminals but intercepted by the server before reaching the PTY.

### `/remember <text>`
Save text to shared memory. Does NOT forward to PTY.

### `/recall <query>`
Search shared memory, inject top results as context, then forward the query to PTY.

Format injected:
```
[Shared Memory Results:
1. (from @kiro-api, 2h ago): <content>
2. (from @kiro-main, 1d ago): <content>
]
<original query>
```

### `@session-name`
Captured and replaced with context from that session's output buffer. Forwarded to PTY with injected context.

## Type Definitions

```typescript
interface SessionInfo {
  id: string;
  name: string;
  command: string;
  cwd: string;
  type: "kiro" | "shell";
  tabId: string;
  status: "running" | "stopped" | "crashed";
  autoRestart: boolean;
  createdAt: number;
}

interface TabInfo {
  id: string;
  name: string;
  position: number;
  createdAt: number;
}

interface TaskInfo {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "active" | "done" | "cancelled";
  priority: number;
  assignedSession?: string;
  dependsOn?: string[];
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

interface PanelLayout {
  // Serialized react-resizable-panels state
  // Stored as JSON string in DB
  [key: string]: number[];  // panel sizes by group ID
}
```

## Error Handling

All events can return errors via a callback (Socket.IO acknowledgement):

```typescript
// Client
socket.emit("session:create", payload, (response) => {
  if (response.error) {
    console.error(response.error);
  }
});

// Server
socket.on("session:create", (payload, callback) => {
  try {
    const session = sessionManager.create(payload);
    callback({ session });
  } catch (err) {
    callback({ error: err.message });
  }
});
```
