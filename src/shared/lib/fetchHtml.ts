import { promises as dns } from 'node:dns'
import http from 'node:http'
import https from 'node:https'
import { isIP, type LookupFunction } from 'node:net'

import { isPublicAddress } from './netGuard'

// Server-side fetch of a user-supplied URL (wish import). This is an SSRF boundary:
// every hop is checked (scheme, port, credentials, every resolved address public), and the
// connection is pinned to the address that was checked, so DNS cannot change it in between.

export const MAX_REDIRECTS = 3
export const TIMEOUT_MS = 5000
export const MAX_BYTES = 1_000_000

const USER_AGENT = 'Kageo-LinkPreview/1.0'
const ALLOWED_PORTS = new Set(['', '80', '443']) // '' = the scheme's default (WHATWG drops it)
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])
const HTML_TYPES = new Set(['text/html', 'application/xhtml+xml'])

export type TRawResponse = {
    status: number
    headers: Record<string, string | undefined>
    body: AsyncIterable<Uint8Array>
    destroy: () => void
}

export type TFetchHtmlDeps = {
    resolve: (hostname: string) => Promise<string[]>
    request: (target: { url: URL; address: string; signal: AbortSignal }) => Promise<TRawResponse>
}

type TFetchHtmlResult = { html: string; finalUrl: string }

const bareHost = (url: URL) => url.hostname.replace(/^\[(.*)\]$/, '$1')

const defaultResolve: TFetchHtmlDeps['resolve'] = async (hostname) =>
    (await dns.lookup(hostname, { all: true, verbatim: true })).map(({ address }) => address)

/**
 * Default transport: one GET over node:http/https that connects to `address` (already
 * validated) while `host`/`servername` stay the URL's hostname, so the Host header and TLS
 * certificate validation use the real name. No agent (no pooled sockets), no cookies, no
 * redirects followed here. Exported for its own tests only; callers go through fetchHtml.
 */
export const nodeRequest: TFetchHtmlDeps['request'] = ({ url, address, signal }) =>
    new Promise((resolve, reject) => {
        const family = isIP(address)
        if (family === 0) return reject(new Error('not an IP address'))
        const hostname = bareHost(url)
        const secure = url.protocol === 'https:'
        // Pinned lookup: whatever node asks for, answer with the validated address only.
        const lookup: LookupFunction = (_host, options, callback) => {
            if (options.all) callback(null, [{ address, family }])
            else callback(null, address, family)
        }
        const req = (secure ? https : http).request(
            {
                protocol: url.protocol,
                hostname,
                port: url.port || (secure ? 443 : 80),
                path: `${url.pathname}${url.search}`,
                method: 'GET',
                headers: {
                    'User-Agent': USER_AGENT,
                    Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
                    'Accept-Encoding': 'identity',
                },
                // SNI must be a name, never an IP literal; TLS still validates against `hostname`.
                ...(secure && isIP(hostname) === 0 ? { servername: hostname } : {}),
                lookup,
                agent: false,
                signal,
            },
            (res) => {
                const headers: Record<string, string | undefined> = {}
                for (const [name, value] of Object.entries(res.headers)) {
                    headers[name] = Array.isArray(value) ? value.join(', ') : value
                }
                resolve({
                    status: res.statusCode ?? 0,
                    headers,
                    body: res,
                    destroy: () => {
                        res.destroy()
                        req.destroy()
                    },
                })
            },
        )
        req.on('error', reject)
        req.end()
    })

// Returns the address to connect to, or null if this URL must not be fetched.
const checkUrl = async (url: URL, resolve: TFetchHtmlDeps['resolve']): Promise<string | null> => {
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (url.username || url.password) return null
    if (!ALLOWED_PORTS.has(url.port)) return null
    const host = bareHost(url)
    if (isIP(host)) return isPublicAddress(host) ? host : null
    const name = host.toLowerCase().replace(/\.$/, '')
    if (!name || name === 'localhost' || name.endsWith('.localhost')) return null
    const addresses = await resolve(host)
    if (addresses.length === 0 || !addresses.every(isPublicAddress)) return null
    return addresses[0]
}

