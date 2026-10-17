import { expect, test } from '@playwright/test'

test('shell navigates between tabs', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Hello, Rust', level: 1 })).toBeVisible()
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Shop' }).click()
  await expect(page.getByRole('heading', { name: 'Shop' })).toBeVisible()
  await expect(page).toHaveURL(/\/code-nybbles\/shop$/)
})

test('lesson player: concept card, wrong-answer feedback, quit', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Start' }).first().click()
  await page.getByRole('button', { name: 'Got it' }).click()
  const check = page.getByRole('button', { name: 'Check' })
  await expect(check).toBeDisabled()
  await page.getByRole('radio', { name: 'Ready Go!', exact: true }).click()
  await check.click()
  await expect(page.getByText('Correct solution:')).toBeVisible()
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
