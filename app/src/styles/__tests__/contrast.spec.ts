import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'

// WCAG AA (plans/01 §4.5): text colours on the backgrounds they're used on, in both themes.
const css = readFileSync('src/styles/tokens.css', 'utf8') // vitest runs in app/
const tokens = new Map<string, [string, string]>()
for (const [, name, value] of css.matchAll(/--(c-[\w-]+):\s*([^;]+);/g)) {
  const m = value!.match(/light-dark\((#\w{6}),\s*(#\w{6})\)/)
  tokens.set(name!, m ? [m[1]!, m[2]!] : [value!.trim(), value!.trim()])
}

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}
const ratio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

const TEXT_PAIRS = [
  ['c-text', 'c-canvas'], ['c-text', 'c-surface'], ['c-text', 'c-tile'], ['c-text', 'c-selected-tint'],
  ['c-text-2', 'c-canvas'], ['c-text-2', 'c-surface'],
  ['c-primary-text', 'c-canvas'], ['c-primary-text', 'c-surface'], ['c-primary-text', 'c-selected-tint'],
  ['c-on-primary', 'c-primary'], ['c-on-primary', 'c-correct-button'], ['c-on-primary', 'c-wrong-button'],
  ['c-correct-text', 'c-correct-tint'], ['c-wrong-text', 'c-wrong-tint'], ['c-wrong-text', 'c-canvas'],
  ['c-streak-text', 'c-canvas'], ['c-gems-text', 'c-canvas'],
  ['c-terminal-text', 'c-terminal'], ['c-wrong', 'c-terminal'],
  ...['kw', 'str', 'num', 'com', 'mac', 'ty'].map((s) => [`c-syn-${s}`, 'c-surface']),
]

it.each(TEXT_PAIRS)('%s on %s is at least 4.5:1 in both themes', (fg, bg) => {
  for (const theme of [0, 1]) expect(ratio(tokens.get(fg!)![theme]!, tokens.get(bg!)![theme]!)).toBeGreaterThanOrEqual(4.5)
})
