"use client";

import { useRef } from "react";
import { useTerminal } from "@/hooks/useTerminal";
import { useWorkspace } from "@/stores/workspace-store";
import { getSocket } from "@/hooks/useSocket";
import { RotateCw, X, Circle } from "lucide-react";

export function TerminalPane({ sessionId }: { sessionId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useTerminal(sessionId, containerRef);
  const session = useWorkspace((s) => s.sessions.find((se) => se.id === sessionId));

  if (!session) return null;

  const statusColor = session.status === "running" ? "#22c55e" : session.status === "crashed" ? "#ef4444" : "#71717a";

  return (
    <div
      className="flex flex-col h-full rounded overflow-hidden"
      style={{
        background: "var(--hub-bg-surface)",
        border: "1px solid var(--hub-border)",
        boxShadow: "var(--hub-shadow)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between h-8 px-3 shrink-0"
        style={{
          background: "var(--hub-bg-raised)",
          borderBottom: "1px solid var(--hub-border)",
          boxShadow: "var(--hub-inset-shadow)",
        }}
      >
        <div className="flex items-center gap-2">
          <Circle size={7} fill={statusColor} color={statusColor} />
          <span className="text-[11px] font-medium" style={{ color: "var(--hub-accent)" }}>
            @{session.name}
          </span>
          <span className="text-[10px]" style={{ color: "var(--hub-text-faint)" }}>
            {session.command}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => { getSocket().emit("session:restart", { sessionId }); }}
            className="p-1 rounded hub-transition"
            style={{ color: "var(--hub-text-faint)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--hub-text)"; e.currentTarget.style.background = "var(--hub-border)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--hub-text-faint)"; e.currentTarget.style.background = "transparent"; }}
            title="Restart"
          >
            <RotateCw size={11} />
          </button>
          <button
            onClick={() => { getSocket().emit("session:destroy", { sessionId }); }}
            className="p-1 rounded hub-transition"
            style={{ color: "var(--hub-text-faint)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--hub-text-faint)"; e.currentTarget.style.background = "transparent"; }}
            title="Close"
          >
            <X size={11} />
          </button>
        </div>
      </div>
      {/* Terminal */}
      <div ref={containerRef} className="flex-1 min-h-0" />
    </div>
  );
}
