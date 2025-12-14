export type TCancelReservationButton = {
    wishId: string
    onCancel?: (wishId: string) => void
    onError?: (wishId: string) => void
    useMock?: boolean
}
