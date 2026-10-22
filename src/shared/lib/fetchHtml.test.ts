import { createServer, type IncomingMessage, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchHtml, MAX_BYTES, MAX_REDIRECTS, nodeRequest, TIMEOUT_MS, type TFetchHtmlDeps, type TRawResponse } from './fetchHtml'

const PUBLIC_IP = '93.184.216.34'
const HTML = '<html><head><title>Hi</title></head><body>ok</body></html>'

const encode = (text: string) => new TextEncoder().encode(text)

async function* chunksOf(...parts: Uint8Array[]) {
    for (const part of parts) yield part
}

const response = (overrides: Partial<TRawResponse> = {}): TRawResponse => ({
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
    body: chunksOf(encode(HTML)),
    destroy: vi.fn(),
    ...overrides,
})

const redirect = (location: string, status = 302): TRawResponse =>
    response({ status, headers: { location }, body: chunksOf() })

const okResolve = vi.fn<TFetchHtmlDeps['resolve']>()
const okRequest = vi.fn<TFetchHtmlDeps['request']>()

const fakeDeps = (requestImpl?: TFetchHtmlDeps['request'], resolveImpl?: TFetchHtmlDeps['resolve']) => {
    okResolve.mockReset().mockImplementation(resolveImpl ?? (async () => [PUBLIC_IP]))
    okRequest.mockReset().mockImplementation(requestImpl ?? (async () => response()))
    return { resolve: okResolve, request: okRequest }
}

afterEach(() => {
    vi.useRealTimers()
})

