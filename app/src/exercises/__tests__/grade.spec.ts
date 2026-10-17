import { describe, expect, it } from 'vitest'
import { type Ex, grade, solution } from '../grade'

const code = (rust: string) => ({ rust, verify: 'run', wrap: 'auto' })

describe('graders', () => {
  it('fill-tokens accepts alternatives and anyOrder swaps', () => {
    const ex = {
      type: 'fill-tokens',
      code: code('let x = ___1___ + ___2___;\nlet ___3___ = 1;'),
      blanks: { '1': { answer: ['a'] }, '2': { answer: ['b'] }, '3': { answer: ['y', 'z'] } },
      anyOrder: [['1', '2']],
    } as unknown as Ex<'fill-tokens'>
    expect(grade(ex, { '1': 'a', '2': 'b', '3': 'y' }).correct).toBe(true)
    expect(grade(ex, { '1': 'b', '2': 'a', '3': 'z' }).correct).toBe(true)
    expect(grade(ex, { '1': 'a', '2': 'a', '3': 'y' }).correct).toBe(false)
    expect(grade(ex, { '1': 'a', '2': 'b' }).correct).toBe(false)
    expect(solution(ex).code).toBe('let x = a + b;\nlet y = 1;')
  })

  it('predict-output assemble mode compares words, not line breaks', () => {
    const ex = { type: 'predict-output', tiles: ['Ready', 'Go!', 'Stop'], answer: 'Ready\nGo!\n' } as Ex<'predict-output'>
    expect(grade(ex, [0, 1]).correct).toBe(true)
    expect(grade(ex, [1, 0]).correct).toBe(false)
    expect(grade(ex, [0, 1, 2]).correct).toBe(false)
  })

  it('compiles needs the follow-up too when the answer is no', () => {
    const ex = {
      type: 'compiles',
      answer: false,
      followUp: { prompt: '?', options: [{ id: 'a', text: 'missing ;' }, { id: 'b', text: 'x' }], answer: 'a' },
    } as Ex<'compiles'>
    expect(grade(ex, { compiles: false, followUp: 'a' }).correct).toBe(true)
    expect(grade(ex, { compiles: false, followUp: 'b' }).correct).toBe(false)
    expect(grade(ex, { compiles: true }).correct).toBe(false)
    expect(solution(ex).html).toBe('No. missing ;')
  })

  it('parsons accepts listed alternative orders', () => {
    const ex = { type: 'parsons', lines: ['a', 'b', 'c'].map((id) => ({ id, text: id })), answer: ['a', 'b', 'c'], alternatives: [['b', 'a', 'c']] } as unknown as Ex<'parsons'>
    expect(grade(ex, ['a', 'b', 'c']).correct).toBe(true)
    expect(grade(ex, ['b', 'a', 'c']).correct).toBe(true)
    expect(grade(ex, ['c', 'b', 'a']).correct).toBe(false)
  })

  it('parsons treats lines with identical text as interchangeable', () => {
    const lines = [{ id: 'a', text: 'x' }, { id: 'b', text: '}' }, { id: 'c', text: '}' }]
    const ex = { type: 'parsons', lines, answer: ['a', 'b', 'c'] } as unknown as Ex<'parsons'>
    expect(grade(ex, ['a', 'c', 'b']).correct).toBe(true)
    expect(grade(ex, ['b', 'a', 'c']).correct).toBe(false)
  })
})
