import { assertOk } from '../assertOk'

import { TUserProfile } from './getProfile'


export type TUpdateProfilePayload = {
    name?: string
    isPublic?: boolean
    birthdate?: string | null
}

export const updateProfile = async (payload: TUpdateProfilePayload): Promise<TUserProfile> => {
    const res = await fetch('/api/user/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })

    await assertOk(res)

    return (await res.json()) as TUserProfile
}
