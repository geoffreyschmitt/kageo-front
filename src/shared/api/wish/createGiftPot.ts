import { assertOk } from '../assertOk'

export type TCreateGiftPotResponse = {
    creatorId: string
    creatorName: string
    createdAt: string
}

export const createGiftPot = async (wishId: string): Promise<TCreateGiftPotResponse> => {
    const res = await fetch('/api/wish/pot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wishId }),
    })

    await assertOk(res)

    return (await res.json()) as TCreateGiftPotResponse
}
