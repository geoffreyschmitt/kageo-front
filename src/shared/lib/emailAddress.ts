// A conservative single-mailbox address: no spaces, quotes, angle brackets, commas, semicolons,
// brackets or parentheses, so "Name <a@b.co>" or "a@b.co, c@d.co" can never be mistaken for one.
const ADDRESS =
    /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/

export const isValidEmailAddress = (value: string): boolean => value.length <= 254 && ADDRESS.test(value)

// The mailbox an address delivers to, for abuse limits: lower-cased, "+tag" dropped, and dots
// dropped on Gmail, where they do not matter. Never used to decide who is invited.
export const mailboxKey = (address: string): string => {
    const [local, domain = ''] = address.trim().toLowerCase().split('@')
    const untagged = local.split('+')[0] || local
    const isGmail = domain === 'gmail.com' || domain === 'googlemail.com'
    return isGmail ? `${untagged.replace(/\./g, '')}@gmail.com` : `${untagged}@${domain}`
}
