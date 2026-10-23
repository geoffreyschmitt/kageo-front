import { createTranslator } from 'next-intl'

import en from '@/shared/i18n/messages/en.json'
import fr from '@/shared/i18n/messages/fr.json'

import { escapeHtml } from './escapeHtml'
import type { TMail } from './transport'

export type TResetEmailInput = { locale: 'fr' | 'en'; to: string; url: string }

const MESSAGES = { en, fr }

// Transactional: sent because someone asked for it on the forgot-password page.
export const renderResetEmail = ({ locale, to, url }: TResetEmailInput): TMail => {
    const t = createTranslator({ locale, messages: MESSAGES[locale], namespace: 'resetEmail' })
    const subject = t('subject')

    const plain = [t('heading'), '', t('intro'), '', `${t('button')}: ${url}`, '', t('ignore')].join('\n')

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
<h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;font-weight:600;">${escapeHtml(t('heading'))}</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.5;">${escapeHtml(t('intro'))}</p>
<p style="margin:0 0 20px;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:13px 22px;background:#3f6845;color:#ffffff;text-decoration:none;border-radius:10px;font-size:16px;font-weight:600;">${escapeHtml(t('button'))}</a></p>
<p style="margin:0 0 24px;font-size:13px;color:#5b5b5b;word-break:break-all;">${escapeHtml(t('linkFallback'))} <a href="${escapeHtml(url)}" style="color:#3f6845;">${escapeHtml(url)}</a></p>
<p style="margin:0;font-size:12px;line-height:1.5;color:#7a7a7a;">${escapeHtml(t('ignore'))}</p>
</div>
</body>
</html>`

    return { to, subject, html: body, text: plain }
}
