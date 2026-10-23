import { expect, test } from '@playwright/test'

import { createUser, createWish, createWishlist, newPerson } from './helpers'

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
        data: { name: 'Gus', email, password: 'e2e-password-1', acceptTerms: true },
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

test('the placeholder image is served', async ({ request }) => {
    const res = await request.get('/placeholder.svg')
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('image/svg+xml')
})

// Wish actions were hardcoded English; in French they must read French for guest and owner alike.
test('wish action buttons are translated in French', async ({ browser, request }) => {
    await createUser(request, 'Owner')
    const list = await createWishlist(request, 'Liste française')
    await createWish(request, list.id, 'Bouilloire', 45)

    const guest = await newPerson(browser, 'Gus')
    await guest.page.goto(`/fr/wishlist/${list.id}`)
    await guest.page.getByRole('button', { name: 'Réserver', exact: true }).click()
    await expect(guest.page.getByRole('button', { name: 'Annuler la réservation' })).toBeVisible()
    await expect(guest.page.getByRole('button', { name: 'Marquer comme acheté' })).toBeVisible()
    await expect(guest.page.getByRole('button', { name: /Cancel Reservation|Mark Purchased/ })).toHaveCount(0)
    await guest.context.close()

    // The owner's request context is the default page's, so open the list as that same person.
    const owner = await browser.newContext({ storageState: await request.storageState() })
    const ownerPage = await owner.newPage()
    await ownerPage.goto(`/fr/wishlist/${list.id}`)
    await expect(ownerPage.getByRole('button', { name: 'Supprimer', exact: true })).toBeVisible()
    await expect(ownerPage.getByRole('button', { name: 'Remove', exact: true })).toHaveCount(0)
    await owner.close()
})
