import {TWishFormData} from "@/entities/wish/ui/WishForm.types";

export type TAddWishFormData = {
    name: string
    description: string
    price: number
    currency: string
    imageUrl: string
    priority: "low" | "medium" | "high"
    purchaseUrl: string
    notes: string
}

export type TAddWishValidationErrors = Partial<Record<keyof TAddWishFormData, string>>

export type TAddWishModal = {
    isOpen: boolean
    onClose: () => void
    onSubmit: (itemData: TWishFormData) => void
    useMock?: boolean
}