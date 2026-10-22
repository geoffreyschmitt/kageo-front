import { expect, test } from '@playwright/test'

import { createUser, createWish, createWishlist } from './helpers'

// A signed-out guest on a phone: the shared list is readable, nothing overflows sideways, and
// Reserve is visible and asks them to log in rather than doing nothing.
test('signed-out guest sees Reserve and is asked to log in', async ({ browser, request }) => {
    await createUser(request, 'Owner')
    const list = await createWishlist(request, 'Guest view list')
    await createWish(request, list.id, 'Toaster', 59)

    const context = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true })
    const page = await context.newPage()
    await page.goto(`/en/wishlist/${list.id}`)

    await expect(page.getByRole('heading', { name: 'Guest view list' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)

    const reserve = page.getByRole('button', { name: 'Reserve', exact: true })
    await expect(reserve).toBeVisible()
    expect((await reserve.boundingBox())!.height).toBeGreaterThanOrEqual(44)

    await reserve.click()
    await expect(page.getByRole('button', { name: /log in/i }).last()).toBeVisible()
    await context.close()
})

// Logging in from the header modal must carry over to the list that is already open: the page's
// server-rendered props (who is signed in, their pots, their invite) have to be re-fetched.
test('a guest who logs in from the shared list can reserve straight away', async ({ browser, request }) => {
    await createUser(request, 'Owner')
    const list = await createWishlist(request, 'Login in place list')
    await createWish(request, list.id, 'Kettle', 45)

    const context = await browser.newContext()
    const email = `guest-${Date.now()}@e2e.test`
    const register = await context.request.post('/api/auth/register', {
        data: { name: 'Gus', email, password: 'e2e-password-1' },
    })
    expect(register.status()).toBe(201)

    const page = await context.newPage()
    await page.goto(`/en/wishlist/${list.id}`)
    await expect(page.getByText('Log in to see and post comments.')).toBeVisible()

    await page.getByRole('button', { name: 'Login' }).first().click()
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill('e2e-password-1')
    await page.getByRole('button', { name: 'Login' }).last().click()
    await expect(page.getByText('Hello, Gus')).toBeVisible()

    // No reload: the list itself must now know who is signed in.
    await expect(page.getByText('Log in to see and post comments.')).toBeHidden()
    await page.getByRole('button', { name: 'Reserve', exact: true }).click()
    await expect(page.getByText('Reserved by you')).toBeVisible()
    await context.close()
})
