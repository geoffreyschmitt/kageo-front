import { describe, expect, it } from 'vitest'

import { renderResetEmail } from './resetEmail'

const url = 'https://kageo.app/en/reset-password?token=abc_DEF-123'

describe('renderResetEmail', () => {
    it('renders the button, a plain-text link and the ignore note in English', () => {
        const mail = renderResetEmail({ locale: 'en', to: 'ann@x.io', url })

        expect(mail.to).toBe('ann@x.io')
        expect(mail.subject).toBe('Reset your Kageo password')
        expect(mail.html).toContain(`href="${url}"`)
        expect(mail.html).toContain('Choose a new password')
        expect(mail.text).toContain(url)
        expect(mail.text).toContain('you can ignore this email')
    })

    it('renders in French', () => {
        const mail = renderResetEmail({ locale: 'fr', to: 'ann@x.io', url })

        expect(mail.subject).toBe('Réinitialisez votre mot de passe Kageo')
        expect(mail.html).toContain('<html lang="fr">')
        expect(mail.text).toContain('ignorez cet e-mail')
    })

    it('escapes the link in the HTML', () => {
        const mail = renderResetEmail({ locale: 'en', to: 'ann@x.io', url: 'https://x.io/?a=1&b="2"' })

        expect(mail.html).toContain('a=1&amp;b=&quot;2&quot;')
        expect(mail.html).not.toContain('b="2"')
    })
})
