import { test, expect } from '@playwright/test'

test('smoke: design page loads', async ({ page }) => {
  await page.goto('/design')

  await expect(page.getByText("Design System")).toBeVisible()
})
