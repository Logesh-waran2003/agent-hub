"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { getSocket } from "@/hooks/useSocket";
import { useWorkspace } from "@/stores/workspace-store";
import { Terminal, Zap, X } from "lucide-react";

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
    { label: "Bash", cmd: "bash", t: "shell" as const, icon: Terminal },
    { label: "Kiro CLI", cmd: "kiro-cli chat --resume", t: "kiro" as const, icon: Zap },
    { label: "Zsh", cmd: "zsh", t: "shell" as const, icon: Terminal },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <motion.form
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-[440px] rounded-lg p-5 space-y-4"
        style={{
          background: "var(--hub-bg-raised)",
          border: "1px solid var(--hub-border-strong)",
          boxShadow: "var(--hub-shadow-lg)",
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: "var(--hub-text)", fontFamily: "'IBM Plex Sans', sans-serif" }}>
            New Session
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hub-transition"
            style={{ color: "var(--hub-text-faint)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--hub-text)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--hub-text-faint)"; }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Presets */}
        <div className="flex gap-2">
          {presets.map((p) => {
            const active = command === p.cmd;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => { setCommand(p.cmd); setType(p.t); if (!name) setName(p.label.toLowerCase().replace(/\s+/g, "-")); }}
                className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded hub-transition"
                style={{
                  background: active ? "var(--hub-accent-dim)" : "transparent",
                  color: active ? "var(--hub-accent)" : "var(--hub-text-muted)",
                  border: `1px solid ${active ? "var(--hub-accent)" : "var(--hub-border)"}`,
                  boxShadow: active ? "0 0 12px var(--hub-accent-glow)" : "none",
                }}
              >
                <p.icon size={12} />
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          {[
            { label: "Name", sublabel: "used as @mention handle", value: name, onChange: setName, placeholder: "my-terminal", autoFocus: true },
            { label: "Command", value: command, onChange: setCommand },
            { label: "Working Directory", value: cwd, onChange: setCwd },
          ].map((field) => (
            <label key={field.label} className="block">
              <span className="text-[11px] font-medium" style={{ color: "var(--hub-text-muted)" }}>
                {field.label}
                {field.sublabel && <span className="font-normal ml-1" style={{ color: "var(--hub-text-faint)" }}>({field.sublabel})</span>}
              </span>
              <input
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                placeholder={field.placeholder}
                autoFocus={field.autoFocus}
                className="mt-1 w-full rounded px-3 py-2 text-xs outline-none hub-transition"
                style={{
                  background: "var(--hub-bg)",
                  color: "var(--hub-text)",
                  border: "1px solid var(--hub-border)",
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--hub-accent)"; e.currentTarget.style.boxShadow = "0 0 0 2px var(--hub-accent-dim)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--hub-border)"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </label>
          ))}

          <label className="block">
            <span className="text-[11px] font-medium" style={{ color: "var(--hub-text-muted)" }}>Tab</span>
            <select
              value={tabId}
              onChange={(e) => setTabId(e.target.value)}
              className="mt-1 w-full rounded px-3 py-2 text-xs outline-none hub-transition"
              style={{
                background: "var(--hub-bg)",
                color: "var(--hub-text)",
                border: "1px solid var(--hub-border)",
              }}
            >
              {tabs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] px-4 py-2 rounded hub-transition"
            style={{ color: "var(--hub-text-muted)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--hub-border)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || !tabId}
            className="text-[11px] px-4 py-2 rounded font-medium hub-transition disabled:opacity-30"
            style={{
              background: "var(--hub-accent)",
              color: "#000",
            }}
          >
            Create Session
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