describe('fetchHtml', () => {
    it('exports the documented limits', () => {
        expect(MAX_REDIRECTS).toBe(3)
        expect(TIMEOUT_MS).toBe(5000)
        expect(MAX_BYTES).toBe(1_000_000)
    })

    it('returns html and finalUrl for a 200 text/html page', async () => {
        const deps = fakeDeps()
        await expect(fetchHtml('https://example.com/item?id=1', deps)).resolves.toEqual({
            html: HTML,
            finalUrl: 'https://example.com/item?id=1',
        })
    })

    it('connects to the validated address, never the hostname', async () => {
        const deps = fakeDeps()
        await fetchHtml('https://shop.example.com/p', deps)
        expect(okResolve).toHaveBeenCalledWith('shop.example.com')
        expect(okRequest).toHaveBeenCalledTimes(1)
        const target = okRequest.mock.calls[0][0]
        expect(target.address).toBe(PUBLIC_IP)
        expect(target.url.hostname).toBe('shop.example.com')
        expect(target.signal).toBeInstanceOf(AbortSignal)
    })

    it('supports IPv6-only hosts', async () => {
        const deps = fakeDeps(undefined, async () => ['2606:4700::6810:85e5'])
        await expect(fetchHtml('https://v6.example.com/', deps)).resolves.not.toBeNull()
        expect(okRequest.mock.calls[0][0].address).toBe('2606:4700::6810:85e5')
    })

    it('accepts a public IPv4 literal without DNS', async () => {
        const deps = fakeDeps()
        await expect(fetchHtml(`http://${PUBLIC_IP}/`, deps)).resolves.not.toBeNull()
        expect(okResolve).not.toHaveBeenCalled()
        expect(okRequest.mock.calls[0][0].address).toBe(PUBLIC_IP)
    })

    it.each([
        'ftp://x.com',
        'file:///etc/passwd',
        'javascript:alert(1)',
        'http://x.com:8080/',
        'https://x.com:8443/',
        'http://user:pw@x.com/',
        'http://user@x.com/',
        'http://localhost/',
        'http://LOCALHOST./',
        'http://app.localhost/',
        'http://127.0.0.1/',
        'http://[::1]/',
        'http://[::ffff:127.0.0.1]/',
        'http://[fe80::1]/',
        'http://2130706433/',
        'http://0x7f.1/',
        'http://169.254.169.254/latest/meta-data',
        'http://10.0.0.1/',
        'http://192.168.1.1/',
        'not a url',
        '',
    ])('refuses %s without making a request', async (url) => {
        const deps = fakeDeps()
        await expect(fetchHtml(url, deps)).resolves.toBeNull()
        expect(okRequest).not.toHaveBeenCalled()
    })

    it('refuses a hostname that resolves to a private address', async () => {
        const deps = fakeDeps(undefined, async () => ['10.0.0.5'])
        await expect(fetchHtml('https://internal.example.com/', deps)).resolves.toBeNull()
        expect(okRequest).not.toHaveBeenCalled()
    })

    it('refuses a hostname with one public and one private address', async () => {
        const deps = fakeDeps(undefined, async () => [PUBLIC_IP, '192.168.0.10'])
        await expect(fetchHtml('https://mixed.example.com/', deps)).resolves.toBeNull()
        expect(okRequest).not.toHaveBeenCalled()
    })

    it('refuses when resolution returns nothing or fails', async () => {
        const empty = fakeDeps(undefined, async () => [])
        await expect(fetchHtml('https://empty.example.com/', empty)).resolves.toBeNull()
        const failing = fakeDeps(undefined, async () => {
            throw new Error('ENOTFOUND')
        })
        await expect(fetchHtml('https://nx.example.com/', failing)).resolves.toBeNull()
        expect(okRequest).not.toHaveBeenCalled()
    })

    it('refuses a redirect to a private IP and does not request it', async () => {
        const deps = fakeDeps(async () => redirect('http://169.254.169.254/latest/meta-data'))
        await expect(fetchHtml('https://example.com/', deps)).resolves.toBeNull()
        expect(okRequest).toHaveBeenCalledTimes(1)
    })

    it('re-resolves on every hop (a rebinding host on the second hop is refused)', async () => {
        let lookups = 0
        const deps = fakeDeps(
            async ({ url }) => (url.pathname === '/' ? redirect('/next') : response()),
            async () => (lookups++ === 0 ? [PUBLIC_IP] : ['127.0.0.1']),
        )
        await expect(fetchHtml('https://rebind.example.com/', deps)).resolves.toBeNull()
        expect(okRequest).toHaveBeenCalledTimes(1)
    })

    it('resolves a relative Location against the current URL and re-runs the checks', async () => {
        const deps = fakeDeps(async ({ url }) => (url.pathname === '/a/b' ? redirect('../c?x=1') : response()))
        await expect(fetchHtml('https://example.com/a/b', deps)).resolves.toEqual({
            html: HTML,
            finalUrl: 'https://example.com/c?x=1',
        })
        expect(okResolve).toHaveBeenCalledTimes(2)
        expect(okRequest.mock.calls[1][0].url.href).toBe('https://example.com/c?x=1')
    })

    it('follows http to https and back, checking each hop', async () => {
        const deps = fakeDeps(async ({ url }) => {
            if (url.href === 'http://example.com/') return redirect('https://secure.example.com/', 301)
            if (url.href === 'https://secure.example.com/') return redirect('http://plain.example.com/end', 307)
            return response()
        })
        await expect(fetchHtml('http://example.com/', deps)).resolves.toEqual({
            html: HTML,
            finalUrl: 'http://plain.example.com/end',
        })
        expect(okResolve.mock.calls.map(([host]) => host)).toEqual([
            'example.com',
            'secure.example.com',
            'plain.example.com',
        ])
    })

    it('refuses a redirect to a non-http scheme or a bad port', async () => {
        const toFile = fakeDeps(async () => redirect('file:///etc/passwd'))
        await expect(fetchHtml('https://example.com/', toFile)).resolves.toBeNull()
        const toPort = fakeDeps(async ({ url }) => (url.port === '' ? redirect('http://example.com:6379/') : response()))
        await expect(fetchHtml('https://example.com/', toPort)).resolves.toBeNull()
        expect(okRequest).toHaveBeenCalledTimes(1)
    })

    it('refuses a redirect with a missing or invalid Location', async () => {
        const missing = fakeDeps(async () => response({ status: 302, headers: {}, body: chunksOf() }))
        await expect(fetchHtml('https://example.com/', missing)).resolves.toBeNull()
        const invalid = fakeDeps(async () => redirect('http://[::1'))
        await expect(fetchHtml('https://example.com/', invalid)).resolves.toBeNull()
    })

    it('follows exactly MAX_REDIRECTS redirects', async () => {
        const deps = fakeDeps(async ({ url }) => {
            const n = Number(url.searchParams.get('n') ?? '0')
            return n < MAX_REDIRECTS ? redirect(`/r?n=${n + 1}`) : response()
        })
        await expect(fetchHtml('https://example.com/r?n=0', deps)).resolves.not.toBeNull()
        expect(okRequest).toHaveBeenCalledTimes(MAX_REDIRECTS + 1)
    })

    it('refuses a redirect chain longer than 3', async () => {
        const deps = fakeDeps(async ({ url }) => {
            const n = Number(url.searchParams.get('n') ?? '0')
            return redirect(`/r?n=${n + 1}`)
        })
        await expect(fetchHtml('https://example.com/r?n=0', deps)).resolves.toBeNull()
        expect(okRequest).toHaveBeenCalledTimes(MAX_REDIRECTS + 1)
    })

    it('destroys each redirect response it does not read', async () => {
        const first = redirect('/next')
        const deps = fakeDeps(async ({ url }) => (url.pathname === '/' ? first : response()))
        await fetchHtml('https://example.com/', deps)
        expect(first.destroy).toHaveBeenCalled()
    })

    it.each([404, 500, 304, 199])('refuses status %i', async (status) => {
        const res = response({ status })
        const deps = fakeDeps(async () => res)
        await expect(fetchHtml('https://example.com/', deps)).resolves.toBeNull()
        expect(res.destroy).toHaveBeenCalled()
    })

    it.each([
        ['application/json', 'application/json'],
        ['missing', undefined],
        ['image/png', 'image/png'],
        ['text/plain', 'text/plain; charset=utf-8'],
    ])('refuses Content-Type %s', async (_label, contentType) => {
        const res = response({ headers: { 'content-type': contentType } })
        const deps = fakeDeps(async () => res)
        await expect(fetchHtml('https://example.com/', deps)).resolves.toBeNull()
        expect(res.destroy).toHaveBeenCalled()
    })

    it('accepts application/xhtml+xml and mixed-case header values', async () => {
        const deps = fakeDeps(async () => response({ headers: { 'Content-Type': 'Application/XHTML+XML' } }))
        await expect(fetchHtml('https://example.com/', deps)).resolves.not.toBeNull()
    })

    it('stops at 1 MB: destroys the response and reads no more chunks', async () => {
        let produced = 0
        async function* huge() {
            while (true) {
                produced++
                yield new Uint8Array(400_000)
            }
        }
        const res = response({ body: huge() })
        const deps = fakeDeps(async () => res)
        await expect(fetchHtml('https://example.com/', deps)).resolves.toBeNull()
        expect(res.destroy).toHaveBeenCalled()
        expect(produced).toBe(3)
    })

    it('accepts a body of exactly MAX_BYTES', async () => {
        const res = response({ body: chunksOf(new Uint8Array(MAX_BYTES).fill(0x61)) })
        const deps = fakeDeps(async () => res)
        const result = await fetchHtml('https://example.com/', deps)
        expect(result?.html.length).toBe(MAX_BYTES)
    })

    it('resolves null at 5 s for a body that never ends, and destroys it', async () => {
        vi.useFakeTimers()
        async function* slow() {
            yield encode('<html>')
            await new Promise(() => {})
        }
        const res = response({ body: slow() })
        const deps = fakeDeps(async () => res)
        let settled = false
        const pending = fetchHtml('https://example.com/', deps).then((value) => {
            settled = true
            return value
        })
        await vi.advanceTimersByTimeAsync(TIMEOUT_MS - 1)
        expect(settled).toBe(false)
        await vi.advanceTimersByTimeAsync(1)
        await expect(pending).resolves.toBeNull()
        expect(res.destroy).toHaveBeenCalled()
        expect(okRequest.mock.calls[0][0].signal.aborted).toBe(true)
    })

    it('one timeout covers DNS and every redirect hop', async () => {
        vi.useFakeTimers()
        const deps = fakeDeps(async ({ url }) => {
            await new Promise((resolve) => setTimeout(resolve, 2000))
            return redirect(`${url.pathname}x`)
        })
        const pending = fetchHtml('https://example.com/', deps)
        await vi.advanceTimersByTimeAsync(TIMEOUT_MS)
        await expect(pending).resolves.toBeNull()
        expect(okRequest).toHaveBeenCalledTimes(3)
    })

    it('resolves null when DNS hangs', async () => {
        vi.useFakeTimers()
        const deps = fakeDeps(undefined, () => new Promise(() => {}))
        const pending = fetchHtml('https://example.com/', deps)
        await vi.advanceTimersByTimeAsync(TIMEOUT_MS)
        await expect(pending).resolves.toBeNull()
        expect(okRequest).not.toHaveBeenCalled()
    })

    it('returns null (never throws) when request or the body stream fails', async () => {
        const rejecting = fakeDeps(async () => {
            throw new Error('ECONNRESET secret detail')
        })
        await expect(fetchHtml('https://example.com/', rejecting)).resolves.toBeNull()
        async function* broken(): AsyncGenerator<Uint8Array> {
            yield encode('<html>')
            throw new Error('socket hang up')
        }
        const failing = fakeDeps(async () => response({ body: broken() }))
        await expect(fetchHtml('https://example.com/', failing)).resolves.toBeNull()
    })

    it('decodes UTF-8 split across chunks', async () => {
        const bytes = encode('<p>café — 10 €</p>')
        const deps = fakeDeps(async () => response({ body: chunksOf(bytes.slice(0, 6), bytes.slice(6)) }))
        await expect(fetchHtml('https://example.com/', deps)).resolves.toMatchObject({ html: '<p>café — 10 €</p>' })
    })

    it('honours a charset parameter TextDecoder supports, and falls back to UTF-8 otherwise', async () => {
        const latin1 = new Uint8Array([0x63, 0x61, 0x66, 0xe9]) // "café" in windows-1252
        const deps = fakeDeps(async () =>
            response({ headers: { 'content-type': 'text/html; charset="ISO-8859-1"' }, body: chunksOf(latin1) }),
        )
        await expect(fetchHtml('https://example.com/', deps)).resolves.toMatchObject({ html: 'café' })

        const unknown = fakeDeps(async () =>
            response({ headers: { 'content-type': 'text/html; charset=x-made-up' }, body: chunksOf(encode('café')) }),
        )
        await expect(fetchHtml('https://example.com/', unknown)).resolves.toMatchObject({ html: 'café' })
    })
})

