"use client";

import { useState, useRef, useEffect } from "react";
import { useWorkspace } from "@/stores/workspace-store";
import { getSocket } from "@/hooks/useSocket";
import { Plus, X } from "lucide-react";

export function TabBar() {
  const tabs = useWorkspace((s) => s.tabs);
  const activeTabId = useWorkspace((s) => s.activeTabId);
  const setActiveTab = useWorkspace((s) => s.setActiveTab);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  function submitTab(name: string) {
    setCreating(false);
    if (!name.trim()) return;
    getSocket().emit("tab:create", { name: name.trim() }, ({ tab }: any) => {
      if (tab) setActiveTab(tab.id);
    });
  }

  function closeTab(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    getSocket().emit("tab:destroy", { tabId: id });
  }

  return (
    <div
      className="flex items-center h-9 overflow-x-auto shrink-0"
      style={{
        background: "var(--hub-bg-raised)",
        borderBottom: "1px solid var(--hub-border)",
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="group relative flex items-center gap-2 h-full px-4 text-[11px] font-medium shrink-0 hub-transition"
            style={{
              color: isActive ? "var(--hub-accent)" : "var(--hub-text-muted)",
              background: isActive ? "var(--hub-bg)" : "transparent",
              borderRight: "1px solid var(--hub-border)",
            }}
            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--hub-accent-glow)"; }}
            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
          >
            {/* Active indicator line */}
            {isActive && (
              <span
                className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
                style={{ background: "var(--hub-accent)" }}
              />
            )}
            <span style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>{tab.name}</span>
            <span
              onClick={(e) => closeTab(tab.id, e)}
              className="opacity-0 group-hover:opacity-100 hub-transition rounded p-0.5"
              style={{ color: "var(--hub-text-faint)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--hub-text-faint)"; e.currentTarget.style.background = "transparent"; }}
            >
              <X size={11} />
            </span>
          </button>
        );
      })}

      {creating ? (
        <input
          ref={inputRef}
          className="h-full w-32 px-3 text-[11px] outline-none"
          style={{
            background: "var(--hub-bg)",
            color: "var(--hub-text)",
            borderRight: "1px solid var(--hub-border)",
            fontFamily: "'IBM Plex Mono', monospace",
          }}
          placeholder="tab name…"
          onKeyDown={(e) => {
            if (e.key === "Enter") submitTab(e.currentTarget.value);
            if (e.key === "Escape") setCreating(false);
          }}
          onBlur={(e) => submitTab(e.currentTarget.value)}
        />
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="h-full px-3 hub-transition flex items-center"
          style={{ color: "var(--hub-text-faint)" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--hub-accent)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--hub-text-faint)"; }}
          title="New tab"
        >
          <Plus size={13} />
        </button>
      )}
    </div>
  );
}
