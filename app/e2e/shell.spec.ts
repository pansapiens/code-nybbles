import { expect, test } from '@playwright/test'

test('shell navigates between tabs', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Hello, Rust' })).toBeVisible()
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Shop' }).click()
  await expect(page.getByRole('heading', { name: 'Shop' })).toBeVisible()
  await expect(page).toHaveURL(/\/code-nybbles\/shop$/)
})

test('lesson preview: pick, check, feedback', async ({ page }) => {
  await page.goto('./lesson/preview')
  const check = page.getByRole('button', { name: 'Check' })
  await expect(check).toBeDisabled()
  await page.getByRole('radio', { name: 'Hello, Ferris!' }).click()
  await check.click()
  await expect(page.getByText('Nicely done!')).toBeVisible()
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
