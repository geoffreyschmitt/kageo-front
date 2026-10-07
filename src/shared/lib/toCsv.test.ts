import { describe, expect, it } from 'vitest'

import { toCsv } from './toCsv'

const body = (csv: string) => csv.replace('﻿', '')

describe('toCsv', () => {
    it('starts with a BOM and uses CRLF line endings', () => {
        const csv = toCsv(['a', 'b'], [['x', 1]])
        expect(csv.startsWith('﻿')).toBe(true)
        expect(body(csv)).toBe('a,b\r\nx,1\r\n')
    })

    it('quotes cells containing commas, quotes or newlines', () => {
        expect(body(toCsv(['n'], [['a,b'], ['say "hi"'], ['l1\nl2']]))).toBe(
            'n\r\n"a,b"\r\n"say ""hi"""\r\n"l1\nl2"\r\n',
        )
    })

    it('neutralises spreadsheet formulas in text cells but not in numbers', () => {
        expect(body(toCsv(['n', 'v'], [['=SUM(A1)', -5], ['@cmd', 2]]))).toBe(
            "n,v\r\n'=SUM(A1),-5\r\n'@cmd,2\r\n",
        )
    })
})
