export interface SessionInfo {
  id: string;
  name: string;
  command: string;
  cwd: string;
  type: "kiro" | "shell";
  tabId: string;
  status: "running" | "stopped" | "crashed";
  autoRestart: boolean;
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
