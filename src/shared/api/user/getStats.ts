import { assertOk } from '../assertOk'

export type TUserStats = {
    wishlists: number
    wishes: number
    shared: number
}

export const getStats = async (): Promise<TUserStats> => {
    const res = await fetch('/api/user/stats')

    await assertOk(res)

    return (await res.json()) as TUserStats
}
