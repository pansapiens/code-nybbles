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
