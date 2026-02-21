"use client";

import { useEffect, useState } from "react";
import { getSocket } from "@/hooks/useSocket";

interface Subtask { id: string; title: string; status: string }
interface Card { id: string; title: string; commit?: string; files?: number; subtasks?: Subtask[] }
interface ProgressData {
  phase: string; current_task: string; status: string; updated_at: string;
  columns: { done: Card[]; in_progress: Card[]; todo: Card[] };
}
interface ProgressEntry { path: string; data: ProgressData }

const COL_CONFIG = {
  done:        { label: "DONE",        color: "text-green-500", border: "border-green-500/20", dot: "bg-green-500" },
  in_progress: { label: "IN PROGRESS", color: "text-amber-500", border: "border-amber-500/20", dot: "bg-amber-500 animate-pulse" },
  todo:        { label: "TODO",        color: "text-(--hub-text-muted)", border: "border-(--hub-border)", dot: "bg-(--hub-text-faint)" },
} as const;

function CardItem({ card, col }: { card: Card; col: keyof typeof COL_CONFIG }) {
  return (
    <div className={`p-2 bg-(--hub-bg-surface) border ${COL_CONFIG[col].border} rounded text-[11px] font-mono`}>
      <div className="text-(--hub-text)">{card.title}</div>
      <div className="flex items-center gap-2 mt-1 text-[10px] text-(--hub-text-faint)">
        {card.commit && <span>#{card.commit}</span>}
        {card.files && <span>{card.files} files</span>}
      </div>
      {card.subtasks?.length ? (
        <div className="mt-1.5 space-y-0.5">
          {card.subtasks.map((st) => (
            <div key={st.id} className="flex items-center gap-1.5 text-[10px]">
              <span className={`w-1 h-1 rounded-full ${st.status === "done" ? "bg-green-500" : st.status === "in_progress" ? "bg-amber-500" : st.status === "blocked" ? "bg-red-500" : "bg-(--hub-text-faint)"}`} />
              <span className={st.status === "done" ? "text-(--hub-text-faint) line-through" : st.status === "blocked" ? "text-red-400/70" : "text-(--hub-text-muted)"}>{st.title}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
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
    return <div className="flex items-center justify-center h-full text-(--hub-text-faint) text-xs font-mono">No progress data</div>;
  }

  const p = entries[0].data;
  const total = p.columns.done.length + p.columns.in_progress.length + p.columns.todo.length;
  const pct = total ? Math.round((p.columns.done.length / total) * 100) : 0;

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-(--hub-bg) overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-(--hub-border) shrink-0">
        <div>
          <div className="text-[11px] font-mono text-(--hub-accent)">{p.phase}</div>
          <div className="text-[10px] text-(--hub-text-muted) mt-0.5">{p.current_task}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-24 h-1.5 bg-(--hub-border) rounded-full overflow-hidden">
            <div className="h-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[10px] font-mono text-(--hub-text-muted)">{pct}%</span>
        </div>
      </div>
      {/* Columns */}
      <div className="flex-1 min-h-0 flex gap-2 p-2 overflow-x-auto">
        {(["done", "in_progress", "todo"] as const).map((col) => {
          const cfg = COL_CONFIG[col];
          const cards = p.columns[col];
          return (
            <div key={col} className="flex-1 min-w-[200px] flex flex-col">
              <div className="flex items-center gap-1.5 px-1 pb-1.5 shrink-0">
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                <span className={`text-[10px] font-mono tracking-wider ${cfg.color}`}>{cfg.label}</span>
                <span className="text-[10px] text-(--hub-text-faint) ml-auto">{cards.length}</span>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
                {cards.map((card) => <CardItem key={card.id} card={card} col={col} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
