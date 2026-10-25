import { readFile } from 'node:fs/promises'
import { expect, type Page, test } from '@playwright/test'

/** Clicks through first-launch onboarding as a beginner, which ends in the first lesson. Each test has a fresh profile. */
async function onboard(page: Page) {
  await page.goto('./welcome')
  await page.getByRole('button', { name: 'Get started' }).click()
  await page.getByRole('button', { name: 'I am new to programming' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Skip' }).click()
  await expect(page.getByRole('button', { name: 'Quit lesson' })).toBeVisible()
}

test('first launch goes through onboarding into the first lesson', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Welcome to Code Nybbles' })).toBeVisible()
  await page.getByRole('button', { name: 'Get started' }).click()
  await page.getByRole('button', { name: 'I am new to programming' }).click()
  await page.getByRole('button', { name: '30 XP' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Skip' }).click()
  await expect(page).toHaveURL(/\/lesson\//)
  await expect(page.getByRole('button', { name: 'Quit lesson' })).toBeVisible()
  await page.goto('./') // onboarded now: the path, not the welcome screen
  await expect(page.getByRole('list', { name: / path$/ }).first()).toBeVisible()
})

test('shell navigates between tabs', async ({ page }) => {
  await onboard(page)
  await page.goto('./')
  await expect(page.getByRole('list', { name: / path$/ }).first()).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Main' })
  for (const [tab, heading] of [['Shop', 'Shop'], ['Profile', 'Profile']]) {
    await nav.getByRole('link', { name: tab }).click()
    await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible()
  }
  await expect(page).toHaveURL(/\/code-nybbles\/profile$/)
})

test('lesson player: answer, feedback, quit', async ({ page }) => {
  // Content-agnostic: skips concept cards, answers the first choice exercise with any option.
  await onboard(page)
  await page.goto('./')
  await page.getByRole('button', { name: /, up next$/ }).click()
  await page.getByRole('button', { name: /^Start \+/ }).click()
  const gotIt = page.getByRole('button', { name: 'Got it' })
  const radio = page.getByRole('radio').first()
  await expect(gotIt.or(radio).first()).toBeVisible()
  while (await gotIt.isVisible()) await gotIt.click()
  const check = page.getByRole('button', { name: 'Check' })
  await expect(check).toBeDisabled()
  await radio.click()
  await check.click()
  await expect(page.getByText(/Nicely done!|Correct solution:/)).toBeVisible()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Quit lesson' }).click()
  await page.getByRole('button', { name: 'End session' }).click()
  await expect(page).toHaveURL(/\/code-nybbles\/$/)
})

test('a perfect first lesson awards XP, extends the streak and shows a combo', async ({ page }) => {
  const section = await (await page.request.get('content/section-first-steps.json')).json()
  const unit = section.units[0]
  const lesson = unit.levels[unit.path[0].level ?? unit.path[0].levelId].lessons[0]
  await onboard(page)
  await page.goto('./')
  await page.getByRole('button', { name: /, up next$/ }).click()
  await page.getByRole('button', { name: /^Start \+/ }).click()

  let graded = 0
  let usedEnter = false
  for (const ex of lesson.exercises) {
    if (ex.type === 'concept') {
      await page.getByRole('button', { name: 'Got it' }).click()
      continue
    }
    const count = ex.type === 'true-false' ? 2 : ex.options.length
    const right = ex.type === 'true-false' ? (ex.answer ? 0 : 1) : ex.options.findIndex((o: { id: string }) => o.id === ex.answer)
    await page.getByRole('radio').nth(right % count).click()
    if (!usedEnter) {
      await page.keyboard.press('Enter')
      usedEnter = true
    } else {
      await page.getByRole('button', { name: 'Check' }).click()
    }
    graded++
    if (graded === 5) await expect(page.getByText('5 in a row!')).toBeVisible()
    await expect(page.getByText('Nicely done!')).toBeVisible()
    await page.getByRole('button', { name: 'Continue' }).click()
  }

  await expect(page.getByRole('heading', { name: 'Lesson complete!' })).toBeVisible()
  await expect(page.locator('.stat.xp strong')).toHaveText('15')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { name: '1 day streak!' })).toBeVisible()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { name: 'Hello, World!' })).toBeVisible()
  // Early Crab (before 7am) and Night Owl (after 10pm) can follow Hello, World! and each add 25 gems.
  let gems = 30
  const streak = page.getByRole('button', { name: '1 day streak' })
  const timeOfDay = page.getByRole('heading', { name: /Early Crab|Night Owl/ })
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(streak.or(timeOfDay)).toBeVisible()
  if (await timeOfDay.isVisible()) {
    gems += 25
    await page.getByRole('button', { name: 'Continue' }).click()
  }
  await expect(streak).toBeVisible()
  await expect(page.getByRole('button', { name: `${gems} gems` })).toBeVisible()

  const level = unit.levels[unit.path[0].level ?? unit.path[0].levelId]
  const here = page.getByRole('button', { name: `Start: ${level.title}, up next` })
  await here.click()
  await expect(page.getByText(`Lesson 2 of ${level.lessons.length}`)).toBeVisible()
  await page.goto('./settings')
  await page.getByRole('button', { name: 'Reset progress' }).click()
  await page.getByRole('button', { name: `Unit 1. ${unit.title}`, exact: true }).click()
  await page.getByRole('button', { name: `Reset to the start of ${unit.title}` }).click()
  await expect(page.getByText(`Lessons from ${unit.title} onward are marked not done.`)).toBeVisible()
  await page.goto('./')
  await here.click()
  await expect(page.getByText(`Lesson 1 of ${level.lessons.length}`)).toBeVisible()
  await expect(page.getByRole('button', { name: '1 day streak' })).toBeVisible()
  await expect(page.getByRole('button', { name: `${gems} gems` })).toBeVisible()
})

