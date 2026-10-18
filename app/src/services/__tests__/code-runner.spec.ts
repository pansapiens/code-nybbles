import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const reply = { success: false, stdout: '', stderr: 'error[E0382]: borrow of moved value\nerror[E0382]: again\nerror[E0502]: x' }
let runner: typeof import('../code-runner')

beforeEach(async () => {
  vi.useFakeTimers()
  vi.resetModules()
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(reply))))
  runner = await import('../code-runner')
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('parses distinct error codes and sends the mode', async () => {
  const r = await runner.run('fn main() {}', { mode: 'test' })
  expect(r).toMatchObject({ ok: false, errorCodes: ['E0382', 'E0502'] })
  expect(JSON.parse(vi.mocked(fetch).mock.calls[0]![1]!.body as string)).toMatchObject({ tests: true, edition: '2024' })
})

it('allows 10 runs a minute, then frees up as the window slides', async () => {
  for (let i = 0; i < 10; i++) await runner.run('', { mode: 'run' })
  expect(runner.retryIn()).toBeGreaterThan(0)
  expect((await runner.run('', { mode: 'run' })).stderr).toMatch(/Too many/)
  expect(fetch).toHaveBeenCalledTimes(10)
  vi.advanceTimersByTime(60_000)
  expect(runner.retryIn()).toBe(0)
})

it('allows one request in flight', async () => {
  const first = runner.run('', { mode: 'run' })
  expect(runner.retryIn()).toBe(1)
  await first
  expect(runner.retryIn()).toBe(0)
})

it('resolves offline instead of throwing when the request fails', async () => {
  vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'))
  expect(await runner.run('', { mode: 'run' })).toMatchObject({ ok: false, offline: true })
})

it("drops cargo's progress lines from stderr but keeps the program's", async () => {
  const stderr = '   Compiling playground v0.0.1 (/playground)\n    Finished `dev` profile in 0.5s\n     Running `target/debug/playground`\nthread \'main\' panicked\n'
  vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ success: false, stdout: '', stderr })))
  expect((await runner.run('', { mode: 'run' })).stderr).toBe("thread 'main' panicked\n")
})
