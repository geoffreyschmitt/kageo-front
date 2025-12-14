/**
 * Generates a shareable URL for a wishlist
 * @param wishlistId - The ID of the wishlist to share
 * @returns Full URL in the format: {origin}/wishlist/{id}?share=true
 */
export const generateShareUrl = (wishlistId: string): string => {
  const path = `/wishlist/${wishlistId}?share=true`

  // Client-side: use window.location.origin
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${path}`
  }

  // Server-side: use environment variable or default
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}${path}`
}
