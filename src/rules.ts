export type Rule = { id: string; text: string };
export function summarizeRules(markdown: string, maxItems = 200): Rule[] {
  const lines = markdown.split(/\r?\n/);
  const out: Rule[] = [];
  let i = 1;
  for (const l of lines) {
    const m = l.match(/^\s*\[ASSERT\]\s*(.+)$/i);
    if (m) {
      out.push({ id: `R${i++}`, text: m[1].trim() });
      if (out.length >= maxItems) break;
    }
  }
  return out;
}
