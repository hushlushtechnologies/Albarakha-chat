// The AI ends each reply with tappable options, written as:
//   [[options: Minimum investment? | How do returns work? | {consult}]]
// Plain labels are sent back to the AI when tapped. {action} labels run a
// built-in flow instead (see ACTIONS). The marker is hidden from the visitor.

export const ACTIONS = ["consult", "explore", "whatsapp", "menu"] as const;
export type ReplyAction = (typeof ACTIONS)[number];
export type ReplyOption = { kind: "text"; label: string } | { kind: "action"; action: ReplyAction };

const MARKER = /\[\[\s*options\s*:([\s\S]*?)\]\]/i;

export function parseReply(text: string): { body: string; options: ReplyOption[] } {
  const match = text.match(MARKER);
  // While streaming, hide a marker that has started but isn't finished yet.
  const cut = match ? match.index! : text.lastIndexOf("[[");
  const body = (cut >= 0 ? text.slice(0, cut) : text).trim();
  if (!match) return { body, options: [] };

  const seen = new Set<string>();
  const options: ReplyOption[] = [];
  for (const raw of match[1].split("|")) {
    const label = raw.trim().replace(/^["'“”]+|["'“”]+$/g, "").slice(0, 60);
    if (!label || seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());
    const action = label.match(/^\{\s*(\w+)\s*\}$/)?.[1]?.toLowerCase();
    if (action) {
      if ((ACTIONS as readonly string[]).includes(action)) options.push({ kind: "action", action: action as ReplyAction });
    } else {
      options.push({ kind: "text", label });
    }
    if (options.length === 4) break;
  }
  return { body, options };
}

export const stripOptions = (text: string) => parseReply(text).body;
