import { describe, expect, it } from 'vitest'

import { isValidEmailAddress, mailboxKey } from './emailAddress'

describe('isValidEmailAddress', () => {
    it.each(['friend@x.io', 'first.last+tag@sub.example.co.uk', "o'brien@x.io", 'a_b-c@x-y.io'])('accepts %s', (address) => {
        expect(isValidEmailAddress(address)).toBe(true)
    })

    it.each([
        '',
        'not-an-email',
        'a@b',
        '"1"<victim@x.io>',
        'victim@x.io,',
        'victim@x.io;other@x.io',
        'a<b>@x.io',
        'a b@x.io',
        'a@x..io',
        'a@-x.io',
        '@x.io',
        `${'a'.repeat(250)}@x.io`,
    ])('rejects %j', (address) => {
        expect(isValidEmailAddress(address)).toBe(false)
    })
})

describe('mailboxKey', () => {
    it('lower-cases and drops a +tag', () => {
        expect(mailboxKey('Victim+promo@X.io')).toBe('victim@x.io')
    })

    it('drops dots and +tag on Gmail only', () => {
        expect(mailboxKey('v.ictim+x@gmail.com')).toBe('victim@gmail.com')
        expect(mailboxKey('v.ictim@googlemail.com')).toBe('victim@gmail.com')
        expect(mailboxKey('a.b@x.io')).toBe('a.b@x.io')
        expect(mailboxKey('a.b@x.io')).not.toBe(mailboxKey('ab@x.io'))
    })
})
