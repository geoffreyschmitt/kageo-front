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
