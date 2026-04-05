import {TProposedWishFormData} from "@/entities/wish/ui/WishForm.types";

export type TProposeWishModal = {
    isOpen: boolean
    onClose: () => void
    onSubmit: (itemData: TProposedWishFormData & { id: string }) => void
    wishlistId: string
    useMock?: boolean
}