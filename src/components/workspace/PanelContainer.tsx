"use client";

import { useWorkspace } from "@/stores/workspace-store";
import { useShallow } from "zustand/react/shallow";
import { Group, Panel, Separator } from "react-resizable-panels";
import { TerminalPane } from "@/components/terminal/TerminalPane";

export function PanelContainer() {
  const activeTabId = useWorkspace((s) => s.activeTabId);
  const sessions = useWorkspace(useShallow((s) => s.sessions.filter((se) => se.tabId === activeTabId)));

  if (!activeTabId) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm" style={{ color: "var(--hub-text-faint)" }}>
        Create a tab to get started
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs" style={{ color: "var(--hub-text-faint)" }}>
        No sessions in this tab. Press <kbd className="mx-1 px-1.5 py-0.5 rounded text-[10px]" style={{ background: "var(--hub-bg-raised)", border: "1px solid var(--hub-border)" }}>N</kbd> to create one.
      </div>
    );
  }

  // Simple grid: 1 session = full, 2 = side by side, 3-4 = 2x2 grid
  if (sessions.length === 1) {
    return (
      <div className="flex-1 min-h-0 p-1">
        <TerminalPane sessionId={sessions[0].id} />
      </div>
    );
  }

  if (sessions.length === 2) {
    return (
      <Group orientation="vertical" className="flex-1">
        <Panel minSize={15}>
          <div className="h-full p-1 pb-0.5"><TerminalPane sessionId={sessions[0].id} /></div>
        </Panel>
        <Separator className="h-1 bg-transparent hover:bg-amber-600/30 transition-colors" />
        <Panel minSize={15}>
          <div className="h-full p-1 pt-0.5"><TerminalPane sessionId={sessions[1].id} /></div>
        </Panel>
      </Group>
    );
  }

  // 3+ sessions: 2-column grid with vertical splits
  const left = sessions.filter((_, i) => i % 2 === 0);
  const right = sessions.filter((_, i) => i % 2 === 1);

  return (
    <Group orientation="horizontal" className="flex-1">
      <Panel minSize={15}>
        <Group orientation="vertical">
          {left.flatMap((s, i) => {
            const els = [];
            if (i > 0) els.push(<Separator key={`sep-${s.id}`} className="h-1 bg-transparent hover:bg-amber-600/30 transition-colors" />);
            els.push(<Panel key={s.id} minSize={10}><div className="h-full p-1"><TerminalPane sessionId={s.id} /></div></Panel>);
            return els;
          })}
        </Group>
      </Panel>
      <Separator className="w-1 bg-transparent hover:bg-amber-600/30 transition-colors" />
      <Panel minSize={15}>
        <Group orientation="vertical">
          {right.flatMap((s, i) => {
            const els = [];
            if (i > 0) els.push(<Separator key={`sep-${s.id}`} className="h-1 bg-transparent hover:bg-amber-600/30 transition-colors" />);
            els.push(<Panel key={s.id} minSize={10}><div className="h-full p-1"><TerminalPane sessionId={s.id} /></div></Panel>);
            return els;
          })}
        </Group>
      </Panel>
    </Group>
  );
}
