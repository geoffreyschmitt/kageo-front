import {TWishlistFormData} from "@/entities/wishlist";

export const mockUpdateWishlist = async (
    data: TWishlistFormData & { id?: string }
): Promise<TWishlistFormData & { id: string }> => {
    console.info("[mockUpdateWishlist] called with:", data)

    // Use existing ID if provided, otherwise generate a new one
    const id = data.id || (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}`)
    return { ...data, id }
}