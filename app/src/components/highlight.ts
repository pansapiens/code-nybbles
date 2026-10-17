/**
 * Minimal Rust highlighter for short code cards (plans/01 §4.4).
 * ponytail: per-line regex lexer; strings and block comments spanning lines aren't tracked.
 * Upgrade path: Lezer's Rust grammar or Shiki at build time if content needs it.
 */
export type TokenClass = 'kw' | 'str' | 'num' | 'com' | 'mac' | 'ty'
export interface Token {
  text: string
  c?: TokenClass
}

const KEYWORDS =
  'as|async|await|break|const|continue|dyn|else|enum|false|fn|for|if|impl|in|let|loop|match|mod|move|mut|pub|ref|return|self|Self|static|struct|trait|true|type|unsafe|use|where|while'
const RE = new RegExp(
  [
    String.raw`(?<com>//.*$|/\*.*?\*/)`,
    String.raw`(?<str>b?"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])')`,
    String.raw`(?<mac>\b[a-z_][a-z0-9_]*!)`,
    String.raw`(?<kw>\b(?:${KEYWORDS})\b)`,
    String.raw`(?<num>\b\d[\d_]*(?:\.\d[\d_]*)?(?:[iu](?:8|16|32|64|128|size)|f32|f64)?\b)`,
    String.raw`(?<ty>\b[A-Z][A-Za-z0-9_]*\b)`,
  ].join('|'),
  'g',
)

export function highlight(line: string): Token[] {
  const out: Token[] = []
  let last = 0
  for (const m of line.matchAll(RE)) {
    if (m.index > last) out.push({ text: line.slice(last, m.index) })
    const c = Object.entries(m.groups!).find(([, v]) => v !== undefined)![0] as TokenClass
    out.push({ text: m[0], c })
    last = m.index + m[0].length
  }
  if (last < line.length) out.push({ text: line.slice(last) })
  return out
}
