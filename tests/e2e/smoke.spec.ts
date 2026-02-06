import { test, expect } from '@playwright/test'

test('smoke: design page loads', async ({ page }) => {
  await page.goto('/design')

  // App should render either auth UI or the app shell
  const authOrShell = page.getByRole('button', { name: /sign in|sign out|create account/i })
  await expect(authOrShell.first()).toBeVisible()
})
