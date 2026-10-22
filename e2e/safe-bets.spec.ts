import { expect, test } from '@playwright/test'

import { createWishlist, newPerson } from './helpers'

// The owner curates "safe bet" ideas on their profile; guests see them under each shared list
// and can discuss them, while the owner never sees the section or any counter on their own list.
test('guests see the owner safe bets and can comment; the owner sees nothing', async ({ browser }) => {
    const owner = await newPerson(browser, 'Olivia')
    const guest = await newPerson(browser, 'Gus')
    const list = await createWishlist(owner.context.request, 'Safe bets list')

    // Owner adds the idea through the real editor on the profile page.
    await owner.page.goto('/en/profile')
    await owner.page.getByRole('button', { name: 'Add an idea' }).click()
    await owner.page.getByLabel('Title').fill('Vin rouge')
    await owner.page.getByLabel('Description (optional)').fill('Un bon <b>bordeaux</b>')
    await owner.page.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(owner.page.getByText('Vin rouge')).toBeVisible()

    // A signed-out visitor on a phone sees the section and is prompted to log in to comment.
    const anonContext = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true })
    const anon = await anonContext.newPage()
    await anon.goto(`/en/wishlist/${list.id}`)
    const anonSection = anon.getByRole('region', { name: /happy to receive/i })
    await expect(anonSection.getByText('Vin rouge')).toBeVisible()
    await expect(anonSection.getByText('Un bon <b>bordeaux</b>')).toBeVisible() // plain text, not HTML
    expect(await anon.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    const toggle = anonSection.getByRole('button', { name: /comment/i })
    expect((await toggle.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    await toggle.click()
    await expect(anonSection.getByText('Log in to see and post comments.')).toBeVisible()
    await anonSection.getByRole('button', { name: 'Post comment' }).click()
    await expect(anon.getByRole('button', { name: /log in/i }).last()).toBeVisible()
    await anon.screenshot({ path: 'test-results/safe-bets-375.png', fullPage: true })
    await anonContext.close()

    // A signed-in guest posts a comment and sees it.
    await guest.page.goto(`/en/wishlist/${list.id}`)
    const section = guest.page.getByRole('region', { name: /happy to receive/i })
    await expect(section.getByText('Vin rouge')).toBeVisible()
    await section.getByRole('button', { name: /comment/i }).click()
    await section.getByPlaceholder('Add a comment…').fill('Le Margaux !')
    await section.getByRole('button', { name: 'Post comment' }).click()
    await expect(section.getByText('Le Margaux !')).toBeVisible()
    await expect(section.getByRole('button', { name: /1 comment/i })).toBeVisible()

    // The owner's own list shows neither the section nor a counter.
    await owner.page.goto(`/en/wishlist/${list.id}`)
    await expect(owner.page.getByRole('heading', { name: 'Safe bets list' })).toBeVisible()
    await expect(owner.page.getByRole('region', { name: /happy to receive/i })).toHaveCount(0)
    await expect(owner.page.getByText('Vin rouge')).toHaveCount(0)
})
