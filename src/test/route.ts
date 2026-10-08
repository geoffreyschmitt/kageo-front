import { AsyncLocalStorage } from 'node:async_hooks'

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

// For concurrency tests: runs `call` as a given user, however long its awaits take.
// signInAs sets one global session, which a handler that waits before reading it (e.g. on a
// lock) would see changed by the next request; this keeps one session per call, like production.
const sessionStore = new AsyncLocalStorage<{ id: string; email: string; name: string }>()

export const runAs = <T>(id: string, call: () => Promise<T>): Promise<T> => {
    vi.mocked(getServerSession).mockImplementation(async () => {
        const user = sessionStore.getStore()
        return (user ? { user } : null) as never
    })
    return sessionStore.run({ id, email: `${id}@x.io`, name: id }, call)
}

export const jsonRequest = (body: unknown, method = 'POST') =>
    new NextRequest('http://localhost/api/test', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })

export const bodyOf = async (res: Response) => (await res.json()) as Record<string, unknown>
