import { test, expect } from '@playwright/test'

// These smoke tests verify the server-side middleware redirects unauthenticated
// requests to /auth. We use the API request context (no JavaScript, no cookies)
// to directly check the HTTP 307 response — bypassing any client-side redirect
// loops that occur when Amplify's guest Identity Pool assigns an anonymous identity.
test.describe('Public routing', () => {
  const protectedRoutes = ['/today', '/practices', '/results', '/progress', '/account']

  for (const route of protectedRoutes) {
    test(`unauthenticated user hitting ${route} is redirected to /auth`, async ({ request }) => {
      const response = await request.get(route, { maxRedirects: 0 })
      expect(response.status()).toBe(307)
      expect(response.headers()['location']).toMatch(/\/auth/)
    })
  }
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
