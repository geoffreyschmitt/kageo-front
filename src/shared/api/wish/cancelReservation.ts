import { assertOk } from "../assertOk"

export type TCancelReservationResponse = {
    id: string
    status: 'wanted'
    reservedBy: undefined
}

export const cancelReservation = async (
    wishId: string
): Promise<TCancelReservationResponse> => {
    const res = await fetch("/api/wish/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wishId }),
    })

    await assertOk(res)

    return (await res.json()) as TCancelReservationResponse
}