test('a hint is offered and keeps the answer from being perfect', async ({ page }) => {
  await onboard(page)
  await page.goto('./')
  await page.getByRole('button', { name: /, up next$/ }).click()
  await page.getByRole('button', { name: /^Start \+/ }).click()
  await page.getByRole('button', { name: 'Got it' }).click()
  await page.getByRole('button', { name: 'Hint' }).click()
  await expect(page.getByText("won't count as perfect")).toBeVisible()
  await page.getByRole('radio').first().click()
  await page.getByRole('button', { name: 'Check' }).click()
  await expect(page.getByText('Done!')).toBeVisible()
})

test('a wrong answer lands in Mistakes review', async ({ page }) => {
  // Drives lesson 1 of the first level from its content: the first graded exercise is answered wrongly, the rest correctly.
  const section = await (await page.request.get('content/section-first-steps.json')).json()
  const unit = section.units[0]
  const lesson = unit.levels[unit.path[0].level ?? unit.path[0].levelId].lessons[0]
  await onboard(page)
  await page.goto('./')
  await page.getByRole('button', { name: /, up next$/ }).click()
  await page.getByRole('button', { name: /^Start \+/ }).click()
  const answer = async (ex: { type: string; answer: unknown; options?: { id: string }[] }, wrong = false) => {
    const count = ex.type === 'true-false' ? 2 : ex.options!.length
    const right = ex.type === 'true-false' ? (ex.answer ? 0 : 1) : ex.options!.findIndex((o) => o.id === ex.answer)
    await page.getByRole('radio').nth(wrong ? (right + 1) % count : right).click()
    await page.getByRole('button', { name: 'Check' }).click()
    await page.getByRole('button', { name: 'Continue' }).click()
  }
  let missed
  for (const ex of lesson.exercises) {
    if (ex.type === 'concept') await page.getByRole('button', { name: 'Got it' }).click()
    else await answer(ex, !missed && (missed = ex) !== undefined)
  }
  await answer(missed) // re-queued at the end
  await expect(async () => {
    await page.getByRole('button', { name: 'Continue' }).click({ timeout: 1000 })
    expect(page.url()).toMatch(/\/code-nybbles\/$/)
  }).toPass()

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Practice' }).click()
  await expect(page.getByRole('heading', { name: /Mistakes review/ })).toContainText('1')
  await page.getByRole('button', { name: 'Start' }).nth(1).click()
  await expect(page.getByRole('button', { name: 'Check' })).toBeVisible()
})

