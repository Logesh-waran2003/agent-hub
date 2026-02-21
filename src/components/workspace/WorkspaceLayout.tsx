"use client";

import { useState, useEffect } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useWorkspace } from "@/stores/workspace-store";
import { TabBar } from "@/components/workspace/TabBar";
import { PanelContainer } from "@/components/workspace/PanelContainer";
import { NewSessionDialog } from "@/components/workspace/NewSessionDialog";
import { KanbanBoard } from "@/components/workspace/KanbanBoard";

export function WorkspaceLayout() {
  useSocket();
  const connected = useWorkspace((s) => s.connected);
  const sessions = useWorkspace((s) => s.sessions);
  const [showNewSession, setShowNewSession] = useState(false);
  const [showKanban, setShowKanban] = useState(false);

  // Keyboard shortcut: N for new session
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Don't trigger if typing in an input or terminal
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.target as HTMLElement).closest(".xterm")) return;

      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setShowNewSession(true);
      }
      if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        setShowKanban((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0b] text-zinc-200 overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between h-8 px-3 bg-[#111113] border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-zinc-400 tracking-wide">▪ AI AGENTS HUB</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Session pills */}
          {sessions.map((s) => (
            <span key={s.id} className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono">
              <span className={`w-1.5 h-1.5 rounded-full ${s.status === "running" ? "bg-green-500" : s.status === "crashed" ? "bg-red-500" : "bg-zinc-600"}`} />
              @{s.name}
            </span>
          ))}
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} title={connected ? "Connected" : "Disconnected"} />
        </div>
      </div>

      {/* Tab bar */}
      <TabBar />

      {/* Main panel area */}
      {showKanban ? <KanbanBoard /> : <PanelContainer />}

      {/* Bottom bar */}
      <div className="flex items-center h-6 px-3 bg-[#111113] border-t border-zinc-800 shrink-0">
        <button
          onClick={() => setShowNewSession(true)}
          className="text-[10px] text-zinc-500 hover:text-amber-400 font-mono"
        >
          [N] New Session
        </button>
        <button
          onClick={() => setShowKanban((v) => !v)}
          className={`text-[10px] font-mono ml-3 ${showKanban ? "text-amber-400" : "text-zinc-500 hover:text-amber-400"}`}
        >
          [K] Kanban
        </button>
        <span className="ml-auto text-[10px] text-zinc-600 font-mono">
          {sessions.length} session{sessions.length !== 1 ? "s" : ""}
        </span>
      </div>

      {showNewSession && <NewSessionDialog onClose={() => setShowNewSession(false)} />}
    </div>
  );
}
