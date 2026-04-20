export const shareWishlist = async (wishlistId: string, email: string): Promise<void> => {
    const res = await fetch('/api/wishlist/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wishlistId, email }),
    })

    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`API error ${res.status}: ${text}`)
    }
}