test('a Code Read mistake comes back with its program', async ({ page }) => {
  const section = await (await page.request.get('content/section-first-steps.json')).json()
  const unit = section.units[0]
  const node = unit.path.find((p: { kind: string }) => p.kind === 'code-read')
  const level = unit.levels[node.levelId]
  const lesson = level.lessons[0]
  await onboard(page)
  await page.goto(`./lesson/${level.id}/${lesson.id}`)

  const answer = async (ex: { type: string; answer: unknown; options?: { id: string }[] }, wrong = false) => {
    const count = ex.type === 'true-false' ? 2 : ex.options!.length
    const right = ex.type === 'true-false' ? (ex.answer ? 0 : 1) : ex.options!.findIndex((o: { id: string }) => o.id === ex.answer)
    await page.getByRole('radio').nth(wrong ? (right + 1) % count : right).click()
    await page.getByRole('button', { name: 'Check', exact: true }).click()
    await page.getByRole('button', { name: 'Continue' }).click()
  }
  let missed
  for (const ex of lesson.exercises) await answer(ex, !missed && (missed = ex) !== undefined)
  await answer(missed)
  await expect(async () => {
    await page.getByRole('button', { name: 'Continue' }).click({ timeout: 1000 })
    expect(page.url()).toMatch(/\/code-nybbles\/$/)
  }).toPass()

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Practice' }).click()
  await expect(page.getByRole('heading', { name: /Mistakes review/ })).toContainText('1')
  await page.getByRole('button', { name: 'Start' }).nth(1).click()
  await expect(page.getByRole('figure', { name: 'Program' })).toContainText('fn main')
  await expect(page.getByText(missed.prompt)).toBeVisible()
})

test('works offline after the service worker installs', async ({ page, context }) => {
  await onboard(page)
  await page.goto('./')
  // registerType 'prompt' doesn't claim the first load, so reload once the SW is active.
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
  await context.setOffline(true)
  await page.goto('./practice') // deep link served by the SW navigation fallback
  await expect(page.getByRole('heading', { name: 'Practice', level: 1 })).toBeVisible()
  await context.setOffline(false)
})

test.describe('placement test', () => {
  test.use({ serviceWorkers: 'block' }) // so page.route sees the content requests

  test('passing Section 1 and failing Section 2 places you at Unit 2.1', async ({ page }) => {
    // Each section's checkpoint is replaced by plain multiple-choice questions, so the test can answer right or wrong by position.
    const mcq = (id: string) => ({ type: 'mcq', id, prompt: 'Pick one', options: [{ id: 'a', code: 'right' }, { id: 'b', code: 'wrong' }], answer: 'a' })
    await page.route('**/content/section-*.json', async (route) => {
      const section = await (await route.fetch()).json()
      const last = section.units.findLast((u: { path: { kind: string }[] }) => u.path.some((p) => p.kind === 'checkpoint'))
      const level = last.levels[last.path.find((p: { kind: string }) => p.kind === 'checkpoint').levelId]
      level.lessons[0].exercises = ['q1', 'q2', 'q3', 'q4'].map(mcq)
      await route.fulfill({ json: section })
    })
    const unit21 = (await (await page.request.get('content/section-functions-control-flow.json')).json()).units[0]

    await onboard(page)
    await page.goto('./placement')
    for (const pick of [0, 0, 0, 1, 1, 1]) {
      await page.getByRole('radio').nth(pick).click()
      await page.getByRole('button', { name: 'Check' }).click()
      await page.getByRole('button', { name: 'Continue' }).click()
    }
    await expect(page.getByRole('heading', { name: "You've placed into Section 2" })).toBeVisible()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByRole('list', { name: `${unit21.title} path` }).getByRole('button', { name: /, up next$/ })).toBeVisible()
  })
})

