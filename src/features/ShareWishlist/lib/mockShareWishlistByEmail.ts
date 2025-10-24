import {TWishlistFormData} from "@/entities/wishlist";

export const mockShareWishlistByEmail = async (
    data: TWishlistFormData
): Promise<TWishlistFormData> => {
    console.info("[mockShareWishlistByEmail] called with:", data)

    return data
}