import type { TProposedWishFormData } from "@/entities/wish"

export const mockProposeWish  = async (
    data: TProposedWishFormData,
): Promise<TProposedWishFormData & { id: string }> => {
    console.info("[mockProposeItem] called with:", data)
    await new Promise(resolve => setTimeout(resolve, 600))
    // crypto.randomUUID is available in modern runtimes; fallback if not:
    const id = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}`
    return { ...data, id }
}