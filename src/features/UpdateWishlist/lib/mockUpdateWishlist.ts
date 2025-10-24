import {TWishlistFormData} from "@/entities/wishlist";

export const mockUpdateWishlist = async (
    data: TWishlistFormData
): Promise<TWishlistFormData & { id: string }> => {
    console.info("[mockUpdateWishlist] called with:", data)

    // crypto.randomUUID is available in modern runtimes; fallback if not:
    const id = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}`
    return { ...data, id }
}