import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('WCAG AA checks for public, survey, and admin interfaces', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  for (const path of ['/', '/survei/igd', '/admin/dashboard']) {
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({ html: n.html, summary: n.failureSummary })),
      })),
    ).toEqual([]);
  }
});
