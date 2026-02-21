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

    const term = new Terminal({
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      theme: {
        background: "#09090b",
        foreground: "#e4e4e7",
        cursor: "#f59e0b",
        selectionBackground: "rgba(245, 158, 11, 0.15)",
        black: "#09090b",
        red: "#ef4444",
        green: "#22c55e",
        yellow: "#f59e0b",
        blue: "#3b82f6",
        magenta: "#a855f7",
        cyan: "#06b6d4",
        white: "#e4e4e7",
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
