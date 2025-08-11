export function summarizeRules(markdown, maxItems = 200) {
    const lines = markdown.split(/\r?\n/);
    const out = [];
    let i = 1;
    for (const l of lines) {
        const m = l.match(/^\s*\[ASSERT\]\s*(.+)$/i);
        if (m) {
            out.push({ id: `R${i++}`, text: m[1].trim() });
            if (out.length >= maxItems)
                break;
        }
    }
    return out;
}
