"use client";

import { useState, useRef, useEffect } from "react";
import { useWorkspace } from "@/stores/workspace-store";
import { getSocket } from "@/hooks/useSocket";

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
    <div className="flex items-center h-7 bg-(--hub-bg-raised) border-b border-(--hub-border) overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`group flex items-center gap-1.5 h-full px-3 text-[11px] border-r border-(--hub-border) shrink-0 transition-colors ${
            tab.id === activeTabId
              ? "bg-(--hub-bg) text-(--hub-text) border-t-2 border-t-amber-500"
              : "text-(--hub-text-muted) hover:text-(--hub-text) hover:bg-(--hub-bg) border-t-2 border-t-transparent"
          }`}
        >
          {tab.name}
          <span
            onClick={(e) => closeTab(tab.id, e)}
            className="text-(--hub-text-faint) hover:text-red-400 opacity-0 group-hover:opacity-100 ml-1"
          >×</span>
        </button>
      ))}
      {creating ? (
        <input
          ref={inputRef}
          className="h-full w-28 px-2 bg-(--hub-bg) border-r border-(--hub-border) text-[11px] text-(--hub-text) font-mono outline-none"
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
          className="h-full px-2.5 text-(--hub-text-faint) hover:text-(--hub-text) text-[11px]"
          title="New tab"
        >+</button>
      )}
    </div>
  );
}
