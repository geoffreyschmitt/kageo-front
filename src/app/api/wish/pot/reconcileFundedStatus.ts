// Decide whether a wish's status must flip because its gift-pot total crossed
// (or dropped back below) the goal. Returns the status to persist, or null when
// nothing should change. Only ever moves between 'wanted' and 'funded' — every
// other status (reserved, purchased, proposed) is left alone.
export const reconcileFundedStatus = (
    currentStatus: string,
    total: number,
    goal: number,
): 'funded' | 'wanted' | null => {
    const reached = goal > 0 && total >= goal
    if (reached && currentStatus === 'wanted') return 'funded'
    if (!reached && currentStatus === 'funded') return 'wanted'
    return null
}
