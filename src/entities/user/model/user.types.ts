export type TUserPublic = {
    id: string
    name: string | null
    image?: string | null
}

export type TUserPrivate = TUserPublic & {
    email: string | null
    createdAt?: string
    updatedAt?: string
}