import type { TAddWishFormData } from "@/features/AddWish"

export const mockAddWish = async (
    data: TAddWishFormData,
): Promise<TAddWishFormData & { id: string }> => {
    console.info("[mockAddWish] called with:", data)
    await new Promise(resolve => setTimeout(resolve, 600))
    // crypto.randomUUID is available in modern runtimes; fallback if not:
    const id = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}`
    return { ...data, id }
}