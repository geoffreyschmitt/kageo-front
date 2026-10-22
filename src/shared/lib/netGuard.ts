import { isIP } from 'node:net'

// Reserved / special-use IPv4 blocks: [base address, prefix length].
const BLOCKED_V4: ReadonlyArray<readonly [string, number]> = [
    ['0.0.0.0', 8],
    ['10.0.0.0', 8],
    ['100.64.0.0', 10],
    ['127.0.0.0', 8],
    ['169.254.0.0', 16],
    ['172.16.0.0', 12],
    ['192.0.0.0', 24],
    ['192.0.2.0', 24],
    ['192.168.0.0', 16],
    ['198.18.0.0', 15],
    ['198.51.100.0', 24],
    ['203.0.113.0', 24],
    ['224.0.0.0', 4],
    ['240.0.0.0', 4],
]

// Reserved / special-use IPv6 blocks.
const BLOCKED_V6: ReadonlyArray<readonly [string, number]> = [
    ['::', 128],
    ['::1', 128],
    ['fc00::', 7],
    ['fe80::', 10],
    ['ff00::', 8],
    ['2001:db8::', 32],
]

const parseV4 = (ip: string): number | null => {
    const parts = ip.split('.')
    if (parts.length !== 4) return null
    let value = 0
    for (const part of parts) {
        if (!/^\d{1,3}$/.test(part)) return null
        const n = Number(part)
        if (n > 255) return null
        value = value * 256 + n
    }
    return value
}

// Parses a (validated) IPv6 literal into a 128-bit integer.
const parseV6 = (ip: string): bigint | null => {
    let text = ip.toLowerCase()
    const lastColon = text.lastIndexOf(':')
    const tail = text.slice(lastColon + 1)
    if (tail.includes('.')) {
        const v4 = parseV4(tail)
        if (v4 === null) return null
        const hi = Math.floor(v4 / 65536).toString(16)
        const lo = (v4 % 65536).toString(16)
        text = `${text.slice(0, lastColon + 1)}${hi}:${lo}`
    }
    const halves = text.split('::')
    if (halves.length > 2) return null
    const toGroups = (s: string) => (s === '' ? [] : s.split(':'))
    const head = toGroups(halves[0])
    const rest = halves.length === 2 ? toGroups(halves[1]) : []
    const missing = 8 - head.length - rest.length
    if (halves.length === 2 ? missing < 1 : missing !== 0) return null
    const groups = [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill('0'), ...rest]
    let value = BigInt(0)
    for (const group of groups) {
        if (!/^[0-9a-f]{1,4}$/.test(group)) return null
        value = (value << BigInt(16)) | BigInt(parseInt(group, 16))
    }
    return value
}

const inV4Range = (value: number, base: string, prefix: number): boolean => {
    const size = 2 ** (32 - prefix)
    const start = parseV4(base) as number
    return value >= start && value < start + size
}

const inV6Range = (value: bigint, base: string, prefix: number): boolean => {
    const shift = BigInt(128 - prefix)
    return value >> shift === (parseV6(base) as bigint) >> shift
}

const isPublicV4 = (value: number): boolean =>
    !BLOCKED_V4.some(([base, prefix]) => inV4Range(value, base, prefix))

// Top 96 bits of ::ffff:0:0/96 and 64:ff9b::/96 (value >> 32).
const MAPPED_HIGH96 = BigInt('0xffff')
const NAT64_HIGH96 = BigInt('0x0064ff9b') << BigInt(64)
const LOW_32 = BigInt('0xffffffff')

/**
 * True only for a valid, publicly routable IPv4/IPv6 literal. Anything else
 * (invalid strings, reserved ranges, hostnames) returns false. IPv4-mapped
 * (::ffff:a.b.c.d) and NAT64 (64:ff9b::/96) addresses are judged by their
 * embedded IPv4 address.
 */
export const isPublicAddress = (ip: string): boolean => {
    if (typeof ip !== 'string' || ip.includes('%')) return false
    const family = isIP(ip)
    if (family === 4) {
        const value = parseV4(ip)
        return value !== null && isPublicV4(value)
    }
    if (family === 6) {
        const value = parseV6(ip)
        if (value === null) return false
        const high96 = value >> BigInt(32)
        if (high96 === MAPPED_HIGH96 || high96 === NAT64_HIGH96) {
            return isPublicV4(Number(value & LOW_32))
        }
        return !BLOCKED_V6.some(([base, prefix]) => inV6Range(value, base, prefix))
    }
    return false
}
