export function normalizeUnifiedDiff(diff: string, strip = 0) {
  const norm = diff.replace(/\r\n/g, "\n");
  return { diff: norm, strip };
}
