"use client";

import { useRef } from "react";
import { useTerminal } from "@/hooks/useTerminal";
import { useWorkspace } from "@/stores/workspace-store";
import { getSocket } from "@/hooks/useSocket";

const STATUS_COLORS: Record<string, string> = {
  running: "bg-green-500",
  stopped: "bg-zinc-500",
  crashed: "bg-red-500",
};

export function TerminalPane({ sessionId }: { sessionId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useTerminal(sessionId, containerRef);
  const session = useWorkspace((s) => s.sessions.find((se) => se.id === sessionId));

  if (!session) return null;

  return (
    <div className="flex flex-col h-full bg-[#09090b] border border-zinc-800 rounded-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between h-6 px-2 bg-[#111113] border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[session.status]}`} />
          <span className="text-[11px] font-mono text-amber-500">@{session.name}</span>
          <span className="text-[10px] text-zinc-600 truncate max-w-32">{session.command}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { getSocket().emit("session:restart", { sessionId }); }}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 px-1"
            title="Restart"
          >↻</button>
          <button
            onClick={() => { getSocket().emit("session:destroy", { sessionId }); }}
            className="text-[10px] text-zinc-500 hover:text-red-400 px-1"
            title="Close"
          >×</button>
        </div>
      </div>
      {/* Terminal */}
      <div ref={containerRef} className="flex-1 min-h-0" />
    </div>
  );
}
