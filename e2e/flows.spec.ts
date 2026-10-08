import { expect, test, type Page } from '@playwright/test'

import { api, createUser, createWish, createWishlist, newPerson, signIn } from './helpers'

// Every spec uses the English routes so the visible text is stable.

test.describe('accounts', () => {
    test('sign up, log out and log back in through the header modal', async ({ page }) => {
        const email = `ui-${Date.now()}@e2e.test`
        await page.goto('/en')

        await page.getByRole('button', { name: 'Login' }).first().click()
        await page.getByRole('button', { name: 'Sign up' }).click()
        await page.getByLabel('Name').fill('Una')
        await page.getByLabel('Email').fill(email)
        await page.getByLabel('Password').fill('e2e-password-1')
        await page.getByRole('button', { name: 'Sign Up' }).click()
        await expect(page.getByText('Hello, Una')).toBeVisible()

        await page.getByRole('button', { name: 'Logout' }).click()
        await expect(page.getByText('Hello, Una')).toBeHidden()

        await page.getByRole('button', { name: 'Login' }).first().click()
        await page.getByLabel('Email').fill(email)
        await page.getByLabel('Password').fill('wrong-password')
        await page.getByRole('button', { name: 'Login' }).last().click()
        await expect(page.getByText('Invalid credentials')).toBeVisible()

        await page.getByLabel('Password').fill('e2e-password-1')
        await page.getByRole('button', { name: 'Login' }).last().click()
        await expect(page.getByText('Hello, Una')).toBeVisible()
    })

    test('deleting the account ends the session and the credentials stop working', async ({ request }) => {
        const user = await createUser(request, 'Gone')
        expect((await request.delete('/api/user/me')).status()).toBe(200)

        const attempt = await signIn(request, user.email, user.password)
        expect(await attempt.json()).toMatchObject({ url: expect.stringContaining('error=') })
        // Sessions are stateless JWTs, so the cookie still parses; the account behind it is gone.
        expect((await request.get('/api/user/me')).status()).toBe(404)
    })
})

