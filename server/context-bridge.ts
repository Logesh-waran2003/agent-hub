import type { SessionManager } from "./session-manager.js";

const MENTION_RE = /@([\w-]+)/g;

export function processInput(sessionId: string, data: string, mgr: SessionManager): string {
  const session = mgr.getSessionInfo(sessionId);
  if (!session || session.type !== "kiro") return data;

  // Only intercept on Enter (full line submitted)
  if (!data.endsWith("\r") && !data.endsWith("\n")) return data;

  const line = data.trimEnd();
  const mentions = [...line.matchAll(MENTION_RE)];
  if (mentions.length === 0) return data;

  let augmented = line;
  const contextBlocks: string[] = [];

  for (const match of mentions) {
    const name = match[1];
    if (name === session.name) continue; // skip self-reference
    const buf = mgr.getBufferByName(name);
    if (!buf) continue;

    const lines = buf.split("\n");
    const last50 = lines.slice(-50).join("\n");
    contextBlocks.push(`[Context from @${name}:\n${last50}\n]`);
    augmented = augmented.replace(`@${name}`, `@${name}`); // keep mention visible
  }

  if (contextBlocks.length === 0) return data;

  return contextBlocks.join("\n") + "\n" + augmented + "\r";
}
