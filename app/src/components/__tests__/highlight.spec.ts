import { expect, it } from 'vitest'
import { highlight } from '../highlight'

it('highlights keywords, macros, strings, numbers, types and comments', () => {
  const classes = (line: string) => highlight(line).flatMap((t) => (t.c ? [`${t.c}:${t.text}`] : []))
  expect(classes('let mut score: u32 = 10_000; // max')).toEqual(['kw:let', 'kw:mut', 'num:10_000', 'com:// max'])
  expect(classes('println!("fn {x}");')).toEqual(['mac:println!', 'str:"fn {x}"'])
  expect(classes('let s = String::from("a\\"b");')).toEqual(['kw:let', 'ty:String', 'str:"a\\"b"'])
  // Round-trips the text exactly.
  const line = '    let x = 5; /* five */ x'
  expect(highlight(line).map((t) => t.text).join('')).toBe(line)
})