// The default transport, exercised directly (bypassing the guard, which refuses loopback by
// design) against a local server, to prove the pinned lookup and the streaming plumbing.
describe('nodeRequest', () => {
    let server: Server | null = null

    afterEach(async () => {
        await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()))
        server = null
    })

    const listen = async (handler: (req: IncomingMessage, res: import('node:http').ServerResponse) => void) => {
        server = createServer(handler)
        await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve))
        return (server.address() as AddressInfo).port
    }

    const readAll = async (body: AsyncIterable<Uint8Array>) => {
        const parts: Uint8Array[] = []
        for await (const part of body) parts.push(part)
        return Buffer.concat(parts).toString('utf8')
    }

    it('connects to the pinned address while keeping the hostname in Host', async () => {
        let seen: IncomingMessage | null = null
        const port = await listen((req, res) => {
            seen = req
            res.setHeader('Content-Type', 'text/html')
            res.setHeader('Set-Cookie', ['a=1', 'b=2'])
            res.end('<p>pinned</p>')
        })
        // `pinned.invalid` cannot resolve in DNS (RFC 6761), so success proves the lookup is pinned.
        const raw = await nodeRequest({
            url: new URL(`http://pinned.invalid:${port}/path?q=1`),
            address: '127.0.0.1',
            signal: new AbortController().signal,
        })
        expect(raw.status).toBe(200)
        expect(raw.headers['content-type']).toBe('text/html')
        expect(raw.headers['set-cookie']).toBe('a=1, b=2')
        expect(await readAll(raw.body)).toBe('<p>pinned</p>')
        const request = seen as unknown as IncomingMessage
        expect(request.url).toBe('/path?q=1')
        expect(request.headers.host).toBe(`pinned.invalid:${port}`)
        expect(request.headers['user-agent']).toBe('Kageo-LinkPreview/1.0')
        expect(request.headers.cookie).toBeUndefined()
        expect(request.headers.authorization).toBeUndefined()
    })

    it('does not follow redirects itself', async () => {
        const port = await listen((_req, res) => {
            res.writeHead(302, { Location: 'http://127.0.0.1/elsewhere' })
            res.end()
        })
        const raw = await nodeRequest({
            url: new URL(`http://pinned.invalid:${port}/`),
            address: '127.0.0.1',
            signal: new AbortController().signal,
        })
        expect(raw.status).toBe(302)
        expect(raw.headers.location).toBe('http://127.0.0.1/elsewhere')
        raw.destroy()
    })

    it('destroy() tears down a body that is still streaming', async () => {
        let serverSawClose: () => void = () => {}
        const closed = new Promise<void>((resolve) => (serverSawClose = resolve))
        const port = await listen((req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.write('<html>')
            req.socket.on('close', () => serverSawClose())
        })
        const raw = await nodeRequest({
            url: new URL(`http://pinned.invalid:${port}/`),
            address: '127.0.0.1',
            signal: new AbortController().signal,
        })
        const iterator = raw.body[Symbol.asyncIterator]()
        const first = await iterator.next()
        expect(Buffer.from(first.value as Uint8Array).toString()).toBe('<html>')
        raw.destroy()
        await closed
    })

    it('aborting the signal stops a stalled response', async () => {
        const port = await listen((_req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.write('<html>')
        })
        const controller = new AbortController()
        const raw = await nodeRequest({
            url: new URL(`http://pinned.invalid:${port}/`),
            address: '127.0.0.1',
            signal: controller.signal,
        })
        setTimeout(() => controller.abort(), 20)
        await expect(readAll(raw.body)).rejects.toThrow()
    })
})
