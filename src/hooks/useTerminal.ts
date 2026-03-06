"use client";

import { useEffect, useRef, useCallback } from "react";
import { getSocket } from "@/hooks/useSocket";

export function useTerminal(sessionId: string, containerRef: React.RefObject<HTMLDivElement | null>) {
  const termRef = useRef<any>(null);
  const fitRef = useRef<any>(null);
  const attachedRef = useRef(false);

  const initTerminal = useCallback(async () => {
    if (!containerRef.current || termRef.current) return;

    const { Terminal } = await import("@xterm/xterm");
    const { FitAddon } = await import("@xterm/addon-fit");
    await import("@xterm/xterm/css/xterm.css");

    const isLight = document.documentElement.classList.contains("light");
    const term = new Terminal({
      fontSize: 13,
      fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
      theme: isLight ? {
        background: "#f7f4ee",
        foreground: "#1c1917",
        cursor: "#b45309",
        selectionBackground: "rgba(180, 83, 9, 0.15)",
        black: "#1c1917",
        red: "#dc2626",
        green: "#16a34a",
        yellow: "#b45309",
        blue: "#2563eb",
        magenta: "#9333ea",
        cyan: "#0891b2",
        white: "#f7f4ee",
      } : {
        background: "#0a0a0c",
        foreground: "#d4d4d8",
        cursor: "#e8a230",
        selectionBackground: "rgba(232, 162, 48, 0.18)",
        black: "#0a0a0c",
        red: "#ef4444",
        green: "#22c55e",
        yellow: "#e8a230",
        blue: "#60a5fa",
        magenta: "#c084fc",
        cyan: "#22d3ee",
        white: "#d4d4d8",
      },
      cursorBlink: true,
      cursorStyle: "block",
      allowProposedApi: true,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();

    // Try WebGL
    try {
      const { WebglAddon } = await import("@xterm/addon-webgl");
      const webgl = new WebglAddon();
      webgl.onContextLoss(() => webgl.dispose());
      term.loadAddon(webgl);
    } catch {}

    termRef.current = term;
    fitRef.current = fit;

    const socket = getSocket();

    // Attach to session
    socket.emit("session:attach", { sessionId });

    // Output from server
    const onOutput = ({ sessionId: sid, data }: { sessionId: string; data: string }) => {
      if (sid === sessionId) term.write(data);
    };
    const onBuffer = ({ sessionId: sid, data }: { sessionId: string; data: string }) => {
      if (sid === sessionId) {
        term.write(data);
        setTimeout(() => { try { fit.fit(); } catch {} }, 10);
      }
    };
    socket.on("session:output", onOutput);
    socket.on("session:buffer", onBuffer);

    // Input to server
    term.onData((data) => {
      socket.emit("session:input", { sessionId, data });
    });

    // Resize
    term.onResize(({ cols, rows }) => {
      socket.emit("session:resize", { sessionId, cols, rows });
    });

    // ResizeObserver for fit (debounced to prevent resize loop)
    let resizeTimer: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { try { fit.fit(); } catch {} }, 50);
    });
    ro.observe(containerRef.current);
    attachedRef.current = true;

    return () => {
      ro.disconnect();
      socket.off("session:output", onOutput);
      socket.off("session:buffer", onBuffer);
      socket.emit("session:detach", { sessionId });
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
      attachedRef.current = false;
    };
  }, [sessionId, containerRef]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    initTerminal().then((c) => { cleanup = c; });
    return () => { cleanup?.(); };
  }, [initTerminal]);

  return { termRef, fitRef };
}
