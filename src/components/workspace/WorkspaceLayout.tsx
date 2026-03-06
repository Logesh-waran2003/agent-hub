"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useSocket } from "@/hooks/useSocket";
import { useWorkspace } from "@/stores/workspace-store";
import { TabBar } from "@/components/workspace/TabBar";
import { PanelContainer } from "@/components/workspace/PanelContainer";
import { NewSessionDialog } from "@/components/workspace/NewSessionDialog";
import { KanbanBoard } from "@/components/workspace/KanbanBoard";
import { Terminal, LayoutGrid, Plus, Sun, Moon } from "lucide-react";

function toggleTheme() {
  const html = document.documentElement;
  const next = html.classList.contains("light") ? "dark" : "light";
  html.classList.remove("light", "dark");
  html.classList.add(next);
  localStorage.setItem("hub-theme", next);
}

export function WorkspaceLayout() {
  useSocket();
  const connected = useWorkspace((s) => s.connected);
  const sessions = useWorkspace((s) => s.sessions);
  const [showNewSession, setShowNewSession] = useState(false);
  const [showKanban, setShowKanban] = useState(false);
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("hub-theme");
    if (saved === "light") {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      setIsLight(true);
    }
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.target as HTMLElement).closest(".xterm")) return;

      if (e.key === "n" || e.key === "N") { e.preventDefault(); setShowNewSession(true); }
      if (e.key === "k" || e.key === "K") { e.preventDefault(); setShowKanban((v) => !v); }
      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        toggleTheme();
        setIsLight((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden relative hub-noise" style={{ background: "var(--hub-bg)" }}>
      {/* === TOP BAR === */}
      <div
        className="flex items-center justify-between h-10 px-4 shrink-0 relative z-10"
        style={{
          background: "var(--hub-bg-raised)",
          borderBottom: "1px solid var(--hub-border)",
          boxShadow: "var(--hub-inset-shadow)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded flex items-center justify-center"
              style={{ background: "var(--hub-accent-dim)", color: "var(--hub-accent)" }}
            >
              <Terminal size={13} strokeWidth={2.5} />
            </div>
            <span
              className="text-[11px] font-semibold tracking-[0.15em] uppercase"
              style={{ color: "var(--hub-text-muted)", fontFamily: "'IBM Plex Sans', sans-serif" }}
            >
              Agents Hub
            </span>
          </div>

          {/* Connection indicator */}
          <div className="flex items-center gap-1.5 ml-2">
            <span
              className="relative flex h-2 w-2"
            >
              {connected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-40" style={{ background: "#22c55e" }} />
              )}
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: connected ? "#22c55e" : "#ef4444" }} />
            </span>
            <span className="text-[10px]" style={{ color: "var(--hub-text-faint)" }}>
              {connected ? "live" : "offline"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Session indicators */}
          {sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px]"
              style={{
                background: "var(--hub-accent-dim)",
                color: "var(--hub-accent)",
              }}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${s.status === "running" ? "bg-green-500" : s.status === "crashed" ? "bg-red-500" : "bg-zinc-500"}`} />
              @{s.name}
            </div>
          ))}

          {/* Theme toggle */}
          <button
            onClick={() => { toggleTheme(); setIsLight((v) => !v); }}
            className="w-7 h-7 rounded flex items-center justify-center hub-transition"
            style={{ color: "var(--hub-text-muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--hub-accent)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--hub-text-muted)")}
            title="Toggle theme (T)"
          >
            {isLight ? <Moon size={14} /> : <Sun size={14} />}
          </button>
        </div>
      </div>

      {/* === TAB BAR === */}
      <TabBar />

      {/* === MAIN CONTENT === */}
      <AnimatePresence mode="wait">
        {showKanban ? (
          <motion.div
            key="kanban"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="flex-1 min-h-0 flex flex-col overflow-hidden"
          >
            <KanbanBoard />
          </motion.div>
        ) : (
          <motion.div
            key="panels"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="flex-1 min-h-0 flex flex-col"
          >
            <PanelContainer />
          </motion.div>
        )}
      </AnimatePresence>

      {/* === BOTTOM BAR === */}
      <div
        className="flex items-center h-8 px-4 shrink-0 relative z-10"
        style={{
          background: "var(--hub-bg-raised)",
          borderTop: "1px solid var(--hub-border)",
          boxShadow: "var(--hub-inset-shadow)",
        }}
      >
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowNewSession(true)}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] hub-transition"
            style={{ color: "var(--hub-text-muted)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--hub-accent)"; e.currentTarget.style.background = "var(--hub-accent-dim)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--hub-text-muted)"; e.currentTarget.style.background = "transparent"; }}
          >
            <Plus size={11} />
            <span>New Session</span>
            <kbd className="ml-1 text-[9px] px-1 py-px rounded" style={{ background: "var(--hub-border)", color: "var(--hub-text-faint)" }}>N</kbd>
          </button>

          <button
            onClick={() => setShowKanban((v) => !v)}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] hub-transition"
            style={{
              color: showKanban ? "var(--hub-accent)" : "var(--hub-text-muted)",
              background: showKanban ? "var(--hub-accent-dim)" : "transparent",
            }}
            onMouseEnter={(e) => { if (!showKanban) { e.currentTarget.style.color = "var(--hub-accent)"; e.currentTarget.style.background = "var(--hub-accent-dim)"; } }}
            onMouseLeave={(e) => { if (!showKanban) { e.currentTarget.style.color = "var(--hub-text-muted)"; e.currentTarget.style.background = "transparent"; } }}
          >
            <LayoutGrid size={11} />
            <span>Board</span>
            <kbd className="ml-1 text-[9px] px-1 py-px rounded" style={{ background: "var(--hub-border)", color: "var(--hub-text-faint)" }}>K</kbd>
          </button>
        </div>

        <div className="ml-auto flex items-center gap-3 text-[10px]" style={{ color: "var(--hub-text-faint)" }}>
          <span>{sessions.length} session{sessions.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* === NEW SESSION DIALOG === */}
      <AnimatePresence>
        {showNewSession && <NewSessionDialog onClose={() => setShowNewSession(false)} />}
      </AnimatePresence>
    </div>
  );
}