test.describe('wishlists', () => {
    test('a guest sees a public list, reserves a wish, and the reservation sticks', async ({ browser }) => {
        const owner = await newPerson(browser, 'Olivia')
        const guest = await newPerson(browser, 'Gus')
        const list = await createWishlist(owner.context.request, 'Birthday')
        await createWish(owner.context.request, list.id, 'Desk lamp')

        await guest.page.goto(`/en/wishlist/${list.id}`)
        await expect(guest.page.getByText('Desk lamp')).toBeVisible()
        const reserved = guest.page.waitForResponse((r) => r.url().endsWith('/api/wish/reserve'))
        await guest.page.getByRole('button', { name: 'Reserve', exact: true }).click()
        expect((await reserved).status()).toBe(200) // the UI updates optimistically; wait for the server
        await expect(guest.page.getByText('Reserved by you')).toBeVisible()

        await guest.page.reload()
        await expect(guest.page.getByText('Reserved by you')).toBeVisible()

        // Someone else can no longer reserve it.
        const other = await newPerson(browser, 'Otto')
        const wishes = (await (await other.context.request.get(`/api/wishlist/${list.id}`)).json()) as { wishes: { id: string }[] }
        const again = await other.context.request.post('/api/wish/reserve', { data: { wishId: wishes.wishes[0].id } })
        expect(again.status()).toBe(409)
    })

    test('a private list is closed to strangers and open to an invited guest', async ({ browser }) => {
        const owner = await newPerson(browser, 'Olivia')
        const guest = await newPerson(browser, 'Gus')
        const stranger = await newPerson(browser, 'Sam')
        const list = await createWishlist(owner.context.request, 'Secret', false)
        await createWish(owner.context.request, list.id, 'Hidden gift')

        await stranger.page.goto(`/en/wishlist/${list.id}`)
        await expect(stranger.page).not.toHaveURL(/\/wishlist\//)
        await expect(stranger.page.getByText('Hidden gift')).toHaveCount(0)

        await api(owner.context.request, 'post', '/api/wishlist/share', { wishlistId: list.id, email: guest.user.email }, 200)
        await guest.page.goto(`/en/wishlist/${list.id}`)
        await expect(guest.page.getByText('Hidden gift')).toBeVisible()
    })

    test('the owner never sees the pot a guest organises, but guests do', async ({ browser }) => {
        const owner = await newPerson(browser, 'Olivia')
        const guest = await newPerson(browser, 'Gus')
        const friend = await newPerson(browser, 'Fay')
        const list = await createWishlist(owner.context.request, 'Surprise party')
        await createWish(owner.context.request, list.id, 'Speaker')
        await api(owner.context.request, 'post', '/api/wishlist/share', { wishlistId: list.id, email: guest.user.email }, 200)
        await api(guest.context.request, 'post', '/api/wishlist/pot', { wishlistId: list.id }, 201)
        await api(guest.context.request, 'post', '/api/wishlist/contribute', { wishlistId: list.id, amount: 40 }, 200)

        await guest.page.goto(`/en/wishlist/${list.id}`)
        await expect(guest.page.getByText('Pot started by you')).toBeVisible()
        await friend.page.goto(`/en/wishlist/${list.id}`)
        await expect(friend.page.getByText('Organised by Gus')).toBeVisible()

        await owner.page.goto(`/en/wishlist/${list.id}`)
        await expect(owner.page.getByText('Speaker')).toBeVisible()
        for (const text of ['Gift pot', 'Organised by', 'Pot started by', 'pledged']) {
            await expect(owner.page.getByText(text)).toHaveCount(0)
        }

        // The API gives the owner the same answer whether or not a pot exists.
        expect((await owner.context.request.get(`/api/wishlist/pot?wishlistId=${list.id}`)).status()).not.toBe(200)
    })

    test('the organiser deleting their account hands the pot to the biggest pledger', async ({ browser }) => {
        const owner = await newPerson(browser, 'Olivia')
        const organiser = await newPerson(browser, 'Gus')
        const friend = await newPerson(browser, 'Fay')
        const list = await createWishlist(owner.context.request, 'Party')
        for (const person of [organiser, friend]) {
            await api(owner.context.request, 'post', '/api/wishlist/share', { wishlistId: list.id, email: person.user.email }, 200)
        }
        await api(organiser.context.request, 'post', '/api/wishlist/pot', { wishlistId: list.id }, 201)
        await api(friend.context.request, 'post', '/api/wishlist/contribute', { wishlistId: list.id, amount: 25 }, 200)

        expect((await organiser.context.request.delete('/api/user/me')).status()).toBe(200)

        await friend.page.goto(`/en/wishlist/${list.id}`)
        await expect(friend.page.getByText('Pot started by you')).toBeVisible()
        await expect(friend.page.getByText('Organised by Fay')).toHaveCount(0)
    })
})

// The listener is attached on hydration, so keep offering the event until the banner reacts.
const offerInstall = async (page: Page, title: string) => {
    await expect(async () => {
        await page.evaluate(() => window.dispatchEvent(new Event('beforeinstallprompt', { cancelable: true })))
        await expect(page.getByText(title)).toBeVisible({ timeout: 1000 })
    }).toPass({ timeout: 15_000 })
}

test.describe('install prompt', () => {
    test('shows when the browser offers installation, and stays away for a while once dismissed', async ({ page }) => {
        await page.goto('/en')
        await expect(page.getByText('Install Kageo')).toHaveCount(0)

        await offerInstall(page, 'Install Kageo')
        await expect(page.getByRole('button', { name: 'Install', exact: true })).toBeVisible()

        await page.getByRole('button', { name: 'Not now' }).click()
        await expect(page.getByText('Install Kageo')).toBeHidden()

        await page.reload()
        await expect(page.getByRole('button', { name: 'Login' }).first()).toBeVisible() // hydrated
        await page.evaluate(() => window.dispatchEvent(new Event('beforeinstallprompt', { cancelable: true })))
        await expect(page.getByText('Install Kageo')).toHaveCount(0)
    })

    test('is in French on the French site', async ({ page }) => {
        await page.goto('/fr')
        await offerInstall(page, 'Installer Kageo')
    })
})

test.describe('privacy page', () => {
    test('is reachable from the footer, flagged as a draft, and available in French', async ({ page }) => {
        await page.goto('/en')
        await page.getByRole('link', { name: 'Privacy' }).click()
        await expect(page).toHaveURL(/\/en\/privacy$/)
        await expect(page.getByRole('heading', { name: 'Privacy policy', level: 1 })).toBeVisible()
        await expect(page.getByRole('note')).toContainText('draft')
        await expect(page.getByRole('heading', { name: 'Your rights' })).toBeVisible()

        await page.goto('/fr/privacy')
        await expect(page.getByRole('heading', { name: 'Politique de confidentialité', level: 1 })).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Vos droits' })).toBeVisible()
    })
})
