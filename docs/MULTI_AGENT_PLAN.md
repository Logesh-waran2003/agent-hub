# Multi-Agent Coordination System

## Overview

Turn the AI Agents Hub into a multi-agent orchestration workspace where each terminal session is a scoped, role-aware agent that shares context with other agents on the same project.

---

## Architecture

```
User clicks "New Session"
    ↓
Pick project folder (browse / recent)
    ↓
Hub reads {folder}/.agents/roles.json → show roles
    ↓
Pick role (or add new)
    ↓
Spawn terminal: cd {folder} → kiro-cli → auto-send initial prompt
    ↓
Agent is live, scoped to project, aware of other agents
```

## Per-Project Agent Config

Each project contains its own `.agents/` directory:

```
~/Coding/some-project/
├── .agents/
│   ├── roles.json       # Available roles + custom instructions
│   ├── status.md        # Live: who's doing what
│   ├── memory.md        # Shared decisions & knowledge
│   └── handoff.md       # Cross-agent messages
├── src/
└── ...
```

### roles.json

```json
{
  "roles": [
    {
      "id": "frontend",
      "label": "Frontend",
      "icon": "🎨",
      "instructions": "Focus on React components, Tailwind CSS, UI/UX."
    },
    {
      "id": "backend",
      "label": "Backend",
      "icon": "⚙️",
      "instructions": "Focus on Express server, Socket.IO, API routes."
    },
    {
      "id": "testing",
      "label": "Testing",
      "icon": "🧪",
      "instructions": "Write and run tests. Verify all changes."
    }
  ]
}
```

Users can add/edit roles from the Hub UI. Changes write back to the project's `roles.json`.

### status.md

Auto-updated by agents. Watched by Hub for live display.

```markdown
# Agent Status

| Agent | Role | Status | Current Task | Updated |
|-------|------|--------|--------------|---------|
| pane-1 | frontend | active | Building auth form | 2026-02-23 03:00 |
| pane-2 | backend | idle | — | 2026-02-23 02:55 |
```

### memory.md

Accumulated project knowledge. Agents append here.

```markdown
# Project Memory

## Decisions
- 2026-02-23: Using JWT for auth, refresh tokens in httpOnly cookies
- 2026-02-23: Zustand for state management, no Redux

## Patterns
- All API routes follow /api/v1/{resource} convention
- Error responses use { error: string, code: number } shape
```

### handoff.md

Direct messages between agents.

```markdown
# Handoff

## frontend → backend (2026-02-23 03:10)
Need a POST /api/v1/auth/login endpoint. Expected payload: { email, password }. Return { token, user }.

## backend → frontend (2026-02-23 03:20)
Done. Endpoint live. Also added POST /api/v1/auth/refresh.
```

---

## Initial Prompt (Auto-Sent on Session Start)

```
You are the **{role}** agent on project **{project_name}**.

Your focus: {custom_instructions}

COORDINATION RULES:
1. Before starting any task → read .agents/status.md
2. Update .agents/status.md with your current task
3. Log important decisions to .agents/memory.md
4. Check .agents/handoff.md for messages from other agents
5. When done with a task → update status to "idle"
6. Never modify files another active agent is working on

Acknowledge and wait for my task.
```

---

## Hub UI Changes

### New Session Flow
1. "New Session" button opens a modal
2. Step 1: Folder picker (browse filesystem / select from recent projects)
3. Step 2: Read `{folder}/.agents/roles.json`, display role cards
   - If `.agents/` doesn't exist → offer to initialize it
   - "Add Role" option to create new roles with custom instructions
4. Step 3: Confirm → spawn PTY session, cd to folder, launch kiro-cli, auto-send prompt

### Agent Status Panel
- Watch `.agents/status.md` for each active project (reuse progress-watcher pattern)
- Show live agent status in sidebar or Kanban-style view
- Color-code: 🟢 active, ⚪ idle, 🔴 error

### Tab Labels
- Tabs show `{project}:{role}` instead of generic "tab1"
- e.g., `hub:frontend`, `ecommerce:backend`

---

## Server Changes

### New Endpoints
- `GET /api/projects/recent` — list recently used project paths
- `GET /api/projects/roles?path=...` — read roles.json from a project
- `POST /api/projects/roles?path=...` — add/update a role
- `POST /api/projects/init?path=...` — create .agents/ with default roles.json

### Agent Status Watcher
- Extend progress-watcher to also watch `.agents/status.md`
- Emit `agents:status` events via Socket.IO
- Hub UI subscribes and renders live

---

## Skills (Future Enhancements)

### Skill: Auto-Memory Sync
Agents periodically dump key context to `.agents/memory.md` without being asked. Triggered by file saves or task completion.

### Skill: Conflict Detection
Watch git status across agent panes. If two agents touch the same file, alert both via `.agents/handoff.md` and Hub notification.

### Skill: Task Decomposition
User describes a large task → orchestrator agent breaks it into subtasks → assigns to available agents by role → tracks completion in status.md.

### Skill: Code Review Handoff
When an agent finishes a feature, auto-create a handoff entry asking the testing agent to review. Include changed files and a summary.

### Skill: Session Resume
On agent restart, auto-load last state from `.agents/status.md` and `.agents/memory.md`. Agent picks up where it left off without re-explanation.

### Skill: MCP Memory Bridge
Sync `.agents/memory.md` ↔ MCP `server-memory` knowledge graph. Agents that use MCP tools get the same context as agents reading markdown files.

### Skill: Progress Dashboard
Parse `.agents/status.md` + git log + test results → generate a live project health dashboard in the Hub UI. Show velocity, blockers, agent utilization.

### Skill: Natural Language Routing
User types a task in the Hub → NL classifier determines which role should handle it → auto-routes to the right agent pane → sends the task.

### Skill: Agent-to-Agent Chat
Real-time communication channel between agents via Socket.IO. Instead of writing to handoff.md and waiting, agents can request info from each other synchronously.

### Skill: Template Roles
Pre-built role templates for common stacks:
- **Next.js Full-Stack**: frontend, api-routes, database, testing
- **Microservices**: service-a, service-b, gateway, devops
- **Mobile**: react-native, backend, design-system

---

## Implementation Order

### Phase 1: Foundation
- [ ] `.agents/` directory structure + roles.json schema
- [ ] New Session modal: folder picker → role picker
- [ ] Auto-send initial prompt on session start
- [ ] Tab labels show project:role

### Phase 2: Coordination
- [ ] Agent status watcher (extend progress-watcher)
- [ ] Live agent status panel in Hub UI
- [ ] Agents read/write status.md and memory.md

### Phase 3: Skills
- [ ] Conflict detection
- [ ] Task decomposition
- [ ] Session resume
- [ ] Code review handoff

### Phase 4: Advanced
- [ ] MCP memory bridge
- [ ] Agent-to-agent chat
- [ ] Natural language routing
- [ ] Template roles
