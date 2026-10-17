// Run: node --test (set RUST_VERIFY_LINKER if the PATH `cc` can't link Rust, see ../rust-verify/README.md)
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { stringify } from 'yaml'
import { buildContent } from './build.ts'

/** Write a one-level course to a temp dir; `exercises` replace the default valid one. */
function fixture(exercises: unknown[]): string {
  const root = mkdtempSync(join(tmpdir(), 'cn-content-'))
  const unit = join(root, 'sections', 's1', 'u1')
  mkdirSync(unit, { recursive: true })
  const w = (p: string, v: unknown) => writeFileSync(join(root, p), stringify(v))
  w('course.yaml', { id: 'rust', title: 'Rust', mascot: 'ferris', edition: '2024', sections: ['s1'] })
  w('concepts.yaml', [{ id: 'intro.main', title: 'main' }])
  w('sections/s1/section.yaml', { id: 's1', title: 'S1', description: 'd', colour: 'purple', units: ['u1'] })
  w('sections/s1/u1/unit.yaml', { id: 's1.u1', title: 'U1', description: 'd', path: [{ level: 'level' }] })
  w('sections/s1/u1/level.yaml', { id: 's1.u1.level', title: 'L', lessons: [{ id: 'l1', exercises }] })
  return root
}

const predict = (answer: string, rust = 'println!("hi");') => ({
  type: 'predict-output',
  id: 'p',
  code: { rust, verify: 'run' },
  options: [
    { id: 'a', text: 'hi' },
    { id: 'b', text: 'bye' },
  ],
  answer,
  explanation: 'e',
  concepts: ['intro.main'],
})

async function errors(exercises: unknown[]) {
  const r = await buildContent({ contentDir: fixture(exercises) })
  return r.issues.errors.map((i) => i.message).join('\n')
}

test('a valid level builds, and the snippet is wrapped in main', async () => {
  assert.equal(await errors([predict('a')]), '')
})

test('answers are checked against the real program output', async () => {
  assert.match(await errors([predict('b')]), /differs from the real output/)
})

test('expectStdout mismatch fails', async () => {
  const ex = predict('a')
  ex.code = { ...ex.code, expectStdout: 'nope\n' } as typeof ex.code
  assert.match(await errors([ex]), /stdout mismatch/)
})

test('compile-fail must produce the expected error code', async () => {
  const code = { rust: 'let x = 1;\nx = 2;', verify: 'compile-fail', expectErrors: ['E0382'] }
  const ex = { type: 'compiles', id: 'c', code, answer: false, explanation: 'e', concepts: ['intro.main'] }
  assert.match(await errors([ex]), /expected errors E0382; got \[E0384\]/)
  assert.equal(await errors([{ ...ex, code: { ...code, expectErrors: ['E0384'] } }]), '')
})

test('a compiles answer that contradicts verification fails', async () => {
  const ex = { type: 'compiles', id: 'c', code: { rust: 'let x = 1;', verify: 'compile' }, answer: false, explanation: 'e', concepts: ['intro.main'] }
  assert.match(await errors([ex]), /contradicts/)
})

test('unknown concepts and bad option answers fail schema-independent checks', async () => {
  const ex = { ...predict('z'), concepts: ['intro.nope'] }
  const msg = await errors([ex])
  assert.match(msg, /unknown concept "intro.nope"/)
  assert.match(msg, /answer "z" is not an option id/)
})

test('a code read compiles to a one-lesson level with per-exercise reveals and a verified program', async () => {
  const root = fixture([predict('a')])
  const tf = (id: string) => ({ type: 'true-false', id, prompt: 'p', answer: true, explanation: 'e', concepts: ['intro.main'] })
  writeFileSync(
    join(root, 'sections/s1/u1/unit.yaml'),
    stringify({ id: 's1.u1', title: 'U1', description: 'd', path: [{ level: 'level' }, { 'code-read': 'read' }] }),
  )
  const cr = (lines: number[]) => ({
    id: 's1.u1.read',
    title: 'R',
    program: { rust: 'fn main() {\n    println!("hi");\n}\n', verify: 'run', expectStdout: 'hi\n' },
    chunks: lines.map((n, i) => ({ lines: n, exercises: [tf(`q${i}`)] })),
  })
  writeFileSync(join(root, 'sections/s1/u1/read.yaml'), stringify(cr([2, 1])))
  const r = await buildContent({ contentDir: root })
  assert.equal(r.issues.errors.length, 0, r.issues.errors.map((i) => i.message).join('\n'))
  const level = r.sections[0]!.units[0]!.levels['s1.u1.read']!
  assert.deepEqual(level.reveals, [2, 3])
  assert.equal(level.program?.verified?.stdout, 'hi\n')
  assert.deepEqual(r.sections[0]!.units[0]!.path[1], { kind: 'code-read', levelId: 's1.u1.read' })

  writeFileSync(join(root, 'sections/s1/u1/read.yaml'), stringify(cr([1, 1])))
  const bad = await buildContent({ contentDir: root })
  assert.match(bad.issues.errors.map((i) => i.message).join('\n'), /chunks reveal 2 lines but the program has 3/)
})

test('compile checks catch deny-by-default MIR lints (constant index out of bounds)', async () => {
  const code = { rust: 'let a = [1, 2, 3];\nprintln!("{}", a[3]);\n', verify: 'compile-fail', expectErrorMessage: 'will panic at runtime' }
  const ex = { type: 'compiles', id: 'c', code, answer: false, explanation: 'e', concepts: ['intro.main'] }
  assert.equal(await errors([ex]), '')
})

test('predict-output tiles must be able to spell the answer', async () => {
  const { assemblable } = await import('./build.ts')
  assert.equal(assemblable(['Fizz', 'Buzz', '11'], 'Fizz Buzz 11 Fizz'), false) // needs two Fizz tiles
  assert.equal(assemblable(['Fizz', 'Buzz', '11', 'Fizz'], 'Fizz Buzz 11 Fizz\n'), true)
  assert.equal(assemblable(['21.5', 'C'], '21.5C'), false) // tiles are joined with spaces
  assert.equal(assemblable(['a b', 'c', 'a'], 'a b c'), true)
})

test('concept diagrams validate their arrows', async () => {
  const card = (points: string) => ({
    type: 'concept',
    id: 'k',
    markdown: 'm',
    diagram: { frames: [{ name: 'main', vars: [{ name: 's', points }] }], heap: [{ id: 'h1', value: '"hi"' }] },
  })
  assert.equal(await errors([card('h1'), predict('a')]), '')
  assert.match(await errors([card('h2'), predict('a')]), /"h2" isn't a heap box or variable id/)
})
