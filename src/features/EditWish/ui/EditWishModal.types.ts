import {TWishFormData} from "@/entities/wish/ui/WishForm.types";

export type TEditWishModal = {
    isOpen: boolean
    onClose: () => void
    onSubmit: (itemData: TWishFormData & { id: string }) => void
    wishId: string
    initialData: Partial<TWishFormData>
    useMock?: boolean
}
