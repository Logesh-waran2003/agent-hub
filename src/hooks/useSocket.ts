"use client";

import { useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { useWorkspace } from "@/stores/workspace-store";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({ transports: ["websocket"] });
  }
  return socket;
}

export function useSocket() {
  useEffect(() => {
    const s = getSocket();
    const gs = () => useWorkspace.getState();

    s.on("connect", () => gs().setConnected(true));
    s.on("disconnect", () => gs().setConnected(false));
    s.on("workspace:state", ({ tabs, sessions, tasks }) => gs().setWorkspace(tabs, sessions, tasks));
    s.on("session:created", ({ session }) => gs().addSession(session));
    s.on("session:destroyed", ({ sessionId }) => gs().removeSession(sessionId));
    s.on("session:status", ({ sessionId, status }) => gs().updateSessionStatus(sessionId, status));
    s.on("session:renamed", ({ sessionId, name }) => gs().renameSession(sessionId, name));
    s.on("tab:created", ({ tab }) => gs().addTab(tab));
    s.on("tab:destroyed", ({ tabId }) => gs().removeTab(tabId));
    s.on("tab:renamed", ({ tabId, name }) => gs().renameTab(tabId, name));
    s.on("task:created", ({ task }) => gs().addTask(task));
    s.on("task:updated", ({ task }) => gs().updateTask(task));
    s.on("task:deleted", ({ taskId }) => gs().removeTask(taskId));

    return () => {
      s.off("connect");
      s.off("disconnect");
      s.off("workspace:state");
      s.off("session:created");
      s.off("session:destroyed");
      s.off("session:status");
      s.off("session:renamed");
      s.off("tab:created");
      s.off("tab:destroyed");
      s.off("tab:renamed");
      s.off("task:created");
      s.off("task:updated");
      s.off("task:deleted");
    };
  }, []);
}
