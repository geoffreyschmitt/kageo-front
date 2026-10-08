// Dumps every key in the KV store to a JSON file, or restores such a dump.
//
//   node --env-file=.env.local scripts/kv-backup.mjs backup [file]
//   node --env-file=.env.local scripts/kv-backup.mjs restore <file> [--flush]
//
// The default file is backups/kv-<timestamp>.json. The dump contains personal data and
// password hashes: it is git-ignored, keep it private. `restore` overwrites keys that
// exist in the dump; with --flush it first deletes every key not in the dump.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

import { kv } from '@vercel/kv'

const [command, fileArg] = process.argv.slice(2)
const flush = process.argv.includes('--flush')

const scanAll = async () => {
    const keys = new Set()
    let cursor = 0
    do {
        const [next, batch] = await kv.scan(cursor, { count: 1000 })
        for (const key of batch) keys.add(key)
        cursor = next
    } while (String(cursor) !== '0')
    return [...keys].sort()
}

const backup = async () => {
    const file = fileArg ?? `backups/kv-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    const dump = {}
    for (const key of await scanAll()) {
        // Locks are transient (10 s TTL); a restored one would have no TTL and block its record.
        if (key.startsWith('lock:')) continue
        const type = await kv.type(key)
        if (type === 'string') dump[key] = { type, value: await kv.get(key) }
        else if (type === 'set') dump[key] = { type, value: await kv.smembers(key) }
        else if (type === 'list') dump[key] = { type, value: await kv.lrange(key, 0, -1) }
        else console.warn(`Skipping ${key}: unsupported type "${type}"`)
    }
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, JSON.stringify({ createdAt: new Date().toISOString(), keys: dump }, null, 2))
    console.log(`Backed up ${Object.keys(dump).length} keys to ${file}`)
}

const restore = async () => {
    if (!fileArg) throw new Error('Usage: restore <file> [--flush]')
    const { keys: dump } = JSON.parse(readFileSync(fileArg, 'utf8'))

    if (flush) {
        const stale = (await scanAll()).filter((key) => !(key in dump))
        for (const key of stale) await kv.del(key)
        console.log(`Deleted ${stale.length} key(s) not present in the dump`)
    }

    for (const [key, { type, value }] of Object.entries(dump)) {
        await kv.del(key)
        if (type === 'string') await kv.set(key, value)
        else if (type === 'set' && value.length) await kv.sadd(key, ...value)
        else if (type === 'list' && value.length) {
            await kv.rpush(key, ...value.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))))
        }
    }
    console.log(`Restored ${Object.keys(dump).length} keys from ${fileArg}`)
}

if (command === 'backup') await backup()
else if (command === 'restore') await restore()
else {
    console.error('Usage: kv-backup.mjs backup [file] | restore <file> [--flush]')
    process.exit(1)
}
