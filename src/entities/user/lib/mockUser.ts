import { TUserPublic, TUserPrivate } from "@/entities/user/model/user.types"

export const mockUserPublic: TUserPublic = {
    id: "u123",
    name: "Geoffrey S.",
    image: "/avatars/geoffrey.png",
}

export const mockUserPrivate: TUserPrivate = {
    ...mockUserPublic,
    email: "geoffrey@example.com",
    createdAt: "2024-10-01T12:00:00Z",
    updatedAt: "2024-10-01T12:00:00Z",
}