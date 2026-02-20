# UI/UX Design Specification

## Design Direction

**Aesthetic: Industrial Command Center** — Dark, dense, utilitarian. Inspired by mission control interfaces, Bloomberg terminals, and recording studio mixers. Every pixel earns its place. No decorative fluff, no rounded-everything softness. Sharp edges, monospace confidence, high information density.

**NOT**: Generic dashboard with cards and gradients. NOT purple-on-white AI slop. NOT Material Design or Bootstrap defaults.

## Color System

```css
:root {
  /* Base — near-black with warm undertone */
  --bg-primary: #0a0a0b;
  --bg-secondary: #111113;
  --bg-tertiary: #18181b;
  --bg-elevated: #1e1e22;

  /* Borders — subtle, structural */
  --border-default: #27272a;
  --border-active: #3f3f46;
  --border-focus: #52525b;

  /* Text — high contrast hierarchy */
  --text-primary: #e4e4e7;
  --text-secondary: #a1a1aa;
  --text-tertiary: #71717a;
  --text-muted: #52525b;

  /* Accent — electric amber (not blue, not purple) */
  --accent-primary: #f59e0b;
  --accent-hover: #fbbf24;
  --accent-muted: #92400e;

  /* Status */
  --status-running: #22c55e;
  --status-stopped: #71717a;
  --status-crashed: #ef4444;
  --status-active: #f59e0b;

  /* Terminal specific */
  --terminal-bg: #09090b;
  --terminal-selection: rgba(245, 158, 11, 0.15);
  --terminal-cursor: #f59e0b;
}
```

## Typography

```css
/* Terminal text — JetBrains Mono (distinctive, excellent readability) */
--font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;

/* UI text — Geist (sharp, technical, modern) */
--font-sans: 'Geist', 'Inter', system-ui, sans-serif;

/* Sizes */
--text-xs: 0.6875rem;    /* 11px — labels, metadata */
--text-sm: 0.75rem;      /* 12px — secondary UI */
--text-base: 0.8125rem;  /* 13px — primary UI */
--text-lg: 0.875rem;     /* 14px — headings */
--text-xl: 1rem;         /* 16px — page title only */
```

## Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ ▪ AI Agents Hub          [@kiro-main] [@api] [@frontend]    ⚙  │ ← Top bar (32px)
├─────────────────────────────────────────────────────────────────┤
│ [Project Alpha ×] [Servers ×] [Scratch ×] [+]                  │ ← Tab bar (28px)
├────────────────────────────────────────────┬────────────────────┤
│                                            │                    │
│  ┌──────────────────────────────────────┐  │  ┌──────────────┐ │
│  │ @kiro-main ● ▾                    ×  │  │  │ @dev-srv ● ▾ │ │
│  ├──────────────────────────────────────┤  │  ├──────────────┤ │
│  │                                      │  │  │              │ │
│  │  27% > Ask me anything!              │  │  │  ready on    │ │
│  │                                      │  │  │  localhost:  │ │
│  │                                      │  │  │  3001        │ │
│  │                                      │  │  │              │ │
│  │                                      │  │  │              │ │
│  └──────────────────────────────────────┘  │  └──────────────┘ │
│  ┌──────────────────────────────────────┐  │  ┌──────────────┐ │
│  │ @kiro-api ● ▾                     ×  │  │  │ @shell ● ▾   │ │
│  ├──────────────────────────────────────┤  │  ├──────────────┤ │
│  │                                      │  │  │              │ │
│  │  $ working on API routes...          │  │  │  ~/project $ │ │
│  │                                      │  │  │              │ │
│  └──────────────────────────────────────┘  │  └──────────────┘ │
├────────────────────────────────────────────┴────────────────────┤
│ ▸ Tasks (3)  │  ▸ Memory  │  ▸ Sessions                        │ ← Bottom panel
│                                                                  │   (collapsible)
│  ☐ Build auth API          @kiro-api    active                  │
│  ☐ Fix CORS issue          @kiro-main   pending                 │
│  ☑ Setup database          @kiro-api    done                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Component Specifications

### Top Bar (32px height)

