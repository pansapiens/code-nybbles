// Run: node --test (set RUST_VERIFY_LINKER if the PATH `cc` can't link Rust, see ../rust-verify/README.md)
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { stringify } from 'yaml'
import { buildContent, primaryErrorLine, roteCodes, shownErrorLine } from './build.ts'

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

const fill = (bank: string[], rust = 'let n = 2;\nprintln!("{}", n ___1___ 2);\n', blanks: object = { 1: { answer: ['*'] } }) => ({
  type: 'fill-tokens',
  id: 'f',
  prompt: 'p',
  code: { rust, verify: 'run', expectStdout: '4\n' },
  blanks,
  bank,
  explanation: 'e',
  concepts: ['intro.main'],
})

test('a fill-tokens tile that also gives the expected output is an error', async () => {
  assert.equal(await errors([fill(['*', '-', '/'])]), '')
  assert.match(await errors([fill(['*', '+', '-'])]), /also correct with "\+" in blank 1/)
})

test('two blanks needing one tile need it twice in the bank', async () => {
  const rust = 'println!("{}", 2 ___1___ 3 ___2___ 2);\n'
  const ex = (bank: string[]) => ({ ...fill(bank, rust, { 1: { answer: ['*'] }, 2: { answer: ['*'] } }), code: { rust, verify: 'run', expectStdout: '12\n' } })
  assert.match(await errors([ex(['*', '-', '/'])]), /2 blanks need "\*" but the bank has it 1 time/)
  assert.equal(await errors([ex(['*', '*', '-', '/'])]), '')
})

test('guidebook rust blocks are verified, honouring compile_fail and should_panic', async () => {
  const root = fixture([predict('a')])
  writeFileSync(join(root, 'sections/s1/u1/unit.yaml'), stringify({ id: 's1.u1', title: 'U1', description: 'd', guidebook: 'g.md', path: [{ level: 'level' }] }))
  const g = (md: string) => writeFileSync(join(root, 'sections/s1/u1/g.md'), md)
  const errs = async () => (await buildContent({ contentDir: root })).issues.errors.map((i) => i.message).join('\n')
  g('```rust\nlet x = 1;\nprintln!("{x}");\n```\n\n```rust,compile_fail,E0384\nlet x = 1;\nx = 2;\n```\n\n```rust,should_panic\nlet v = [1];\nlet i = std::env::args().count();\nprintln!("{}", v[i]);\n```\n')
  assert.equal(await errs(), '')
  g('```rust\nprintln!("{y}");\n```\n')
  assert.match(await errs(), /expected it to compile/)
})

test('stdin is piped to the program, for code and parsons verification', async () => {
  const rust = 'let mut s = String::new();\nstd::io::stdin().read_line(&mut s).unwrap();\nprint!("got {}", s);\n'
  const ex = { ...predict('a', rust), options: [{ id: 'a', text: 'got 50' }, { id: 'b', text: 'got' }] }
  const code = (stdin?: string) => ({ ...ex.code, stdin, expectStdout: 'got 50\n' })
  assert.equal(await errors([{ ...ex, code: code('50\n') }]), '')
  assert.match(await errors([{ ...ex, code: code() }]), /stdout mismatch/)
})

test('a build compiles to a level with one lesson per step and generated cards', async () => {
  const root = fixture([predict('a')])
  writeFileSync(join(root, 'sections/s1/u1/unit.yaml'), stringify({ id: 's1.u1', title: 'U1', description: 'd', path: [{ level: 'level' }, { build: 'b' }] }))
  const tf = (id: string) => ({ type: 'true-false', id, prompt: 'p', answer: true, explanation: 'e', concepts: ['intro.main'] })
  const step = (id: string, rust: string, stdout: string, stdin?: string) => ({
    id,
    title: id,
    goal: `Goal of ${id}.`,
    file: { rust, verify: 'run', stdin, expectStdout: stdout },
    exercises: [tf('a'), tf('b'), tf('c')],
  })
  const one = 'fn main() {\n    println!("hi");\n}\n'
  const two = 'use std::io;\nfn main() {\n    let mut s = String::new();\n    io::stdin().read_line(&mut s).ok();\n    print!("got {s}");\n}\n'
  const write = (steps: unknown[]) => writeFileSync(join(root, 'sections/s1/u1/b.yaml'), stringify({ id: 's1.u1.b', title: 'B', concepts: ['intro.main'], steps }))
  write([step('one', one, 'hi\n'), step('two', two, 'got 50\n', '50\n')])
  const r = await buildContent({ contentDir: root })
  const mine = r.issues.list.filter((i) => i.where.includes('b.yaml'))
  assert.equal(mine.length, 0, mine.map((i) => i.message).join('\n'))
  const u = r.sections[0]!.units[0]!
  assert.deepEqual(u.path[1], { kind: 'build', levelId: 's1.u1.b' })
  const level = u.levels['s1.u1.b']!
  assert.equal(level.build, true)
  assert.deepEqual(level.lessons.map((l) => l.id), ['one', 'two'])
  const [first, second] = level.lessons.map((l) => l.exercises as { type: string; title?: string; markdown: string }[])
  assert.equal(first!.length, 5)
  assert.equal(first![0]!.title, 'one')
  assert.doesNotMatch(first![0]!.markdown, /so far/)
  assert.match(first![4]!.markdown, /It prints:[\s\S]*hi/)
  assert.match(second![0]!.markdown, /Your program so far:[\s\S]*println!/)
  assert.match(second![4]!.markdown, /You type:[\s\S]*50[\s\S]*It prints:[\s\S]*got 50/)

  write([step('one', one, 'hi\n'), step('one', one, 'hi\n')])
  assert.match((await buildContent({ contentDir: root })).issues.errors.map((i) => i.message).join('\n'), /duplicate step ids/)
  write([{ ...step('one', one, 'hi\n'), exercises: [tf('a')] }])
  assert.match((await buildContent({ contentDir: root })).issues.list.map((i) => i.message).join('\n'), /1 exercises \(expected 3-8\)/)
  write([{ ...step('one', one, 'hi\n'), file: { rust: one, verify: 'compile' } }])
  assert.match((await buildContent({ contentDir: root })).issues.errors.map((i) => i.message).join('\n'), /must be `verify: run`/)
})

