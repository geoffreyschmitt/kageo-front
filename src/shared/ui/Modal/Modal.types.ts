import React from "react";

export type TModal = {
    className?: string
    isOpen: boolean
    onClose: () => void
    title: React.ReactNode
    subtitle?: React.ReactNode
    // Forms set this to false so a stray tap on the backdrop cannot discard what was typed.
    closeOnOverlayClick?: boolean
    children: React.ReactNode
}
