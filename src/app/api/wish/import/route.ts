import { NextRequest, NextResponse } from 'next/server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/shared/config/authOptions'
import { extractWishFields, type TImportedFields } from '@/shared/lib/extractWishFields'
import { fetchHtml } from '@/shared/lib/fetchHtml'
import { limitWrite } from '@/shared/lib/rateLimit'

export const runtime = 'nodejs'

const MAX_URL_LENGTH = 2048

const notFound = () => NextResponse.json({ found: false, fields: {} as TImportedFields })

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const limited = await limitWrite(request, session.user.id, 'import')
    if (limited) return limited

    let url: unknown
    try {
        url = ((await request.json()) as { url?: unknown } | null)?.url
    } catch {
        url = undefined
    }
    if (typeof url !== 'string' || !url || url.length > MAX_URL_LENGTH) {
        return NextResponse.json({ message: 'A valid url is required' }, { status: 400 })
    }
    let parsed: URL
    try {
        parsed = new URL(url)
    } catch {
        return NextResponse.json({ message: 'A valid url is required' }, { status: 400 })
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return NextResponse.json({ message: 'Only http(s) urls are supported' }, { status: 400 })
    }

    try {
        const page = await fetchHtml(url)
        if (!page) return notFound()
        const fields = extractWishFields(page.html, page.finalUrl)
        if (Object.keys(fields).length === 0) return notFound()
        return NextResponse.json({ found: true, fields })
    } catch {
        return notFound()
    }
}
