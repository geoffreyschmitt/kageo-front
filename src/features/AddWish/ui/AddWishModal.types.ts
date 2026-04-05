import {TWishFormData} from "@/entities/wish/ui/WishForm.types";

export type TAddWishModal = {
    isOpen: boolean
    onClose: () => void
    onSubmit: (itemData: TWishFormData & { id: string }) => void
    wishlistId: string
    useMock?: boolean
}