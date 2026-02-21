"use client";

import { useState } from "react";
import { getSocket } from "@/hooks/useSocket";
import { useWorkspace } from "@/stores/workspace-store";

export function NewSessionDialog({ onClose }: { onClose: () => void }) {
  const tabs = useWorkspace((s) => s.tabs);
  const activeTabId = useWorkspace((s) => s.activeTabId);
  const [name, setName] = useState("");
  const [command, setCommand] = useState("bash");
  const [cwd, setCwd] = useState("~");
  const [type, setType] = useState<"kiro" | "shell">("shell");
  const [tabId, setTabId] = useState(activeTabId ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !tabId) return;
    getSocket().emit("session:create", { name: name.trim(), command, cwd: cwd || "~", type, tabId }, () => onClose());
  }

  const presets = [
    { label: "Bash", cmd: "bash", t: "shell" as const },
    { label: "Kiro CLI", cmd: "kiro-cli chat --resume", t: "kiro" as const },
    { label: "Zsh", cmd: "zsh", t: "shell" as const },
  ];

  const inputCls = "mt-0.5 w-full bg-(--hub-bg) border border-(--hub-border) rounded px-2 py-1.5 text-xs text-(--hub-text) font-mono focus:border-amber-600 focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-[420px] bg-(--hub-bg-raised) border border-(--hub-border) rounded-md p-4 space-y-3"
      >
        <h2 className="text-sm font-medium text-(--hub-text)">New Session</h2>

        <div className="flex gap-1.5">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => { setCommand(p.cmd); setType(p.t); if (!name) setName(p.label.toLowerCase().replace(/\s+/g, "-")); }}
              className={`text-[11px] px-2 py-1 rounded border ${command === p.cmd ? "border-amber-600 text-amber-400 bg-amber-950/30" : "border-(--hub-border) text-(--hub-text-muted) hover:border-(--hub-text-faint)"}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <label className="block">
            <span className="text-[11px] text-(--hub-text-muted)">Name (used as @mention handle)</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="my-terminal" className={inputCls} autoFocus />
          </label>
          <label className="block">
            <span className="text-[11px] text-(--hub-text-muted)">Command</span>
            <input value={command} onChange={(e) => setCommand(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className="text-[11px] text-(--hub-text-muted)">Working Directory</span>
            <input value={cwd} onChange={(e) => setCwd(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className="text-[11px] text-(--hub-text-muted)">Tab</span>
            <select value={tabId} onChange={(e) => setTabId(e.target.value)} className={inputCls}>
              {tabs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="text-[11px] px-3 py-1.5 text-(--hub-text-muted) hover:text-(--hub-text)">Cancel</button>
          <button type="submit" disabled={!name.trim() || !tabId} className="text-[11px] px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-black font-medium rounded disabled:opacity-40">Create</button>
        </div>
      </form>
    </div>
  );
}
