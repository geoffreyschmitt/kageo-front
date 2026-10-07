// Spreadsheet apps execute cells that start with these as formulas; neutralise them.
const FORMULA_START = /^[=+\-@\t\r]/

const escapeCell = (value: string | number): string => {
    let text = String(value)
    if (typeof value === 'string' && FORMULA_START.test(text)) text = `'${text}`
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

// RFC 4180 CSV with a UTF-8 BOM so Excel reads accents correctly.
export const toCsv = (header: string[], rows: (string | number)[][]): string =>
    '﻿' + [header, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n') + '\r\n'

export const csvResponse = (body: string, filename: string): Response =>
    new Response(body, {
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'no-store',
        },
    })
