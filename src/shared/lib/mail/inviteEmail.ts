import { createTranslator } from 'next-intl'

import en from '@/shared/i18n/messages/en.json'
import fr from '@/shared/i18n/messages/fr.json'

import { escapeHtml } from './escapeHtml'
import type { TMail } from './transport'

export type TInviteEmailInput = {
    locale: 'fr' | 'en'
    to: string
    listName: string
    ownerName: string
    eventDate: string
    description?: string
    wishCount: number
    url: string
}

const MESSAGES = { en, fr }
const MAX_DESCRIPTION = 160

// A list or owner name must never be able to add a header or a second line to the subject.
const singleLine = (value: string) => value.replace(/\s*[\r\n]+\s*/g, ' ').trim()

const shorten = (value: string) => {
    const flat = singleLine(value)
    return flat.length > MAX_DESCRIPTION ? `${flat.slice(0, MAX_DESCRIPTION - 1).trimEnd()}…` : flat
}

const formatEventDate = (locale: string, isoDate: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(isoDate))

// The email is transactional: sent because the owner asked for it. No images needed, no tracking.
export const renderInviteEmail = (input: TInviteEmailInput): TMail => {
    const { locale, to, wishCount, url } = input
    const t = createTranslator({ locale, messages: MESSAGES[locale], namespace: 'email' })

    const listName = singleLine(input.listName)
    const ownerName = singleLine(input.ownerName)
    const description = input.description ? shorten(input.description) : ''
    const date = formatEventDate(locale, input.eventDate)

    const subject = t('subject', { listName })

    // Text parts take the raw values; HTML parts take escaped ones.
    const text = (key: Parameters<typeof t>[0], values: Record<string, string | number> = {}) => t(key, values)
    const html = (key: Parameters<typeof t>[0], values: Record<string, string | number> = {}) =>
        t(
            key,
            Object.fromEntries(
                Object.entries(values).map(([k, v]) => [k, typeof v === 'string' ? escapeHtml(v) : v]),
            ),
        )

    const plain = [
        text('heading', { ownerName }),
        '',
        listName,
        text('event', { date }),
        text('wishCount', { count: wishCount }),
        ...(description ? ['', description] : []),
        '',
        `${text('button')}: ${url}`,
        '',
        text('footer', { ownerName, email: to }),
    ].join('\n')

    const body = `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:24px 12px;background:#f7f3ec;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#2b2b2b;">
<div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:14px;padding:28px 24px;">
<p style="margin:0 0 16px;font-size:14px;letter-spacing:.08em;text-transform:uppercase;color:#3f6845;font-weight:600;">Kageo</p>
<h1 style="margin:0 0 20px;font-size:20px;line-height:1.3;font-weight:600;">${html('heading', { ownerName })}</h1>
<div style="margin:0 0 24px;padding:16px;background:#f2ede5;border-radius:10px;">
<p style="margin:0 0 6px;font-size:17px;font-weight:600;">${escapeHtml(listName)}</p>
<p style="margin:0;font-size:14px;color:#5b5b5b;">${html('event', { date })} · ${html('wishCount', { count: wishCount })}</p>${
        description ? `\n<p style="margin:10px 0 0;font-size:14px;color:#2b2b2b;">${escapeHtml(description)}</p>` : ''
    }
</div>
<p style="margin:0 0 20px;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:13px 22px;background:#3f6845;color:#ffffff;text-decoration:none;border-radius:10px;font-size:16px;font-weight:600;">${html('button')}</a></p>
<p style="margin:0 0 24px;font-size:13px;color:#5b5b5b;word-break:break-all;">${html('linkFallback')} <a href="${escapeHtml(url)}" style="color:#3f6845;">${escapeHtml(url)}</a></p>
<p style="margin:0;font-size:12px;line-height:1.5;color:#7a7a7a;">${html('footer', { ownerName, email: to })}</p>
</div>
</body>
</html>`

    return { to, subject, html: body, text: plain }
}
