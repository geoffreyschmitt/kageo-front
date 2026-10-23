// Settings the legal pages share. Set in Vercel; see docs/runbook.md.
export const readLegalConfig = () => ({
    contact: process.env.NEXT_PUBLIC_PRIVACY_CONTACT,
    // Lawyer sign-off removes the draft notice from every legal page.
    reviewed: process.env.NEXT_PUBLIC_PRIVACY_REVIEWED === '1',
    publisher: process.env.NEXT_PUBLIC_LEGAL_PUBLISHER,
})
