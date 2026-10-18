/* eslint-disable playwright/no-conditional-in-test, playwright/no-conditional-expect -- the lesson walk answers whatever exercise type comes next */
import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'

// Automated WCAG 2.1 A/AA audit (plans/01 §4.5). The unit banners keep bright colours by choice, so their
// contrast is excluded; everything else must pass.
async function audit(page: Page, name: string) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('.unit-banner')
    .analyze()
  const summary = violations.map(
    (v) =>
      `${name}: ${v.id} (${v.impact}) ${v.help}\n  ${v.nodes
        .slice(0, 3)
        .map((n) => n.target.join(' '))
        .join('\n  ')}`,
  )
  expect(summary, summary.join('\n')).toEqual([])
}

for (const colorScheme of ['light', 'dark'] as const)
  test.describe(colorScheme, () => {
    test.use({ colorScheme })

    test('screens and a lesson pass an automated accessibility audit', async ({ page }) => {
      test.setTimeout(60_000)
      await page.goto('./welcome')
      await audit(page, 'welcome')
      await page.getByRole('button', { name: 'Get started' }).click()
      await audit(page, 'onboarding')
      await page.getByRole('button', { name: 'I am new to programming' }).click()
      await page.getByRole('button', { name: 'Continue' }).click()
      await page.getByRole('button', { name: 'Skip' }).click()
      await expect(page.getByRole('button', { name: 'Quit lesson' })).toBeVisible()
      // Answer each exercise with its first choice (right or wrong), auditing the question and the feedback.
      const main = page.getByRole('button', { name: /^(Got it|Check|Continue)$/ })
      for (let step = 0; step < 12 && (await main.count()); step++) {
        await audit(page, `lesson step ${step}`)
        const label = await main.textContent()
        if (/check/i.test(label ?? '')) {
          const choice = page
            .getByRole('radio')
            .or(page.locator('.bank button, .tiles button'))
            .first()
          if (await choice.count()) await choice.click()
          if (await main.isDisabled()) break
          await main.click()
          await audit(page, `lesson step ${step} feedback`)
        }
        await main.click()
        // The next question takes focus, so a screen reader reads it.
        if (await main.count()) await expect(page.locator('main.prompt')).toBeFocused()
      }
      for (const path of ['', 'practice', 'playground', 'shop', 'profile', 'streak', 'settings']) {
        await page.goto(`./${path}`)
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
        await expect(page).toHaveTitle(/· Code Nybbles$/)
        await audit(page, path || 'learn')
      }
    })
  })
