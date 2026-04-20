export type TCreatePotModalState = 'closed' | 'login-required' | 'invite-required' | 'confirm'

export type TCreatePotButtonProps = {
    wishlistId: string
    ownerName: string
    isLoggedIn: boolean
    isInvited: boolean
    onPotCreated: (creatorId: string, creatorName: string) => void
    useMock?: boolean
}
