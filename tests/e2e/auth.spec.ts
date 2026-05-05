import { test, expect } from '@playwright/test'

test.describe('/auth', () => {
  test('shows sign in form with Friends Intelligence branding', async ({ page }) => {
    await page.goto('/auth')

    await expect(page.getByText('Friends Intelligence')).toBeVisible()
    await expect(page.getByText(/sign in to continue/i)).toBeVisible()
    await expect(page.getByRole('tab', { name: /sign in/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /create account/i })).toBeVisible()
  })
})
