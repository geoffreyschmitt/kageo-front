import React from "react";

export type TModal = {
    className?: string
    isOpen: boolean
    onClose: () => void
    title: React.ReactNode
    subtitle?: React.ReactNode
    children: React.ReactNode
}
