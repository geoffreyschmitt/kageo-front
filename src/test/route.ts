import { NextRequest } from 'next/server'

import { getServerSession } from 'next-auth'
import { vi } from 'vitest'

// Route tests mock `next-auth`, `@/shared/config/authOptions` and `@vercel/kv` themselves
// (vi.mock is hoisted per file); these helpers drive the mocked session and build requests.
export const signInAs = (id: string | null, extra: { email?: string; name?: string } = {}) => {
    vi.mocked(getServerSession).mockResolvedValue(
        id ? ({ user: { id, email: extra.email ?? `${id}@x.io`, name: extra.name ?? id } } as never) : null,
    )
}

export const jsonRequest = (body: unknown, method = 'POST') =>
    new NextRequest('http://localhost/api/test', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })

export const bodyOf = async (res: Response) => (await res.json()) as Record<string, unknown>
