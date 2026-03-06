"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { getSocket } from "@/hooks/useSocket";
import { CheckCircle2, Clock, Circle, AlertTriangle } from "lucide-react";

interface Subtask { id: string; title: string; status: string }
interface Card { id: string; title: string; commit?: string; files?: number; subtasks?: Subtask[] }
interface ProgressData {
  phase: string; current_task: string; status: string; updated_at: string;
  columns: { done: Card[]; in_progress: Card[]; todo: Card[] };
}
interface ProgressEntry { path: string; data: ProgressData }

const COL_META = {
  done:        { label: "COMPLETED", icon: CheckCircle2, accent: "#22c55e" },
  in_progress: { label: "IN PROGRESS", icon: Clock, accent: "var(--hub-accent)" },
  todo:        { label: "UPCOMING", icon: Circle, accent: "var(--hub-text-faint)" },
} as const;

function StatusDot({ status }: { status: string }) {
  const color = status === "done" ? "#22c55e" : status === "in_progress" ? "var(--hub-accent)" : status === "blocked" ? "#ef4444" : "var(--hub-text-faint)";
  return (
    <span className="relative flex h-1.5 w-1.5 shrink-0">
      {status === "in_progress" && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-40" style={{ background: color }} />}
      <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: color }} />
    </span>
  );
}

function CardItem({ card, col, index }: { card: Card; col: string; index: number }) {
  const meta = COL_META[col as keyof typeof COL_META];
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.2 }}
      className="p-3 rounded hub-transition"
      style={{
        background: "var(--hub-bg-surface)",
        border: "1px solid var(--hub-border)",
        boxShadow: col === "in_progress" ? `0 0 0 1px var(--hub-border), 0 0 16px var(--hub-accent-glow)` : "none",
      }}
    >
      <div className="text-[11px] font-medium" style={{ color: "var(--hub-text)" }}>{card.title}</div>
      {(card.commit || card.files) && (
        <div className="flex items-center gap-2 mt-1.5 text-[10px]" style={{ color: "var(--hub-text-faint)" }}>
          {card.commit && <span className="px-1.5 py-0.5 rounded" style={{ background: "var(--hub-border)" }}>#{card.commit}</span>}
          {card.files && <span>{card.files} files</span>}
        </div>
      )}
      {card.subtasks?.length ? (
        <div className="mt-2 space-y-1 pt-2" style={{ borderTop: "1px solid var(--hub-border)" }}>
          {card.subtasks.map((st) => (
            <div key={st.id} className="flex items-center gap-2 text-[10px]">
              <StatusDot status={st.status} />
              <span style={{
                color: st.status === "done" ? "var(--hub-text-faint)" : st.status === "blocked" ? "#ef4444" : "var(--hub-text-muted)",
                textDecoration: st.status === "done" ? "line-through" : "none",
              }}>
                {st.title}
              </span>
              {st.status === "blocked" && <AlertTriangle size={10} color="#ef4444" />}
            </div>
          ))}
        </div>
      ) : null}
    </motion.div>
  );
}

export function KanbanBoard() {
  const [entries, setEntries] = useState<ProgressEntry[]>([]);

  useEffect(() => {
    const s = getSocket();
    const onState = (data: ProgressEntry[]) => setEntries(data);
    const onUpdate = (entry: ProgressEntry) => {
      setEntries((prev) => {
        const idx = prev.findIndex((e) => e.path === entry.path);
        return idx >= 0 ? prev.map((e, i) => (i === idx ? entry : e)) : [...prev, entry];
      });
    };
    s.on("progress:state", onState);
    s.on("progress:update", onUpdate);
    s.emit("progress:request");
    return () => { s.off("progress:state", onState); s.off("progress:update", onUpdate); };
  }, []);

  if (!entries.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs" style={{ color: "var(--hub-text-faint)" }}>
        No progress data
      </div>
    );
  }

  const p = entries[0].data;
  const total = p.columns.done.length + p.columns.in_progress.length + p.columns.todo.length;
  const pct = total ? Math.round((p.columns.done.length / total) * 100) : 0;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-auto" style={{ background: "var(--hub-bg)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--hub-border)" }}
      >
        <div>
          <div className="text-xs font-semibold" style={{ color: "var(--hub-accent)", fontFamily: "'IBM Plex Sans', sans-serif" }}>
            {p.phase}
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: "var(--hub-text-muted)" }}>{p.current_task}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-32 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--hub-border)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: "#22c55e" }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
          <span className="text-[11px] font-semibold tabular-nums" style={{ color: "var(--hub-text-muted)" }}>{pct}%</span>
        </div>
      </div>

      {/* Columns */}
      <div className="flex-1 min-h-0 flex gap-4 p-4 overflow-x-auto">
        {(["done", "in_progress", "todo"] as const).map((col) => {
          const meta = COL_META[col];
          const Icon = meta.icon;
          const cards = p.columns[col];
          return (
            <div key={col} className="flex-1 min-w-[220px] flex flex-col">
              <div className="flex items-center gap-2 px-1 pb-3 shrink-0">
                <Icon size={13} color={meta.accent} />
                <span className="text-[10px] font-semibold tracking-[0.1em] uppercase" style={{ color: meta.accent }}>
                  {meta.label}
                </span>
                <span
                  className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ background: "var(--hub-border)", color: "var(--hub-text-faint)" }}
                >
                  {cards.length}
                </span>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                {cards.map((card, i) => <CardItem key={card.id} card={card} col={col} index={i} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
