import { test, expect } from '@playwright/test'

const username = process.env.E2E_USERNAME
const password = process.env.E2E_PASSWORD
const newPassword = process.env.E2E_NEW_PASSWORD
if (!username || !password) throw new Error('E2E_USERNAME and E2E_PASSWORD are required.')

test('login, core workflows and logout smoke test', async ({ page }) => {
  await page.goto('/login')
  await page.getByPlaceholder('Nhập tên đăng nhập').fill(username)
  await page.getByPlaceholder('Nhập mật khẩu').fill(password)
  const loginResponsePromise = page.waitForResponse(
    (response) => response.url().endsWith('/api/auth/login') && response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: /đăng nhập/i }).click()
  const loginResponse = await loginResponsePromise
  expect(loginResponse.status()).toBe(200)

  if (await page.getByRole('heading', { name: /đổi mật khẩu/i }).isVisible().catch(() => false)) {
    if (!newPassword) throw new Error('E2E_NEW_PASSWORD is required when the staging account must change password.')
    await page.getByPlaceholder('Nhập mật khẩu hiện tại').fill(password)
    await page.getByPlaceholder(/Tối thiểu 10 ký tự/).fill(newPassword)
    await page.getByPlaceholder('Nhập lại mật khẩu mới').fill(newPassword)
    await page.getByRole('button', { name: /đổi mật khẩu/i }).click()
  }

  await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 })
  await expect(page.getByText(/dashboard|tổng quan/i).first()).toBeVisible()

  for (const route of ['/inventory', '/invoices', '/reports']) {
    await page.goto(route, { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(new RegExp(`${route.slice(1)}$`), { timeout: 15_000 })
    await expect(page.getByRole('button', { name: /đăng xuất/i })).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('body')).not.toContainText(/Không thể hiển thị giao diện/)
  }

  const logoutButton = page.getByRole('button', { name: /đăng xuất/i })
  await logoutButton.click()
  await expect(page).toHaveURL(/login/, { timeout: 15_000 })
})
