import {TWishFormData} from "@/entities/wish/ui/WishForm.types";

export type TAddWishModal = {
    isOpen: boolean
    onClose: () => void
    onSubmit: (itemData: TWishFormData) => void
    useMock?: boolean
}