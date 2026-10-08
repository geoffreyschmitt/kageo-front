// A tiny in-memory stand-in for the subset of @vercel/kv that the route handlers use.
// Values are stored as given (like Upstash, objects round-trip through JSON).
type TValue = unknown

type TFakeKvOptions = {
    // Every call takes one event-loop tick, so concurrent handlers interleave at each await
    // (as real network round-trips do) and read-modify-write races show up deterministically.
    // multi().exec() stays atomic, like MULTI/EXEC.
    latency?: boolean
}

export const createFakeKv = ({ latency = false }: TFakeKvOptions = {}) => {
    const strings = new Map<string, TValue>()
    const sets = new Map<string, Set<string>>()
    const lists = new Map<string, string[]>()

    const clone = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)))
    const globToRegex = (glob: string) =>
        new RegExp('^' + glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$')

    const rawOps = {
        get: async (key: string) => (strings.has(key) ? clone(strings.get(key)) : null),
        mget: async (...keys: string[]) => keys.map((k) => (strings.has(k) ? clone(strings.get(k)) : null)),
        set: async (key: string, value: TValue, opts?: { nx?: boolean }) => {
            if (opts?.nx && strings.has(key)) return null
            strings.set(key, clone(value))
            return 'OK'
        },
        del: async (...keys: string[]) => {
            let n = 0
            for (const k of keys) {
                if (strings.delete(k)) n++
                if (sets.delete(k)) n++
                if (lists.delete(k)) n++
            }
            return n
        },
        sadd: async (key: string, ...members: string[]) => {
            const s = sets.get(key) ?? new Set<string>()
            members.forEach((m) => s.add(m))
            sets.set(key, s)
            return members.length
        },
        srem: async (key: string, ...members: string[]) => {
            const s = sets.get(key)
            if (!s) return 0
            members.forEach((m) => s.delete(m))
            if (s.size === 0) sets.delete(key)
            return members.length
        },
        smembers: async (key: string) => [...(sets.get(key) ?? [])],
        scard: async (key: string) => sets.get(key)?.size ?? 0,
        sismember: async (key: string, member: string) => (sets.get(key)?.has(member) ? 1 : 0),
        rpush: async (key: string, ...items: string[]) => {
            const l = lists.get(key) ?? []
            l.push(...items.map((i) => (typeof i === 'string' ? i : JSON.stringify(i))))
            lists.set(key, l)
            return l.length
        },
        lpush: async (key: string, ...items: string[]) => {
            const l = lists.get(key) ?? []
            l.unshift(...items)
            lists.set(key, l)
            return l.length
        },
        llen: async (key: string) => lists.get(key)?.length ?? 0,
        lrange: async (key: string, start: number, stop: number) => {
            const l = lists.get(key) ?? []
            return l.slice(start, stop === -1 ? undefined : stop + 1)
        },
        scan: async (_cursor: number | string, opts?: { match?: string }) => {
            const re = opts?.match ? globToRegex(opts.match) : /.*/
            const all = [...strings.keys(), ...sets.keys(), ...lists.keys()]
            return ['0', all.filter((k) => re.test(k))] as [string, string[]]
        },
    }

    const tick = () => new Promise<void>((resolve) => setImmediate(resolve))
    const ops = latency
        ? (Object.fromEntries(
              Object.entries(rawOps).map(([name, fn]) => [
                  name,
                  async (...args: unknown[]) => {
                      await tick()
                      return (fn as unknown as (...a: unknown[]) => Promise<unknown>)(...args)
                  },
              ]),
          ) as typeof rawOps)
        : rawOps

    // Records commands and applies them together on exec(), like MULTI/EXEC.
    const multi = () => {
        const queue: (() => Promise<unknown>)[] = []
        const tx: Record<string, unknown> = {}
        for (const name of Object.keys(rawOps) as (keyof typeof rawOps)[]) {
            tx[name] = (...args: unknown[]) => {
                queue.push(() => (rawOps[name] as (...a: unknown[]) => Promise<unknown>)(...args))
                return tx
            }
        }
        tx.exec = async () => {
            if (latency) await tick()
            const results: unknown[] = []
            for (const run of queue) results.push(await run())
            return results
        }
        return tx
    }

    return {
        ...ops,
        multi,
        // test helpers
        keys: () => [...strings.keys(), ...sets.keys(), ...lists.keys()].sort(),
        has: (key: string) => strings.has(key) || sets.has(key) || lists.has(key),
        list: (key: string) => (lists.get(key) ?? []).map((i) => JSON.parse(i)),
        members: (key: string) => [...(sets.get(key) ?? [])],
    }
}

export type TFakeKv = ReturnType<typeof createFakeKv>