const parsons = (distractor: string) => ({
  type: 'parsons',
  id: 'par',
  prompt: 'p',
  lines: [
    { id: 'a', text: 'fn main() {' },
    { id: 'b', text: '    println!("hi");' },
    { id: 'c', text: '}' },
  ],
  distractors: [{ id: 'd', text: distractor }],
  answer: ['a', 'b', 'c'],
  verify: { mode: 'run', expectStdout: 'hi\n' },
  explanation: 'e',
  concepts: ['intro.main'],
})

test('a parsons distractor that still produces the expected output is an error', async () => {
  assert.equal(await errors([parsons('    println!("nope");')]), '')
  assert.match(await errors([parsons('    println!("hi")')]), /also passes in place of "    println!\(\\"hi\\"\);"/)
})

const spot = (answer: number, extra: object = {}) => ({
  type: 'spot-bug',
  id: 's',
  prompt: 'p',
  code: {
    rust: 'fn main() {\n    println("hi");\n}\n',
    wrap: 'none',
    verify: 'compile-fail',
    expectErrors: ['E0423'],
  },
  answer,
  ...extra,
  explanation: 'e',
  concepts: ['intro.main'],
})

test('a spot-bug answer must be the line the compiler points at, unless compilerLine says otherwise', async () => {
  assert.equal(await errors([spot(2)]), '')
  assert.match(await errors([spot(1)]), /answer line 1 but the compiler points at line 2/)
  assert.equal(await errors([spot(1, { compilerLine: 2 })]), '')
  assert.match(await errors([spot(1, { compilerLine: 3 })]), /compilerLine 3 but the compiler points at line 2/)
  const wrapped = spot(1)
  wrapped.code = { rust: 'println("hi");\n', wrap: 'auto', verify: 'compile-fail', expectErrors: ['E0423'] }
  assert.equal(await errors([wrapped]), '')
})

test('primary error line is the first span, shifted back out of a generated main', () => {
  assert.equal(primaryErrorLine('error[E0423]: x\n --> main.rs:3:5\n  |\n'), 3)
  assert.equal(shownErrorLine(2, 'println("hi");\n', 'auto', undefined, 'compile-fail'), 1)
  assert.equal(shownErrorLine(3, 'fn main() {\n    println("hi");\n}\n', 'none'), 3)
})

test('questions that hinge on an error code are found; codes shown beside a message are fine', () => {
  const mcq = (texts: string[]) => ({ type: 'mcq', prompt: 'Which error? E0382 is shown above', options: texts.map((text, i) => ({ id: `${i}`, text })) })
  assert.deepEqual(roteCodes(mcq(['E0382: borrow of moved value', 'E0499: cannot borrow twice']) as never), [])
  assert.deepEqual(roteCodes(mcq(["It doesn't compile: E0499", "It doesn't compile: E0502"]) as never), ['options differ only by error code'])
  assert.deepEqual(roteCodes({ type: 'match-pairs', pairs: [['E0382', 'used after a move']] } as never), ['match-pairs names an error code'])
  assert.deepEqual(roteCodes({ type: 'true-false', prompt: 'E0499 means two `&mut` at once.' } as never), ['true-false prompt names an error code'])
  assert.deepEqual(roteCodes({ type: 'true-false', prompt: '`error[E0499]: cannot borrow` means two `&mut` at once.' } as never), [])
})
