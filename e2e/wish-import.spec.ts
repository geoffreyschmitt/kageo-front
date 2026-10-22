import { expect, test, type Locator, type Page } from '@playwright/test'

import { api, createWishlist, newPerson } from './helpers'

// The real import route refuses to fetch localhost (SSRF protection), so the browser's call
// to it is answered by the test. Everything else (forms, hook, save) is the real app.

const FOUND_MESSAGE = 'Found it, filled in below. Check and change anything.'
const NOT_FOUND_MESSAGE = "Couldn't read this site, fill in by hand."
const QUESTION = 'This link is different. Replace the current info with what the new link gives?'

type TFields = { name?: string; description?: string; price?: number; currency?: string; imageUrl?: string }

const found = (fields: TFields) => ({ json: { found: true, fields } })

const mockImport = async (page: Page, respond: (url: string) => Promise<object> | object) => {
    const requested: string[] = []
    await page.route('**/api/wish/import', async (route) => {
        const { url } = route.request().postDataJSON() as { url: string }
        requested.push(url)
        await route.fulfill(await respond(url))
    })
    return requested
}

const linkInput = (page: Page) => page.getByLabel('Purchase URL')
const nameInput = (page: Page) => page.locator('input[name="name"]')
const descriptionInput = (page: Page) => page.locator('textarea[name="description"]')
const priceInput = (page: Page) => page.locator('input[name="price"]')
const currencySelect = (page: Page) => page.locator('select[name="currency"]')
const imageInput = (page: Page) => page.locator('input[name="imageUrl"]')

// A real paste event (what the form listens for), followed by the pasted text landing in the field.
const pasteLink = async (input: Locator, url: string) => {
    await input.focus()
    await input.evaluate((el, text) => {
        const clipboardData = new DataTransfer()
        clipboardData.setData('text', text)
        el.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }))
    }, url)
    await input.fill(url)
}

// Typing or filling then leaving the field is the other trigger.
const enterLinkAndLeave = async (input: Locator, url: string) => {
    await input.fill(url)
    await input.blur()
}

const openAddModal = async (page: Page, listId: string) => {
    await page.goto(`/en/wishlist/${listId}`)
    await page.getByRole('button', { name: 'Add Item' }).first().click()
    await expect(linkInput(page)).toBeVisible()
}

