import { expect, test } from '@playwright/test'

test('shell navigates between tabs', async ({ page }) => {
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
  await page.goto('./')
  await page.getByRole('button', { name: /, up next$/ }).click()
  await page.getByRole('button', { name: /^Start/ }).click()
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

test('works offline after the service worker installs', async ({ page, context }) => {
  await page.goto('./')
  // registerType 'prompt' doesn't claim the first load, so reload once the SW is active.
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
  await context.setOffline(true)
  await page.goto('./practice') // deep link served by the SW navigation fallback
  await expect(page.getByRole('heading', { name: 'Practice' })).toBeVisible()
  await context.setOffline(false)
})
