// The owner never learns who reserved or bought what, nor that a pot is full. Used by every
// owner-facing payload that carries raw wish records (wishlist API, data export).
export const maskWishForOwner = (wish: unknown): Record<string, unknown> => {
    const { reservedBy: _reservedBy, purchasedBy: _purchasedBy, ...rest } = wish as Record<string, unknown>
    const hidden = rest.status === 'reserved' || rest.status === 'purchased' || rest.status === 'funded'
    return { ...rest, status: hidden ? 'wanted' : rest.status }
}
