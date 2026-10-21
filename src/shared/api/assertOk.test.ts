import { describe, expect, it, vi } from 'vitest'

import { eventBus } from '@/shared/eventBus'

import { assertOk } from './assertOk'

describe('assertOk', () => {
    it('resolves for an ok response', async () => {
        await expect(assertOk(new Response('{}', { status: 200 }))).resolves.toBeUndefined()
    })

    it('throws API error with the body text otherwise', async () => {
        await expect(assertOk(new Response('boom', { status: 500 }))).rejects.toThrow('API error 500: boom')
    })

    it('emits ui:rateLimited once and throws on 429', async () => {
        const listener = vi.fn()
        const off = eventBus.on('ui:rateLimited', listener)
        await expect(assertOk(new Response('', { status: 429 }))).rejects.toThrow('API error 429')
        off()
        expect(listener).toHaveBeenCalledTimes(1)
    })
})
