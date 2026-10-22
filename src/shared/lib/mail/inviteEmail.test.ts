import { describe, expect, it } from 'vitest'

import { renderInviteEmail, type TInviteEmailInput } from './inviteEmail'

const base: TInviteEmailInput = {
    locale: 'en',
    to: 'friend@x.io',
    listName: "Maya's 30th",
    ownerName: 'Maya',
    eventDate: '2026-12-24',
    description: 'Come celebrate with us',
    wishCount: 3,
    url: 'https://kageo.app/en/wishlist/abc',
}

describe('renderInviteEmail', () => {
    it('renders the subject, recap and link in English', () => {
        const mail = renderInviteEmail(base)

        expect(mail.to).toBe('friend@x.io')
        expect(mail.subject).toBe("You've been invited to a wishlist on Kageo: Maya's 30th")
        expect(mail.html).toContain('href="https://kageo.app/en/wishlist/abc"')
        expect(mail.html).toContain('Maya invited you to a wishlist')
        expect(mail.html).toContain('December 24, 2026')
        expect(mail.html).toContain('3 wishes')
        expect(mail.html).toContain('Open the wishlist')
        expect(mail.text).toContain('https://kageo.app/en/wishlist/abc')
        expect(mail.text).toContain('Open the wishlist')
        expect(mail.text).toContain('3 wishes')
    })

    it('uses the singular for one wish', () => {
        expect(renderInviteEmail({ ...base, wishCount: 1 }).html).toContain('1 wish')
        expect(renderInviteEmail({ ...base, wishCount: 1 }).html).not.toContain('1 wishes')
    })

    it('renders in French', () => {
        const mail = renderInviteEmail({ ...base, locale: 'fr', url: 'https://kageo.app/fr/wishlist/abc' })

        expect(mail.subject).toBe("Vous êtes invité·e à une wishlist sur Kageo : Maya's 30th")
        expect(mail.html).toContain('Maya vous invite à une wishlist')
        expect(mail.html).toContain('24 décembre 2026')
        expect(mail.html).toContain('3 souhaits')
        expect(mail.html).toContain('Ouvrir la wishlist')
    })

    it('tells the recipient why they got it, naming their address', () => {
        const mail = renderInviteEmail(base)
        expect(mail.html).toContain('Maya invited friend@x.io on Kageo')
        expect(mail.text).toContain('Maya invited friend@x.io on Kageo')
    })

    it('says nothing about reservations, pots or comments', () => {
        const mail = renderInviteEmail(base)
        expect(mail.html).not.toMatch(/reserv|\bpot\b|comment/i)
        expect(mail.text).not.toMatch(/reserv|\bpot\b|comment/i)
    })

    it('escapes HTML in the names and the description', () => {
        const mail = renderInviteEmail({
            ...base,
            listName: '<script>alert(1)</script> & "x"',
            ownerName: '<b>Eve</b>',
            description: '<img src=x onerror=alert(1)>',
        })

        expect(mail.html).not.toContain('<script>')
        expect(mail.html).not.toContain('<b>Eve')
        expect(mail.html).not.toContain('<img')
        expect(mail.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;x&quot;')
    })

    it('strips line breaks from the subject so a name cannot inject a header', () => {
        const mail = renderInviteEmail({ ...base, listName: 'A\r\nBcc: x@y.z' })
        expect(mail.subject).not.toMatch(/[\r\n]/)
        expect(mail.subject).toContain('A Bcc: x@y.z')
    })

    it('shortens a long description', () => {
        const mail = renderInviteEmail({ ...base, description: 'word '.repeat(80) })
        expect(mail.html).toContain('…')
        expect(mail.html.length).toBeLessThan(6000)
        expect(mail.html).not.toContain('word '.repeat(60))
    })

    it('leaves the description out when there is none', () => {
        const mail = renderInviteEmail({ ...base, description: undefined })
        expect(mail.html).not.toContain('Come celebrate')
    })
})
