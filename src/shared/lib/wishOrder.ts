// The owner's manual wish order is one stored list of wish ids per wishlist. These helpers
// are the only place that interprets it: wishes missing from the list (never reordered, or
// added since) come first, newest first; listed wishes follow in list order; stale ids
// (wishes deleted since) are ignored.

type TOrderable = { id: string; createdAt?: string }

const createdAtOf = (wish: TOrderable) => Date.parse(wish.createdAt ?? '') || 0

export const sortByStoredOrder = <T extends TOrderable>(wishes: T[], order: string[] | null | undefined): T[] => {
    const rank = new Map((order ?? []).map((id, index) => [id, index]))
    const unlisted = wishes.filter((w) => !rank.has(w.id)).sort((a, b) => createdAtOf(b) - createdAtOf(a))
    const listed = wishes.filter((w) => rank.has(w.id)).sort((a, b) => rank.get(a.id)! - rank.get(b.id)!)
    return [...unlisted, ...listed]
}

// Validates a requested order against the wishes that exist. Wishes the request omits (for
// instance one added in another tab) are kept, after the requested ones, in their current
// position. Ids that are not in the wishlist (a wish deleted in another tab) are dropped rather
// than failing the save: they can never be stored. Returns null for duplicates.
export const resolveOrder = (
    requested: string[],
    wishIds: string[],
    currentOrder: string[] | null,
): string[] | null => {
    const known = new Set(wishIds)
    if (new Set(requested).size !== requested.length) return null
    const kept = requested.filter((id) => known.has(id))

    const rank = new Map((currentOrder ?? []).map((id, index) => [id, index]))
    const inRequest = new Set(kept)
    const omitted = wishIds
        .filter((id) => !inRequest.has(id))
        .sort((a, b) => (rank.get(a) ?? Infinity) - (rank.get(b) ?? Infinity))
    return [...kept, ...omitted]
}

// A section is a subset of the global order. Writes the section's new order back into the
// slots its members occupy, leaving every other id where it was.
export const replaceSectionOrder = (allIds: string[], sectionIds: string[]): string[] => {
    const members = new Set(sectionIds)
    const queue = [...sectionIds]
    return allIds.map((id) => (members.has(id) ? queue.shift()! : id))
}

export const moveToTop = (ids: string[], id: string): string[] =>
    ids.includes(id) ? [id, ...ids.filter((other) => other !== id)] : [...ids]
