export const mockShareWishlistByEmail = async (
    email: string,
    url: string
): Promise<void> => {
    console.info("[mockShareWishlistByEmail] Sending wishlist link to", email, ":", url)
    
    // Simulate API call for sending email
    return new Promise((resolve) => setTimeout(resolve, 1000))
}