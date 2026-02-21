export interface SessionConfig {
  id: string;
  name: string;
  command: string;
  cwd: string;
  type: "kiro" | "shell";
  tabId: string;
  autoRestart: boolean;
}

export interface SessionInfo extends SessionConfig {
  status: "running" | "stopped" | "crashed";
  createdAt: number;
}

export interface TabInfo {
  id: string;
  name: string;
  position: number;
  createdAt: number;
}

export interface TaskInfo {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "active" | "done" | "cancelled";
  priority: number;
  assignedSession?: string;
  dependsOn?: string[];
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface WorkspaceState {
  tabs: TabInfo[];
  sessions: SessionInfo[];
  tasks: TaskInfo[];
}
