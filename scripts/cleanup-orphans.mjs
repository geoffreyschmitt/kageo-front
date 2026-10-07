// Finds (and optionally deletes) orphaned keys left behind by non-atomic writes
// from before deletes ran in transactions.
//
//   node --env-file=.env.local scripts/cleanup-orphans.mjs           # dry run
//   node --env-file=.env.local scripts/cleanup-orphans.mjs --apply   # delete
//
// Back up first (see docs/runbook.md). Key schema: docs/architecture.md.
import { kv } from '@vercel/kv'

const apply = process.argv.includes('--apply')

const scanAll = async () => {
    const keys = new Set()
    let cursor = 0
    do {
        const [next, batch] = await kv.scan(cursor, { count: 1000 })
        for (const key of batch) keys.add(key)
        cursor = next
    } while (String(cursor) !== '0')
    return [...keys]
}

const keys = await scanAll()
const exists = new Set(keys)

const wishlists = new Set()
const wishes = new Set()
for (const key of keys) {
    const wishlist = key.match(/^wishlist:([^:]+)$/)
    if (wishlist) wishlists.add(wishlist[1])
    const wish = key.match(/^wish:([^:]+)$/)
    if (wish) wishes.add(wish[1])
}

const orphans = [] // { key, reason }
const strays = [] // { key, member, op } set members pointing at nothing

for (const key of keys) {
    let m

    if ((m = key.match(/^wishlist:([^:]+):(wishes|invitees|pot|contributions|comments)$/))) {
        if (!wishlists.has(m[1])) orphans.push({ key, reason: 'wishlist is gone' })
    } else if ((m = key.match(/^wish:([^:]+):(pot|contributions|comments)$/))) {
        if (!wishes.has(m[1])) orphans.push({ key, reason: 'wish is gone' })
    } else if ((m = key.match(/^wish:([^:]+)$/))) {
        const wish = await kv.get(key)
        if (!wish?.wishlistId || !wishlists.has(wish.wishlistId)) {
            orphans.push({ key, reason: 'its wishlist is gone' })
        } else if (!(await kv.sismember(`wishlist:${wish.wishlistId}:wishes`, m[1]))) {
            orphans.push({ key, reason: 'not listed in its wishlist' })
        }
    } else if ((m = key.match(/^wishlist:([^:]+)$/))) {
        const wishlist = await kv.get(key)
        if (!wishlist?.ownerId || !exists.has(`user:${wishlist.ownerId}:wishlists`)) {
            orphans.push({ key, reason: 'its owner is gone' })
        } else if (!(await kv.sismember(`user:${wishlist.ownerId}:wishlists`, m[1]))) {
            orphans.push({ key, reason: 'not listed by its owner' })
        }
    } else if ((m = key.match(/^user:id:(.+)$/))) {
        const email = await kv.get(key)
        if (!email || !exists.has(`user:${email}`)) orphans.push({ key, reason: 'user record is gone' })
    } else if (key.startsWith('user:') && key.endsWith(':wishlists')) {
        const id = key.split(':')[1]
        if (!exists.has(`user:id:${id}`)) orphans.push({ key, reason: 'user is gone' })
        else {
            for (const member of (await kv.smembers(key)) ?? []) {
                if (!wishlists.has(member)) strays.push({ key, member })
            }
        }
    } else if ((m = key.match(/^email:(.+):invitedWishlists$/))) {
        for (const member of (await kv.smembers(key)) ?? []) {
            if (!wishlists.has(member)) strays.push({ key, member })
        }
    }
}


for (const { key, reason } of orphans) console.log(`${apply ? 'DEL ' : 'would delete'} ${key}  (${reason})`)
for (const { key, member } of strays) console.log(`${apply ? 'SREM' : 'would srem  '} ${key} -> ${member}  (wishlist is gone)`)
console.log(`\n${orphans.length} orphaned key(s), ${strays.length} dangling set member(s) out of ${keys.length} keys.`)

if (apply) {
    for (const { key } of orphans) await kv.del(key)
    for (const { key, member } of strays) await kv.srem(key, member)
    console.log('Applied.')
} else if (orphans.length || strays.length) {
    console.log('Dry run. Re-run with --apply to delete.')
}