const lowerKeys = (headers: TRawResponse['headers']) =>
    Object.fromEntries(Object.entries(headers ?? {}).map(([name, value]) => [name.toLowerCase(), value]))

const mediaType = (contentType: string | undefined) => (contentType ?? '').split(';')[0].trim().toLowerCase()

const decode = (bytes: Uint8Array, contentType: string | undefined) => {
    const label = /charset\s*=\s*"?([^";\s]+)/i.exec(contentType ?? '')?.[1]
    if (label) {
        try {
            return new TextDecoder(label).decode(bytes)
        } catch {
            // Unsupported label: fall through to UTF-8.
        }
    }
    return new TextDecoder('utf-8').decode(bytes)
}

// Reads the whole body, or returns null once it exceeds MAX_BYTES (no truncated pages).
const readCapped = async (body: AsyncIterable<Uint8Array>, signal: AbortSignal): Promise<Uint8Array | null> => {
    const chunks: Uint8Array[] = []
    let total = 0
    for await (const chunk of body) {
        if (signal.aborted) return null
        total += chunk.byteLength
        if (total > MAX_BYTES) return null
        chunks.push(chunk)
    }
    const bytes = new Uint8Array(total)
    let offset = 0
    for (const chunk of chunks) {
        bytes.set(chunk, offset)
        offset += chunk.byteLength
    }
    return bytes
}

const safeDestroy = (response: TRawResponse | null) => {
    try {
        response?.destroy()
    } catch {
        // Nothing useful to do; the caller already gets null.
    }
}

const run = async (
    rawUrl: string,
    { resolve, request }: TFetchHtmlDeps,
    signal: AbortSignal,
    track: (response: TRawResponse) => void,
): Promise<TFetchHtmlResult | null> => {
    let url = new URL(rawUrl)
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        const address = await checkUrl(url, resolve)
        if (address === null || signal.aborted) return null

        const response = await request({ url, address, signal })
        track(response)
        if (signal.aborted) {
            safeDestroy(response) // arrived after the timeout fired
            return null
        }
        const headers = lowerKeys(response.headers)

        if (REDIRECT_STATUSES.has(response.status)) {
            safeDestroy(response)
            const location = headers.location
            if (!location) return null
            url = new URL(location, url) // throws on garbage, which becomes null
            continue
        }
        if (response.status < 200 || response.status > 299 || !HTML_TYPES.has(mediaType(headers['content-type']))) {
            safeDestroy(response)
            return null
        }
        const bytes = await readCapped(response.body, signal)
        safeDestroy(response)
        if (bytes === null) return null
        return { html: decode(bytes, headers['content-type']), finalUrl: url.href }
    }
    return null // more than MAX_REDIRECTS redirects
}

/**
 * Fetches an HTML page from a user-supplied URL under the SSRF rules above. Never throws:
 * any refusal, network error, timeout, oversize body or non-HTML answer gives `null`, with
 * no detail, so nothing about the target leaks to the client.
 */
export const fetchHtml = async (
    rawUrl: string,
    deps: Partial<TFetchHtmlDeps> = {},
): Promise<TFetchHtmlResult | null> => {
    const fullDeps: TFetchHtmlDeps = { resolve: deps.resolve ?? defaultResolve, request: deps.request ?? nodeRequest }
    const controller = new AbortController()
    let current: TRawResponse | null = null
    controller.signal.addEventListener('abort', () => safeDestroy(current), { once: true })
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<null>((resolve) => {
        timer = setTimeout(() => {
            controller.abort()
            resolve(null)
        }, TIMEOUT_MS)
    })
    const work = run(rawUrl, fullDeps, controller.signal, (response) => {
        current = response
    }).catch(() => null)
    try {
        return await Promise.race([work, timeout])
    } catch {
        return null
    } finally {
        clearTimeout(timer)
        controller.abort() // tear down anything still open (e.g. after a timeout)
    }
}
