import { expect, test, type Browser, type Page } from '@playwright/test'

import { api, createWishlist, newPerson } from './helpers'

// The real import route refuses to fetch localhost (SSRF protection), so the browser's call
// to it is answered by the test. Everything else (forms, hook, save) is the real app.

const FOUND_MESSAGE = 'Found it, filled in below. Check and change anything.'
const NOT_FOUND_MESSAGE = "Couldn't read this site, fill in by hand."
const MODE_QUESTION = 'Replace the current info, or only fill the empty fields?'
const VERSION_QUESTION = 'We found several versions of this product, which one is yours?'
const LOADING_MESSAGE = 'Looking for the details…'
const GLOBE = 'http://localhost:3100/globe.svg'
const FILE = 'http://localhost:3100/file.svg'
const LINK = 'https://shop.example.invalid/lamp'

type TFields = { name?: string; description?: string; price?: number; currency?: string; imageUrl?: string }
type TVariant = TFields & { label: string }

const found = (fields: TFields, variants?: TVariant[]) => ({ json: { found: true, fields, ...(variants ? { variants } : {}) } })

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
const prioritySelect = (page: Page) => page.locator('select[name="priority"]')
const fillButton = (page: Page) => page.getByRole('button', { name: 'Fill in for me' })
const submitButton = (page: Page) => page.getByRole('button', { name: 'Add Item' }).last()

const openAddModal = async (page: Page, listId: string) => {
    await page.goto(`/en/wishlist/${listId}`)
    await page.getByRole('button', { name: 'Add Item' }).first().click()
    await expect(linkInput(page)).toBeVisible()
}

const openProposeModal = async (page: Page, listId: string) => {
    await page.goto(`/en/wishlist/${listId}`)
    await page.getByRole('button', { name: 'Suggest a Wish' }).first().click()
    await expect(linkInput(page)).toBeVisible()
}

const setupAdd = async (browser: Browser, respond: (url: string) => Promise<object> | object) => {
    const owner = await newPerson(browser, 'Olivia')
    const list = await createWishlist(owner.context.request, 'Birthday')
    const requested = await mockImport(owner.page, respond)
    await openAddModal(owner.page, list.id)
    return { page: owner.page, requested }
}

// "Walnut" is not in the name or description, so choosing it adds it as a label line.
const lampVersions = (): TVariant[] => [
    { label: 'Walnut', name: 'Wooden base', description: 'Solid hardwood base', price: 149.99, currency: '$', imageUrl: FILE },
    { label: 'Oak', name: 'Light base', description: 'Pale hardwood base', price: 179.99, currency: '$', imageUrl: FILE },
]
const lampBase: TFields = { name: 'Desk lamp', description: 'A very nice lamp', imageUrl: GLOBE }

