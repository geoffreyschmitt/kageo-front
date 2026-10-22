import { expect, test } from '@playwright/test'

import { api, createUser, createWish, createWishlist, newPerson } from './helpers'

// Private means "reachable by link or invitation, not listed on the profile": anyone with the
// link can read, but acting needs a signed-in account whose email was invited.
test.describe('a private list opened from its link', () => {
    test('a signed-out visitor reads it and is asked to log in on Reserve', async ({ browser, request }) => {
        await createUser(request, 'Owner')
        const list = await createWishlist(request, 'Private signed-out list', false)
        await createWish(request, list.id, 'Lamp', 30)

        const context = await browser.newContext()
        const page = await context.newPage()
        await page.goto(`/en/wishlist/${list.id}`)

        await expect(page.getByRole('heading', { name: 'Private signed-out list' })).toBeVisible()
        await page.getByRole('button', { name: 'Reserve', exact: true }).click()
        await expect(page.getByRole('button', { name: /log in/i }).last()).toBeVisible()
        await context.close()
    })

    test('a signed-in stranger sees the list, then a calm notice when acting', async ({ browser, request }) => {
        await createUser(request, 'Owner')
        const list = await createWishlist(request, 'Private stranger list', false)
        await createWish(request, list.id, 'Vase', 40)

        const stranger = await newPerson(browser, 'Stranger')
        await stranger.page.goto(`/en/wishlist/${list.id}`)
        await expect(stranger.page.getByRole('heading', { name: 'Private stranger list' })).toBeVisible()

        await stranger.page.getByRole('button', { name: 'Reserve', exact: true }).click()
        await expect(stranger.page.getByText(/This list is private/)).toBeVisible()
        // No raw API error in the comments area or anywhere else.
        await expect(stranger.page.getByText(/API error/)).toHaveCount(0)
        await stranger.context.close()
    })

    test('an invited account can reserve', async ({ browser, request }) => {
        await createUser(request, 'Owner')
        const list = await createWishlist(request, 'Private invited list', false)
        await createWish(request, list.id, 'Rug', 80)

        const guest = await newPerson(browser, 'Invited')
        await api(request, 'post', '/api/wishlist/share', { wishlistId: list.id, email: guest.user.email })

        await guest.page.goto(`/en/wishlist/${list.id}`)
        await guest.page.getByRole('button', { name: 'Reserve', exact: true }).click()
        await expect(guest.page.getByText('Reserved by you')).toBeVisible()
        await guest.context.close()
    })
})
