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

        // Retried as a whole: in dev a click can land before React has hydrated the page, and each
        // attempt is harmless (the answer is the same 403).
        await expect(async () => {
            await stranger.page.getByRole('button', { name: 'Reserve', exact: true }).click()
            await expect(stranger.page.getByText(/This list is private/)).toBeVisible({ timeout: 2500 })
        }).toPass({ timeout: 15000 })
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

test.describe('inviting by email from the Share dialog', () => {
    const openShare = async (path: string, listName: string, request: Parameters<typeof createWishlist>[0]) => {
        const list = await createWishlist(request, listName, false)
        return { list, path: `${path}/wishlist/${list.id}` }
    }

    test('the owner invites an address and sees the success message, then "already invited"', async ({ browser }) => {
        const owner = await newPerson(browser, 'Owner')
        const { path } = await openShare('/en', 'Share dialog list', owner.context.request)
        await owner.page.goto(path)

        await owner.page.getByRole('button', { name: 'Share', exact: true }).click()
        await owner.page.getByPlaceholder("Enter recipient's email address").fill('new-friend@e2e.test')
        await owner.page.getByRole('button', { name: 'Send Email' }).click()
        await expect(owner.page.getByText('Email sent successfully!')).toBeVisible()

        await owner.page.getByPlaceholder("Enter recipient's email address").fill('new-friend@e2e.test')
        await owner.page.getByRole('button', { name: 'Send Email' }).click()
        await expect(owner.page.getByText('This person is already invited.')).toBeVisible()
        await owner.context.close()
    })

    test('a malformed address shows the French validation message on the French page', async ({ browser }) => {
        const owner = await newPerson(browser, 'Owner')
        const { path } = await openShare('/fr', 'Liste à partager', owner.context.request)
        await owner.page.goto(path)

        await owner.page.getByRole('button', { name: 'Partager', exact: true }).click()
        // "a@b" passes the browser's own email check but not ours (no dot in the domain).
        await owner.page.getByPlaceholder("Entrez l'adresse e-mail du destinataire").fill('a@b')
        await owner.page.getByRole('button', { name: 'Envoyer', exact: true }).click()
        await expect(owner.page.getByText('Veuillez saisir une adresse e-mail valide.')).toBeVisible()
        await owner.context.close()
    })
})