test.describe('import a wish from a link (Fill in for me)', () => {
    test('add: typing or pasting a link asks nothing; the button fills empty fields and keeps a typed name', async ({ browser }) => {
        const { page, requested } = await setupAdd(browser, () =>
            found({ name: 'Site title that must not win', description: 'A very nice lamp', price: 42.5, currency: '$', imageUrl: GLOBE }),
        )

        await nameInput(page).fill('My lamp')
        await linkInput(page).focus()
        await linkInput(page).evaluate((el, text) => {
            const clipboardData = new DataTransfer()
            clipboardData.setData('text', text)
            el.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }))
        }, LINK)
        await linkInput(page).fill(LINK)
        await linkInput(page).blur()
        await expect(fillButton(page)).toBeEnabled()
        expect(requested).toHaveLength(0)

        await fillButton(page).click()
        await expect(page.getByText(FOUND_MESSAGE)).toBeVisible()
        expect(requested).toEqual([LINK])
        await expect(descriptionInput(page)).toHaveValue('A very nice lamp')
        await expect(priceInput(page)).toHaveValue('42.5')
        await expect(currencySelect(page)).toHaveValue('$')
        await expect(imageInput(page)).toHaveValue(GLOBE)
        await expect(nameInput(page)).toHaveValue('My lamp')
        await expect(prioritySelect(page)).toHaveValue('medium')

        await submitButton(page).click()
        await expect(page.getByText('My lamp')).toBeVisible()
    })

    test('add: the button is disabled with no link and while loading, and a double press makes one request', async ({ browser }) => {
        const { page, requested } = await setupAdd(browser, async () => {
            await new Promise((resolve) => setTimeout(resolve, 600))
            return found({ description: 'Slow desc' })
        })

        await expect(fillButton(page)).toBeDisabled()
        await linkInput(page).fill('no link here')
        await expect(fillButton(page)).toBeDisabled()

        await linkInput(page).fill(LINK)
        await expect(fillButton(page)).toBeEnabled()
        // Two clicks in the same tick, before React can disable the button.
        await fillButton(page).evaluate((el: HTMLButtonElement) => {
            el.click()
            el.click()
        })
        await expect(page.getByText(LOADING_MESSAGE)).toBeVisible()
        await expect(fillButton(page)).toBeDisabled()

        await expect(page.getByText(FOUND_MESSAGE)).toBeVisible()
        await expect(descriptionInput(page)).toHaveValue('Slow desc')
        expect(requested).toEqual([LINK])
        await expect(fillButton(page)).toBeEnabled()
    })

    test('add: share text in the field is replaced by the bare link and imported', async ({ browser }) => {
        const { page, requested } = await setupAdd(browser, () => found({ description: 'Shared desc', price: 20 }))

        await linkInput(page).fill(`Regarde ça : ${LINK}.`)
        await expect(fillButton(page)).toBeEnabled()
        await fillButton(page).click()

        await expect(linkInput(page)).toHaveValue(LINK)
        await expect(page.getByText(FOUND_MESSAGE)).toBeVisible()
        await expect(descriptionInput(page)).toHaveValue('Shared desc')
        expect(requested).toEqual([LINK])
    })

    test('add: a link that cannot be read is a quiet note and the form submits by hand', async ({ browser }) => {
        const { page, requested } = await setupAdd(browser, () => ({ json: { found: false, fields: {} } }))

        await linkInput(page).fill('https://shop.example.invalid/nothing')
        await fillButton(page).click()
        await expect(page.getByText(NOT_FOUND_MESSAGE)).toBeVisible()
        expect(requested).toHaveLength(1)

        await nameInput(page).fill('Handmade gift')
        await priceInput(page).fill('15')
        await submitButton(page).click()
        await expect(page.getByText('Handmade gift')).toBeVisible()
    })

    test('propose: a guest suggesting a wish gets the same help', async ({ browser }) => {
        const owner = await newPerson(browser, 'Olivia')
        const guest = await newPerson(browser, 'Gus')
        const list = await createWishlist(owner.context.request, 'Birthday')
        const requested = await mockImport(guest.page, () =>
            found({ name: 'Ignored', description: 'Suggested desc', price: 30, currency: '£', imageUrl: GLOBE }),
        )
        await openProposeModal(guest.page, list.id)

        await nameInput(guest.page).fill('Gus idea')
        await linkInput(guest.page).fill(LINK)
        expect(requested).toHaveLength(0)
        await fillButton(guest.page).click()

        await expect(guest.page.getByText(FOUND_MESSAGE)).toBeVisible()
        expect(requested).toEqual([LINK])
        await expect(descriptionInput(guest.page)).toHaveValue('Suggested desc')
        await expect(priceInput(guest.page)).toHaveValue('30')
        await expect(currencySelect(guest.page)).toHaveValue('£')
        await expect(imageInput(guest.page)).toHaveValue(GLOBE)
        await expect(nameInput(guest.page)).toHaveValue('Gus idea')
    })

    test('add: a rate-limit answer shows the notice and the form stays usable', async ({ browser }) => {
        const { page } = await setupAdd(browser, () => ({ status: 429, json: { message: 'Too many requests' } }))

        await linkInput(page).fill('https://shop.example.invalid/busy')
        await fillButton(page).click()
        await expect(page.getByText('Too many tries, please wait a minute.')).toBeVisible()
        await expect(fillButton(page)).toBeEnabled()

        await nameInput(page).fill('By hand')
        await priceInput(page).fill('9')
        await submitButton(page).click()
        await expect(page.getByText('By hand')).toBeVisible()
    })

    test.describe('versions', () => {
        test('no typed price: the question shows, nothing applies until a version is chosen', async ({ browser }) => {
            const { page, requested } = await setupAdd(browser, () => found(lampBase, lampVersions()))

            await linkInput(page).fill(LINK)
            await fillButton(page).click()
            await expect(page.getByText(VERSION_QUESTION)).toBeVisible()
            await expect(page.getByRole('button', { name: 'Walnut · $149.99' })).toBeVisible()
            await expect(page.getByRole('button', { name: 'Oak · $179.99' })).toBeVisible()
            expect(requested).toHaveLength(1)
            await expect(nameInput(page)).toHaveValue('')
            await expect(descriptionInput(page)).toHaveValue('')
            await expect(priceInput(page)).toHaveValue('')
            await expect(imageInput(page)).toHaveValue('')

            await page.getByRole('button', { name: 'Walnut · $149.99' }).click()
            await expect(page.getByText(FOUND_MESSAGE)).toBeVisible()
            await expect(page.getByText(VERSION_QUESTION)).toBeHidden()
            await expect(nameInput(page)).toHaveValue('Desk lamp Wooden base')
            await expect(priceInput(page)).toHaveValue('149.99')
            await expect(currencySelect(page)).toHaveValue('$')
            await expect(descriptionInput(page)).toHaveValue('Walnut\n\nSolid hardwood base')
            await expect(imageInput(page)).toHaveValue(FILE)
        })

        test('typed price 149 picks the 149.99 version without a question and keeps the price', async ({ browser }) => {
            const { page } = await setupAdd(browser, () => found(lampBase, lampVersions()))

            await priceInput(page).fill('149')
            await linkInput(page).fill(LINK)
            await fillButton(page).click()

            await expect(page.getByText(FOUND_MESSAGE)).toBeVisible()
            await expect(page.getByText(VERSION_QUESTION)).toBeHidden()
            await expect(nameInput(page)).toHaveValue('Desk lamp Wooden base')
            await expect(descriptionInput(page)).toHaveValue('Walnut\n\nSolid hardwood base')
            await expect(imageInput(page)).toHaveValue(FILE)
            await expect(priceInput(page)).toHaveValue('149')
        })

        test('typed price 140 matches no version: no question, only product-level fields applied', async ({ browser }) => {
            const { page } = await setupAdd(browser, () => found(lampBase, lampVersions()))

            await priceInput(page).fill('140')
            await linkInput(page).fill(LINK)
            await fillButton(page).click()

            await expect(page.getByText(FOUND_MESSAGE)).toBeVisible()
            await expect(page.getByText(VERSION_QUESTION)).toBeHidden()
            await expect(nameInput(page)).toHaveValue('Desk lamp')
            await expect(descriptionInput(page)).toHaveValue('A very nice lamp')
            await expect(imageInput(page)).toHaveValue(GLOBE)
            await expect(priceInput(page)).toHaveValue('140')
        })

        test('versions without prices: the question shows and the price stays empty', async ({ browser }) => {
            const { page } = await setupAdd(browser, () =>
                found(lampBase, [
                    { label: 'Walnut', name: 'Wooden base', description: 'Solid hardwood base', imageUrl: FILE },
                    { label: 'Oak', name: 'Light base' },
                ]),
            )

            await linkInput(page).fill(LINK)
            await fillButton(page).click()
            await expect(page.getByText(VERSION_QUESTION)).toBeVisible()
            await expect(page.getByRole('button', { name: 'Walnut', exact: true })).toBeVisible()

            await page.getByRole('button', { name: 'Walnut', exact: true }).click()
            await expect(page.getByText(FOUND_MESSAGE)).toBeVisible()
            await expect(nameInput(page)).toHaveValue('Desk lamp Wooden base')
            await expect(descriptionInput(page)).toHaveValue('Walnut\n\nSolid hardwood base')
            await expect(imageInput(page)).toHaveValue(FILE)
            await expect(priceInput(page)).toHaveValue('')
        })

        test('typing a price while the question shows dismisses it and applies the product-level fields', async ({ browser }) => {
            const { page } = await setupAdd(browser, () => found(lampBase, lampVersions()))

            await linkInput(page).fill(LINK)
            await fillButton(page).click()
            await expect(page.getByText(VERSION_QUESTION)).toBeVisible()

            await priceInput(page).fill('60')
            await expect(page.getByText(VERSION_QUESTION)).toBeHidden()
            await expect(page.getByText(FOUND_MESSAGE)).toBeVisible()
            await expect(nameInput(page)).toHaveValue('Desk lamp')
            await expect(descriptionInput(page)).toHaveValue('A very nice lamp')
            await expect(imageInput(page)).toHaveValue(GLOBE)
            await expect(priceInput(page)).toHaveValue('60')
        })

        test('a version with neither label nor price still gets a readable button', async ({ browser }) => {
            const { page } = await setupAdd(browser, () => found(lampBase, [{ label: '' }, { label: 'Oak', price: 179.99, currency: '$' }]))

            await linkInput(page).fill(LINK)
            await fillButton(page).click()
            await expect(page.getByRole('button', { name: 'Version 1', exact: true })).toBeVisible()
            await expect(page.getByRole('button', { name: 'Oak · $179.99' })).toBeVisible()
        })

        test('Cancel while the question shows drops it: the reopened form has a fresh import state', async ({ browser }) => {
            const { page } = await setupAdd(browser, () => found(lampBase, lampVersions()))

            await linkInput(page).fill(LINK)
            await fillButton(page).click()
            await expect(page.getByText(VERSION_QUESTION)).toBeVisible()

            await page.getByRole('button', { name: 'Cancel' }).click()
            await expect(linkInput(page)).toBeHidden()
            await page.getByRole('button', { name: 'Add Item' }).first().click()
            await expect(linkInput(page)).toBeVisible()
            await expect(page.getByText(VERSION_QUESTION)).toBeHidden()
            await expect(page.getByText(FOUND_MESSAGE)).toBeHidden()
            await expect(page.getByText(LOADING_MESSAGE)).toBeHidden()
            await expect(nameInput(page)).toHaveValue('')
            await expect(descriptionInput(page)).toHaveValue('')
        })

        test('Cancel while the answer is loading: the late answer never fills the reopened form', async ({ browser }) => {
            let answered = false
            const { page } = await setupAdd(browser, async () => {
                await new Promise((resolve) => setTimeout(resolve, 800))
                answered = true
                return found({ name: 'Late name', description: 'Late desc', price: 77, currency: '$', imageUrl: GLOBE })
            })

            await linkInput(page).fill(LINK)
            await fillButton(page).click()
            await expect(page.getByText(LOADING_MESSAGE)).toBeVisible()

            await page.getByRole('button', { name: 'Cancel' }).click()
            await expect(linkInput(page)).toBeHidden()
            await page.getByRole('button', { name: 'Add Item' }).first().click()
            await expect(linkInput(page)).toBeVisible()
            await expect(page.getByText(LOADING_MESSAGE)).toBeHidden()

            await expect.poll(() => answered).toBe(true) // delivered while the form is reopened
            await expect(page.getByText(FOUND_MESSAGE)).toBeHidden()
            await expect(nameInput(page)).toHaveValue('')
            await expect(descriptionInput(page)).toHaveValue('')
            await expect(priceInput(page)).toHaveValue('')
            await expect(imageInput(page)).toHaveValue('')
            await expect(fillButton(page)).toBeEnabled()
        })

        test('changing the link while the question shows dismisses it and applies nothing', async ({ browser }) => {
            const { page } = await setupAdd(browser, () => found(lampBase, lampVersions()))

            await linkInput(page).fill(LINK)
            await fillButton(page).click()
            await expect(page.getByText(VERSION_QUESTION)).toBeVisible()

            await linkInput(page).fill('https://shop.example.invalid/other')
            await expect(page.getByText(VERSION_QUESTION)).toBeHidden()
            await expect(page.getByText(FOUND_MESSAGE)).toBeHidden()
            await expect(nameInput(page)).toHaveValue('')
            await expect(descriptionInput(page)).toHaveValue('')
            await expect(imageInput(page)).toHaveValue('')
            await expect(priceInput(page)).toHaveValue('')
        })
    })

    test('after a saved add, the reopened form is clean and the same link imports again', async ({ browser }) => {
        const { page, requested } = await setupAdd(browser, () => found({ description: 'Again desc', price: 12 }))

        await nameInput(page).fill('First lamp')
        await linkInput(page).fill(LINK)
        await fillButton(page).click()
        await expect(page.getByText(FOUND_MESSAGE)).toBeVisible()
        await submitButton(page).click()
        await expect(page.getByText('First lamp')).toBeVisible()
        await expect(linkInput(page)).toBeHidden()

        await page.getByRole('button', { name: 'Add Item' }).first().click()
        await expect(linkInput(page)).toBeVisible()
        await expect(linkInput(page)).toHaveValue('')
        await expect(page.getByText(FOUND_MESSAGE)).toBeHidden()
        await expect(descriptionInput(page)).toHaveValue('')
        await expect(fillButton(page)).toBeDisabled()

        await linkInput(page).fill(LINK)
        await expect(fillButton(page)).toBeEnabled()
        await fillButton(page).click()
        await expect(page.getByText(FOUND_MESSAGE)).toBeVisible()
        await expect(descriptionInput(page)).toHaveValue('Again desc')
        expect(requested).toEqual([LINK, LINK])
    })

    test('after a saved suggestion, the reopened form is clean and the same link imports again', async ({ browser }) => {
        const owner = await newPerson(browser, 'Olivia')
        const guest = await newPerson(browser, 'Gus')
        const list = await createWishlist(owner.context.request, 'Birthday')
        const requested = await mockImport(guest.page, () => found({ description: 'Again desc', price: 12 }))
        await openProposeModal(guest.page, list.id)

        await nameInput(guest.page).fill('First idea')
        await linkInput(guest.page).fill(LINK)
        await fillButton(guest.page).click()
        await expect(guest.page.getByText(FOUND_MESSAGE)).toBeVisible()
        await submitButton(guest.page).click()
        await expect(linkInput(guest.page)).toBeHidden()

        await guest.page.getByRole('button', { name: 'Suggest a Wish' }).first().click()
        await expect(linkInput(guest.page)).toBeVisible()
        await expect(linkInput(guest.page)).toHaveValue('')
        await expect(guest.page.getByText(FOUND_MESSAGE)).toBeHidden()
        await expect(descriptionInput(guest.page)).toHaveValue('')
        await expect(fillButton(guest.page)).toBeDisabled()

        await linkInput(guest.page).fill(LINK)
        await fillButton(guest.page).click()
        await expect(descriptionInput(guest.page)).toHaveValue('Again desc')
        expect(requested).toEqual([LINK, LINK])
    })

    test.describe('edit', () => {
        const OLD_LINK = 'https://shop.example.invalid/old'

        const setup = async (
            browser: Browser,
            respond: () => Promise<object> | object,
            wish: { description?: string; imageUrl?: string } = { description: 'Old description', imageUrl: FILE },
        ) => {
            const owner = await newPerson(browser, 'Olivia')
            const list = await createWishlist(owner.context.request, 'Birthday')
            await api(owner.context.request, 'post', '/api/wish', {
                wishlistId: list.id,
                name: 'Old name',
                price: 50,
                currency: '€',
                purchaseUrl: OLD_LINK,
                priority: 'high',
                ...wish,
            }, 201)
            const requested = await mockImport(owner.page, respond)
            await owner.page.goto(`/en/wishlist/${list.id}`)
            await owner.page.getByRole('button', { name: 'Edit', exact: true }).first().click()
            await expect(linkInput(owner.page)).toHaveValue(OLD_LINK)
            return { page: owner.page, requested }
        }

        test('Only fill empty keeps the old values and fills just the empty ones', async ({ browser }) => {
            const { page, requested } = await setup(
                browser,
                () => found({ name: 'Other name', description: 'NEW', price: 99, currency: '$', imageUrl: GLOBE }),
                {},
            )

            await fillButton(page).click()
            await expect(page.getByText(MODE_QUESTION)).toBeVisible()
            expect(requested).toHaveLength(0) // nothing is fetched until the person answers

            await page.getByRole('button', { name: 'Only fill empty' }).click()
            await expect(page.getByText(FOUND_MESSAGE)).toBeVisible()
            expect(requested).toEqual([OLD_LINK])
            await expect(descriptionInput(page)).toHaveValue('NEW')
            await expect(imageInput(page)).toHaveValue(GLOBE)
            await expect(nameInput(page)).toHaveValue('Old name')
            await expect(priceInput(page)).toHaveValue('50')
            await expect(currencySelect(page)).toHaveValue('€')
            await expect(prioritySelect(page)).toHaveValue('high')
        })

        test('Replace overwrites only what the page provides', async ({ browser }) => {
            // No image in the answer: the old one must stay.
            const { page, requested } = await setup(browser, () => found({ description: 'NEW', price: 99, currency: '$' }))

            await fillButton(page).click()
            await expect(page.getByText(MODE_QUESTION)).toBeVisible()
            expect(requested).toHaveLength(0)

            await page.getByRole('button', { name: 'Replace', exact: true }).click()
            await expect(page.getByText(FOUND_MESSAGE)).toBeVisible()
            expect(requested).toEqual([OLD_LINK])
            await expect(descriptionInput(page)).toHaveValue('NEW')
            await expect(priceInput(page)).toHaveValue('99')
            await expect(currencySelect(page)).toHaveValue('$')
            await expect(imageInput(page)).toHaveValue(FILE)
            await expect(nameInput(page)).toHaveValue('Old name')
            await expect(prioritySelect(page)).toHaveValue('high')
        })

        test('changing the link while the mode question shows dismisses it with no request', async ({ browser }) => {
            const { page, requested } = await setup(browser, () => found({ description: 'NEW' }))

            await fillButton(page).click()
            await expect(page.getByText(MODE_QUESTION)).toBeVisible()
            await linkInput(page).fill('https://shop.example.invalid/new')
            await expect(page.getByText(MODE_QUESTION)).toBeHidden()
            expect(requested).toHaveLength(0)
            await expect(descriptionInput(page)).toHaveValue('Old description')
        })

        test('changing the link while a Replace is loading drops the late answer', async ({ browser }) => {
            let answered = false
            const { page } = await setup(browser, async () => {
                await new Promise((resolve) => setTimeout(resolve, 800))
                answered = true
                return found({ description: 'NEW', price: 99 })
            })

            await fillButton(page).click()
            await page.getByRole('button', { name: 'Replace', exact: true }).click()
            await expect(page.getByText(LOADING_MESSAGE)).toBeVisible()

            await linkInput(page).fill('https://shop.example.invalid/changed')
            await expect.poll(() => answered).toBe(true) // the late answer has been delivered, and must be dropped
            await expect(page.getByText(FOUND_MESSAGE)).toBeHidden()
            await expect(descriptionInput(page)).toHaveValue('Old description')
            await expect(priceInput(page)).toHaveValue('50')
        })
    })
})
