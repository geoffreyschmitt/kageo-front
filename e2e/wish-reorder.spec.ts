import { expect, test, type Page } from '@playwright/test'

import { createWish, createWishlist, newPerson } from './helpers'

// The order of the wish cards on the page, as wish ids (card titles can repeat in tests, ids cannot).
const cardIds = (page: Page) => page.locator('[data-id]').evaluateAll((els) => els.map((el) => el.getAttribute('data-id')))

const row = (page: Page, name: string) => page.getByRole('listitem').filter({ hasText: name })

// Alpha, Bravo, Charlie are created in that order, so the default (newest first) is C, B, A.
const setup = async (browser: Parameters<typeof newPerson>[0]) => {
    const owner = await newPerson(browser, 'Owner')
    const list = await createWishlist(owner.context.request, 'Reorder list')
    const a = await createWish(owner.context.request, list.id, 'Alpha')
    const b = await createWish(owner.context.request, list.id, 'Bravo')
    const c = await createWish(owner.context.request, list.id, 'Charlie')
    await owner.page.goto(`/en/wishlist/${list.id}`)
    return { ...owner, list, a: a.id, b: b.id, c: c.id }
}

test('the owner moves a wish to the top, it persists, and guests see the same order', async ({ browser }) => {
    const { context, page, list, a, b, c } = await setup(browser)
    expect(await cardIds(page)).toEqual([c, b, a])

    await page.getByRole('button', { name: 'Reorder' }).click()
    await row(page, 'Alpha').getByRole('button', { name: 'Move to top' }).click()
    await page.getByRole('button', { name: 'Done' }).click()

    await expect(page.getByRole('button', { name: 'Reorder' })).toBeVisible()
    expect(await cardIds(page)).toEqual([a, c, b])

    await page.reload()
    expect(await cardIds(page)).toEqual([a, c, b])

    const guestContext = await browser.newContext()
    const guest = await guestContext.newPage()
    await guest.goto(`/en/wishlist/${list.id}`)
    await expect(guest.getByRole('heading', { name: 'Reorder list' })).toBeVisible()
    expect(await cardIds(guest)).toEqual([a, c, b])
    await expect(guest.getByRole('button', { name: 'Reorder' })).toHaveCount(0)
    await expect(guest.locator('select').first()).toHaveValue('manual')

    // A guest who sorts another way and clears the filters gets the owner's order back.
    await guest.locator('select').first().selectOption('price-asc')
    await guest.getByRole('button', { name: 'Clear', exact: true }).click()
    await expect(guest.locator('select').first()).toHaveValue('manual')
    expect(await cardIds(guest)).toEqual([a, c, b])

    await guestContext.close()
    await context.close()
})

test('the owner can reorder with the keyboard', async ({ browser }) => {
    const { context, page, a, b, c } = await setup(browser)

    await page.getByRole('button', { name: 'Reorder' }).click()
    const handle = page.getByRole('button', { name: 'Move Charlie' })
    await handle.focus()
    // dnd-kit attaches its keyboard listeners a tick after the drag starts and measures the drop
    // target after each move, so each key needs a beat before the next.
    await page.keyboard.press('Space')
    await page.waitForTimeout(150)
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(150)
    await page.keyboard.press('Space')
    await page.waitForTimeout(150)
    await page.getByRole('button', { name: 'Done' }).click()

    await expect(page.getByRole('button', { name: 'Reorder' })).toBeVisible()
    await page.reload()
    expect(await cardIds(page)).toEqual([b, c, a])
    await context.close()
})

test('the owner can drag a row with the mouse', async ({ browser }) => {
    const { context, page, a, b, c } = await setup(browser)

    await page.getByRole('button', { name: 'Reorder' }).click()
    // Drag Alpha (last row) above Charlie (first row).
    const from = (await page.getByRole('button', { name: 'Move Alpha' }).boundingBox())!
    const to = (await page.getByRole('button', { name: 'Move Charlie' }).boundingBox())!
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
    await page.mouse.down()
    await page.mouse.move(from.x + from.width / 2, from.y - 10, { steps: 5 })
    await page.mouse.move(to.x + to.width / 2, to.y - 4, { steps: 15 })
    await page.mouse.up()
    // dnd-kit swallows the click that directly follows a pointer drag; a person takes longer than this.
    await page.waitForTimeout(250)
    await page.getByRole('button', { name: 'Done' }).click()

    await expect(page.getByRole('button', { name: 'Reorder' })).toBeVisible()
    await page.reload()
    expect(await cardIds(page)).toEqual([a, c, b])
    await context.close()
})

test('Cancel discards the draft', async ({ browser }) => {
    const { context, page, a, b, c } = await setup(browser)

    await page.getByRole('button', { name: 'Reorder' }).click()
    await row(page, 'Alpha').getByRole('button', { name: 'Move to top' }).click()
    await page.getByRole('button', { name: 'Cancel' }).click()

    expect(await cardIds(page)).toEqual([c, b, a])
    await page.reload()
    expect(await cardIds(page)).toEqual([c, b, a])
    await context.close()
})

test('a failed save rolls back to the previous order and says so', async ({ browser }) => {
    const { context, page, a, b, c } = await setup(browser)
    await page.route('**/api/wishlist/*/order', (route) =>
        route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'boom' }) }),
    )

    await page.getByRole('button', { name: 'Reorder' }).click()
    await row(page, 'Alpha').getByRole('button', { name: 'Move to top' }).click()
    await page.getByRole('button', { name: 'Done' }).click()

    await expect(page.getByText("Couldn't save the order")).toBeVisible()
    expect(await cardIds(page)).toEqual([c, b, a])
    await context.close()
})
