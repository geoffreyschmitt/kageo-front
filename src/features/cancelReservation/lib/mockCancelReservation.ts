export type TCancelReservationResponse = {
    id: string
    status: 'wanted'
    reservedBy: undefined
}

export const mockCancelReservation = async (
    wishId: string
): Promise<TCancelReservationResponse> => {
    console.info("[mockCancelReservation] called with:", { wishId })
    await new Promise(resolve => setTimeout(resolve, 600))
    return {
        id: wishId,
        status: 'wanted',
        reservedBy: undefined,
    }
}