test.describe('jump ahead from a locked checkpoint', () => {
  test.use({ serviceWorkers: 'block' })

  /** Replaces the first checkpoint with a short multiple-choice lesson, so the test can pass or fail it on purpose. */
  async function stubCheckpoint(page: Page) {
    const mcq = (id: string) => ({
      type: 'mcq',
      id,
      prompt: 'Pick one',
      options: [
        { id: 'a', code: 'right' },
        { id: 'b', code: 'wrong' },
      ],
      answer: 'a',
    })
    await page.route('**/content/section-*.json', async (route) => {
      const section = await (await route.fetch()).json()
      if (section.id === 'first-steps') {
        const unit = section.units[0]
        const node = unit.path.find((p: { kind: string }) => p.kind === 'checkpoint')
        unit.levels[node.levelId].lessons[0].exercises = ['q1', 'q2', 'q3', 'q4', 'q5'].map(mcq)
      }
      await route.fulfill({ json: section })
    })
  }

  async function openJump(page: Page) {
    await stubCheckpoint(page)
    await onboard(page)
    await page.goto('./')
    await page.getByRole('button', { name: 'Checkpoint: Hello, Rust, locked' }).click()
    await page.getByRole('button', { name: 'Jump here?' }).click()
    await expect(page).toHaveURL(/\/jump\//)
    await expect(page.getByRole('button', { name: 'Check', exact: true })).toBeVisible()
  }

  async function answer(page: Page, right: boolean) {
    await page.getByRole('radio').nth(right ? 0 : 1).click()
    await page.getByRole('button', { name: 'Check', exact: true }).click()
    await page.getByRole('button', { name: 'Continue' }).click()
  }

  test('scoring 80% unlocks everything up to the checkpoint', async ({ page }) => {
    await openJump(page)
    for (let i = 0; i < 5; i++) await answer(page, true)
    await expect(page.getByRole('heading', { name: 'Jumped ahead!' })).toBeVisible()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByRole('button', { name: 'Checkpoint: Hello, Rust, complete' })).toBeVisible()
  })

  test('a low score leaves the checkpoint locked', async ({ page }) => {
    await openJump(page)
    for (let i = 0; i < 5; i++) await answer(page, false)
    await expect(page.getByRole('heading', { name: 'Not quite yet' })).toBeVisible()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByRole('button', { name: 'Checkpoint: Hello, Rust, locked' })).toBeVisible()
  })
})

test('onboarding offers a placement test once you already know a language', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Get started' }).click()
  await page.getByRole('button', { name: 'I know another language' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Skip' }).click()
  await expect(page.getByRole('heading', { name: 'Want to skip the basics?' })).toBeVisible()
  await page.getByRole('button', { name: 'Take a short test' }).click()
  await expect(page).toHaveURL(/\/placement$/)
  await expect(page.getByRole('button', { name: 'Check' })).toBeVisible()
})

test('playground runs the default program from the practice hub', async ({ page }) => {
  await page.route('https://play.rust-lang.org/execute', (route) =>
    route.fulfill({ json: { success: true, stdout: 'Hello, Nybbles!\n', stderr: '' } }),
  )
  await onboard(page)
  await page.goto('./practice')
  await page.getByRole('link', { name: 'Playground' }).click()
  await expect(page.getByRole('heading', { name: 'Playground', level: 1 })).toBeVisible()
  await page.getByRole('button', { name: 'RUN' }).click()
  await expect(page.getByLabel('Output')).toContainText('Hello, Nybbles!')
})

test('playground symbol keys type at the cursor, and TEST appears for code with tests', async ({ page }) => {
  let sent: { tests?: boolean } = {}
  await page.route('https://play.rust-lang.org/execute', (route) => {
    sent = route.request().postDataJSON()
    return route.fulfill({ json: { success: true, stdout: 'test t ... ok\n', stderr: '' } })
  })
  await onboard(page)
  await page.goto('./playground')
  const editor = page.getByLabel('Rust code')
  await editor.fill('')
  await expect(page.getByRole('button', { name: 'TEST' })).toHaveCount(0)
  const keys = page.getByRole('toolbar', { name: 'Rust symbols' })
  for (const k of ['#', '[', ']']) await keys.getByRole('button', { name: k, exact: true }).click()
  await editor.pressSequentially('\nfn t() {}')
  await expect(editor).toHaveValue('#[]\nfn t() {}')
  await editor.fill('#[test]\nfn t() {}')
  await page.getByRole('button', { name: 'TEST' }).click()
  await expect(page.getByLabel('Output')).toContainText('test t ... ok')
  expect(sent.tests).toBe(true)
})

test('a daily reminder downloads as a calendar event', async ({ page }) => {
  await onboard(page)
  await page.goto('./settings')
  const time = page.getByLabel('Daily reminder')
  await time.fill('19:30')
  await time.blur()
  const add = page.getByRole('button', { name: 'Add to calendar' })
  await expect(add).toBeVisible()
  const [download] = await Promise.all([page.waitForEvent('download'), add.click()])
  expect(download.suggestedFilename()).toBe('code-nybbles-reminder.ics')
  const ics = await readFile((await download.path())!, 'utf8')
  expect(ics).toContain('RRULE:FREQ=DAILY')
  expect(ics).toContain('T193000')
  expect(ics).not.toMatch(/DTSTART:[^\r\n]*Z/)
})