- Left: App name "▪ AI Agents Hub" in `--font-sans`, `--text-base`, `--text-secondary`
- Center: Quick session pills — clickable badges showing all active sessions with status dots
  - `[@kiro-main ●]` — green dot = running, click to focus that pane
- Right: Settings gear icon

Background: `--bg-secondary`. Bottom border: `--border-default` 1px.

### Tab Bar (28px height)

- Tabs: `--bg-tertiary` inactive, `--bg-elevated` active with `--accent-primary` 2px top border
- Tab text: `--text-secondary` inactive, `--text-primary` active
- Close button: `×` appears on hover, `--text-tertiary`
- `[+]` button at end to create new tab group
- Drag to reorder tabs

### Terminal Pane

**Header bar (24px):**
- Left: `@name` in `--font-mono`, `--text-sm`, `--accent-primary` color
- Status dot: 6px circle, color from `--status-*`
- Dropdown `▾`: session actions (rename, restart, close, change command)
- Right: `×` close button

**Terminal area:**
- Background: `--terminal-bg` (slightly darker than UI bg)
- Font: JetBrains Mono, 13px
- Cursor: `--terminal-cursor` (amber block cursor)
- Selection: `--terminal-selection`
- No padding — terminal fills entire pane
- WebGL renderer for performance

**Resize handles:**
- 4px wide/tall, `--border-default`
- On hover: `--border-active`
- On drag: `--accent-primary`

### @Mention Autocomplete

When user types `@` in a kiro-type terminal:
- Floating dropdown appears above cursor position
- Lists all other sessions: `@name — command — status`
- Filter as user types
- Arrow keys to navigate, Tab/Enter to select
- Background: `--bg-elevated`, border: `--border-active`
- Selected item: `--accent-muted` background

### Bottom Panel

Collapsible panel at bottom (default 200px, min 100px, max 400px).

**Three tabs:** Tasks | Memory | Sessions

**Tasks tab:**
- List view with columns: checkbox, title, assigned session, status
- Inline create: text input at top
- Status badges: `pending` (gray), `active` (amber), `done` (green, strikethrough)
- Click task to expand details

**Memory tab:**
- Search input at top with semantic search
- Results: content snippet, source session, timestamp
- Click to expand full content

**Sessions tab:**
- Grid of all sessions across all tabs
- Quick actions: restart, close, focus
- Shows command, cwd, uptime, output buffer size

### New Session Dialog

Modal overlay (not a separate page):
- Session name input (auto-generates `@` handle)
- Command input (with presets: "kiro-cli chat --resume", "bash", custom)
- Working directory picker (text input with autocomplete)
- Tab group selector (existing tabs or "New tab")
- Type selector: "AI Agent (kiro)" or "Terminal (shell)"

## Interaction Patterns

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+N` | New session |
| `Ctrl+Shift+T` | New tab |
| `Ctrl+1-9` | Switch to tab N |
| `Ctrl+Shift+[` / `]` | Previous/next tab |
| `Ctrl+\` | Toggle bottom panel |
| `Ctrl+Shift+W` | Close current session |
| `Alt+Arrow` | Focus adjacent pane |

### Terminal Focus

- Click pane to focus
- Focused pane: `--border-active` border, header slightly brighter
- Unfocused: `--border-default` border
- All keyboard input goes to focused terminal

### Split Operations

- Right-click terminal header → "Split Right" / "Split Down"
- Drag session from sidebar into pane area to create split
- Double-click resize handle to reset to equal sizes

## Responsive Behavior

Desktop-only for v1. Minimum viewport: 1024×768.

- Below 1024px width: single pane per tab (no splits)
- Panels collapse to icons in sidebar
- Bottom panel becomes full-width overlay

## Animation & Motion

Minimal, functional motion only:

- Tab switch: instant (no slide/fade)
- Panel resize: real-time (no animation, direct manipulation)
- Bottom panel collapse: 150ms ease-out height transition
- New session appear: 100ms opacity fade-in
- Status dot: pulse animation on state change (200ms)
- @mention dropdown: 100ms fade-in

No decorative animations. No loading spinners (use skeleton states). No bouncing or wobbling.

## Dark Theme Only (v1)

Single dark theme. Terminal interfaces are inherently dark. Light theme is a future consideration.
