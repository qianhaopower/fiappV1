import { test, expect } from '@playwright/test'

/**
 * P0 smoke tests — unauthenticated routes only.
 * These run in CI without any real Cognito credentials.
 */

test.describe('Public routing', () => {
  test('unauthenticated user hitting /today is redirected to /auth', async ({ page }) => {
    await page.goto('/today')
    await expect(page).toHaveURL(/\/auth/)
  })

  test('unauthenticated user hitting /practices is redirected to /auth', async ({ page }) => {
    await page.goto('/practices')
    await expect(page).toHaveURL(/\/auth/)
  })

  test('unauthenticated user hitting /results is redirected to /auth', async ({ page }) => {
    await page.goto('/results')
    await expect(page).toHaveURL(/\/auth/)
  })

  test('unauthenticated user hitting /progress is redirected to /auth', async ({ page }) => {
    await page.goto('/progress')
    await expect(page).toHaveURL(/\/auth/)
  })

  test('unauthenticated user hitting /account is redirected to /auth', async ({ page }) => {
    await page.goto('/account')
    await expect(page).toHaveURL(/\/auth/)
  })
})

test.describe('Auth page', () => {
  test('loads with sign in form', async ({ page }) => {
    await page.goto('/auth')
    await expect(page).toHaveURL(/\/auth/)
    await expect(page.getByText('Friends Intelligence')).toBeVisible()
    await expect(page.getByRole('tab', { name: /sign in/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
  })

  test('has sign up tab', async ({ page }) => {
    await page.goto('/auth')
    await expect(page.getByRole('tab', { name: /create account/i })).toBeVisible()
  })
})
