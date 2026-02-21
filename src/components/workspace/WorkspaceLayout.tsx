"use client";

import { useState, useEffect } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useWorkspace } from "@/stores/workspace-store";
import { TabBar } from "@/components/workspace/TabBar";
import { PanelContainer } from "@/components/workspace/PanelContainer";
import { NewSessionDialog } from "@/components/workspace/NewSessionDialog";
import { KanbanBoard } from "@/components/workspace/KanbanBoard";

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

  // Restore theme on mount
  useEffect(() => {
    const saved = localStorage.getItem("hub-theme");
    if (saved === "light") {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.target as HTMLElement).closest(".xterm")) return;

      if (e.key === "n" || e.key === "N") { e.preventDefault(); setShowNewSession(true); }
      if (e.key === "k" || e.key === "K") { e.preventDefault(); setShowKanban((v) => !v); }
      if (e.key === "t" || e.key === "T") { e.preventDefault(); toggleTheme(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-(--hub-bg) text-(--hub-text) overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between h-8 px-3 bg-(--hub-bg-raised) border-b border-(--hub-border) shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-(--hub-text-muted) tracking-wide">▪ AI AGENTS HUB</span>
        </div>
        <div className="flex items-center gap-2">
          {sessions.map((s) => (
            <span key={s.id} className="flex items-center gap-1 text-[10px] text-(--hub-text-muted) font-mono">
              <span className={`w-1.5 h-1.5 rounded-full ${s.status === "running" ? "bg-green-500" : s.status === "crashed" ? "bg-red-500" : "bg-zinc-600"}`} />
              @{s.name}
            </span>
          ))}
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} title={connected ? "Connected" : "Disconnected"} />
        </div>
      </div>

      <TabBar />
      {showKanban ? <KanbanBoard /> : <PanelContainer />}

      {/* Bottom bar */}
      <div className="flex items-center h-6 px-3 bg-(--hub-bg-raised) border-t border-(--hub-border) shrink-0">
        <button onClick={() => setShowNewSession(true)} className="text-[10px] text-(--hub-text-muted) hover:text-(--hub-accent) font-mono">
          [N] New Session
        </button>
        <button onClick={() => setShowKanban((v) => !v)} className={`text-[10px] font-mono ml-3 ${showKanban ? "text-(--hub-accent)" : "text-(--hub-text-muted) hover:text-(--hub-accent)"}`}>
          [K] Kanban
        </button>
        <button onClick={toggleTheme} className="text-[10px] font-mono ml-3 text-(--hub-text-muted) hover:text-(--hub-accent)">
          [T] Theme
        </button>
        <span className="ml-auto text-[10px] text-(--hub-text-faint) font-mono">
          {sessions.length} session{sessions.length !== 1 ? "s" : ""}
        </span>
      </div>

      {showNewSession && <NewSessionDialog onClose={() => setShowNewSession(false)} />}
    </div>
  );
}