test.describe('import a wish from a link', () => {
    test('add: a pasted link fills the empty fields and keeps what was typed', async ({ browser }) => {
        const owner = await newPerson(browser, 'Olivia')
        const list = await createWishlist(owner.context.request, 'Birthday')
        const requested = await mockImport(owner.page, () =>
            found({
                name: 'Site title that must not win',
                description: 'A very nice lamp',
                price: 42.5,
                currency: '$',
                imageUrl: 'https://img.example.invalid/lamp.jpg',
            }),
        )
        await openAddModal(owner.page, list.id)

        await nameInput(owner.page).fill('My lamp')
        await pasteLink(linkInput(owner.page), 'https://shop.example.invalid/lamp')

        await expect(owner.page.getByText(FOUND_MESSAGE)).toBeVisible()
        await expect(descriptionInput(owner.page)).toHaveValue('A very nice lamp')
        await expect(priceInput(owner.page)).toHaveValue('42.5')
        await expect(currencySelect(owner.page)).toHaveValue('$')
        await expect(imageInput(owner.page)).toHaveValue('https://img.example.invalid/lamp.jpg')
        await expect(nameInput(owner.page)).toHaveValue('My lamp')
        await expect(owner.page.locator('select[name="priority"]')).toHaveValue('medium')

        // The same link again (leaving the field) does not ask the site a second time.
        await linkInput(owner.page).blur()
        expect(requested).toEqual(['https://shop.example.invalid/lamp'])

        await owner.page.getByRole('button', { name: 'Add Item' }).last().click()
        await expect(owner.page.getByText('My lamp')).toBeVisible()
    })

    test('add: leaving the field with a link also imports, and a link that cannot be read is a quiet note', async ({ browser }) => {
        const owner = await newPerson(browser, 'Olivia')
        const list = await createWishlist(owner.context.request, 'Birthday')
        const requested = await mockImport(owner.page, () => ({ json: { found: false, fields: {} } }))
        await openAddModal(owner.page, list.id)

        await enterLinkAndLeave(linkInput(owner.page), 'https://shop.example.invalid/nothing')
        await expect(owner.page.getByText(NOT_FOUND_MESSAGE)).toBeVisible()
        expect(requested).toHaveLength(1)

        // Fill in by hand and save.
        await nameInput(owner.page).fill('Handmade gift')
        await priceInput(owner.page).fill('15')
        await owner.page.getByRole('button', { name: 'Add Item' }).last().click()
        await expect(owner.page.getByText('Handmade gift')).toBeVisible()
    })

    test('propose: a guest suggesting a wish gets the same help', async ({ browser }) => {
        const owner = await newPerson(browser, 'Olivia')
        const guest = await newPerson(browser, 'Gus')
        const list = await createWishlist(owner.context.request, 'Birthday')
        await mockImport(guest.page, () =>
            found({ description: 'Suggested desc', price: 30, currency: '£', imageUrl: 'https://img.example.invalid/s.jpg' }),
        )

        await guest.page.goto(`/en/wishlist/${list.id}`)
        await guest.page.getByRole('button', { name: 'Suggest a Wish' }).first().click()
        await expect(linkInput(guest.page)).toBeVisible()

        await nameInput(guest.page).fill('Gus idea')
        await pasteLink(linkInput(guest.page), 'https://shop.example.invalid/idea')

        await expect(guest.page.getByText(FOUND_MESSAGE)).toBeVisible()
        await expect(descriptionInput(guest.page)).toHaveValue('Suggested desc')
        await expect(priceInput(guest.page)).toHaveValue('30')
        await expect(currencySelect(guest.page)).toHaveValue('£')
        await expect(imageInput(guest.page)).toHaveValue('https://img.example.invalid/s.jpg')
        await expect(nameInput(guest.page)).toHaveValue('Gus idea')
    })

    test('a slow answer never overwrites a newer one', async ({ browser }) => {
        const owner = await newPerson(browser, 'Olivia')
        const list = await createWishlist(owner.context.request, 'Birthday')
        await mockImport(owner.page, async (url) => {
            if (url.endsWith('/first')) {
                await new Promise((resolve) => setTimeout(resolve, 1000))
                return found({ description: 'FIRST', price: 11 })
            }
            return found({ description: 'SECOND', price: 22 })
        })
        await openAddModal(owner.page, list.id)

        await pasteLink(linkInput(owner.page), 'https://shop.example.invalid/first')
        await pasteLink(linkInput(owner.page), 'https://shop.example.invalid/second')

        await expect(descriptionInput(owner.page)).toHaveValue('SECOND')
        await owner.page.waitForTimeout(1500) // the first answer arrives now and must be dropped
        await expect(descriptionInput(owner.page)).toHaveValue('SECOND')
        await expect(priceInput(owner.page)).toHaveValue('22')
    })

    test('a rate-limit answer shows the notice and the form stays usable', async ({ browser }) => {
        const owner = await newPerson(browser, 'Olivia')
        const list = await createWishlist(owner.context.request, 'Birthday')
        await mockImport(owner.page, () => ({ status: 429, json: { message: 'Too many requests' } }))
        await openAddModal(owner.page, list.id)

        await pasteLink(linkInput(owner.page), 'https://shop.example.invalid/busy')
        await expect(owner.page.getByText('Too many tries, please wait a minute.')).toBeVisible()

        await nameInput(owner.page).fill('By hand')
        await priceInput(owner.page).fill('9')
        await owner.page.getByRole('button', { name: 'Add Item' }).last().click()
        await expect(owner.page.getByText('By hand')).toBeVisible()
    })

    test.describe('edit', () => {
        const setup = async (browser: Parameters<typeof newPerson>[0], respond: () => object) => {
            const owner = await newPerson(browser, 'Olivia')
            const list = await createWishlist(owner.context.request, 'Birthday')
            await api(owner.context.request, 'post', '/api/wish', {
                wishlistId: list.id,
                name: 'Old name',
                description: 'Old description',
                price: 50,
                currency: '€',
                imageUrl: 'https://img.example.invalid/old.jpg',
                purchaseUrl: 'https://shop.example.invalid/old',
                priority: 'high',
            }, 201)
            const requested = await mockImport(owner.page, respond)
            await owner.page.goto(`/en/wishlist/${list.id}`)
            await owner.page.getByRole('button', { name: 'Edit', exact: true }).first().click()
            await expect(linkInput(owner.page)).toHaveValue('https://shop.example.invalid/old')
            return { owner, requested }
        }

        test('changing the link asks first, and Keep leaves everything as it was', async ({ browser }) => {
            const { owner, requested } = await setup(browser, () => found({ description: 'NEW', price: 99 }))

            await enterLinkAndLeave(linkInput(owner.page), 'https://shop.example.invalid/new')
            await expect(owner.page.getByText(QUESTION)).toBeVisible()
            await owner.page.waitForTimeout(500)
            expect(requested).toHaveLength(0) // nothing is fetched until the person answers

            await owner.page.getByRole('button', { name: 'Keep my info' }).click()
            await expect(owner.page.getByText(QUESTION)).toBeHidden()
            expect(requested).toHaveLength(0)
            await expect(descriptionInput(owner.page)).toHaveValue('Old description')
            await expect(priceInput(owner.page)).toHaveValue('50')
            await expect(imageInput(owner.page)).toHaveValue('https://img.example.invalid/old.jpg')
        })

        test('Replace overwrites only what the new link provides', async ({ browser }) => {
            // No image in the answer: the old one must stay.
            const { owner, requested } = await setup(browser, () => found({ description: 'NEW', price: 99, currency: '$' }))

            await enterLinkAndLeave(linkInput(owner.page), 'https://shop.example.invalid/new')
            await expect(owner.page.getByText(QUESTION)).toBeVisible()
            expect(requested).toHaveLength(0)

            await owner.page.getByRole('button', { name: 'Replace', exact: true }).click()
            await expect(owner.page.getByText(FOUND_MESSAGE)).toBeVisible()
            expect(requested).toEqual(['https://shop.example.invalid/new'])
            await expect(descriptionInput(owner.page)).toHaveValue('NEW')
            await expect(priceInput(owner.page)).toHaveValue('99')
            await expect(currencySelect(owner.page)).toHaveValue('$')
            await expect(imageInput(owner.page)).toHaveValue('https://img.example.invalid/old.jpg')
            await expect(nameInput(owner.page)).toHaveValue('Old name')
            await expect(owner.page.locator('select[name="priority"]')).toHaveValue('high')
        })
    })
})
