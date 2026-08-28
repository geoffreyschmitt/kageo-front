export type TCreateGiftPotModalState = 'closed' | 'login-required' | 'invite-required' | 'confirm'

export type TCreateGiftPotButtonProps = {
    wishId: string
    ownerName: string
    price: number
    currency: string
    isLoggedIn: boolean
    isInvited: boolean
    onPotCreated: (creatorId: string, creatorName: string) => void
    useMock?: boolean
}

export type TCreateGiftPotModalProps = {
    modalState: TCreateGiftPotModalState
    ownerName: string
    price: number
    currency: string
    isCreating: boolean
    error: string | null
    onClose: () => void
    onConfirm: () => void
}
