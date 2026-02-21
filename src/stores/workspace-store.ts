import { create } from "zustand";
import type { SessionInfo, TabInfo, TaskInfo } from "@/lib/types";

interface WorkspaceState {
  tabs: TabInfo[];
  activeTabId: string | null;
  sessions: SessionInfo[];
  tasks: TaskInfo[];
  connected: boolean;

  setConnected: (v: boolean) => void;
  setWorkspace: (tabs: TabInfo[], sessions: SessionInfo[], tasks: TaskInfo[]) => void;
  setActiveTab: (id: string) => void;

  addTab: (tab: TabInfo) => void;
  removeTab: (id: string) => void;
  renameTab: (id: string, name: string) => void;
  reorderTabs: (ids: string[]) => void;

  addSession: (session: SessionInfo) => void;
  removeSession: (id: string) => void;
  updateSessionStatus: (id: string, status: SessionInfo["status"]) => void;
  renameSession: (id: string, name: string) => void;

  addTask: (task: TaskInfo) => void;
  updateTask: (task: TaskInfo) => void;
  removeTask: (id: string) => void;
}

export const useWorkspace = create<WorkspaceState>((set) => ({
  tabs: [],
  activeTabId: null,
  sessions: [],
  tasks: [],
  connected: false,

  setConnected: (connected) => set({ connected }),

  setWorkspace: (tabs, sessions, tasks) =>
    set({ tabs, sessions, tasks, activeTabId: tabs[0]?.id ?? null }),

  setActiveTab: (activeTabId) => set({ activeTabId }),

  addTab: (tab) =>
    set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id })),

  removeTab: (id) =>
    set((s) => {
      const tabs = s.tabs.filter((t) => t.id !== id);
      const sessions = s.sessions.filter((se) => se.tabId !== id);
      return { tabs, sessions, activeTabId: s.activeTabId === id ? (tabs[0]?.id ?? null) : s.activeTabId };
    }),

  renameTab: (id, name) =>
    set((s) => ({ tabs: s.tabs.map((t) => (t.id === id ? { ...t, name } : t)) })),

  reorderTabs: (ids) =>
    set((s) => ({ tabs: ids.map((id, i) => ({ ...s.tabs.find((t) => t.id === id)!, position: i })) })),

  addSession: (session) =>
    set((s) => ({ sessions: [...s.sessions, session] })),

  removeSession: (id) =>
    set((s) => ({ sessions: s.sessions.filter((se) => se.id !== id) })),

  updateSessionStatus: (id, status) =>
    set((s) => ({ sessions: s.sessions.map((se) => (se.id === id ? { ...se, status } : se)) })),

  renameSession: (id, name) =>
    set((s) => ({ sessions: s.sessions.map((se) => (se.id === id ? { ...se, name } : se)) })),

  addTask: (task) =>
    set((s) => ({ tasks: [...s.tasks, task] })),

  updateTask: (task) =>
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === task.id ? task : t)) })),

  removeTask: (id) =>
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
}));
