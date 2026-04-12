/**
 * 将 CSS `font-family` 列表拆成族名数组（支持简单引号包裹，忽略引号内逗号）。
 */
export function splitCssFontFamilyList(input: string): string[] {
  const s = input.trim();
  if (s.length === 0) return [];
  const out: string[] = [];
  let cur = "";
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (quote) {
      if (c === quote) quote = null;
      else cur += c;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      continue;
    }
    if (c === ",") {
      const t = cur.trim();
      if (t.length > 0) out.push(t);
      cur = "";
      continue;
    }
    cur += c;
  }
  const t = cur.trim();
  if (t.length > 0) out.push(t);
  return out;
}
