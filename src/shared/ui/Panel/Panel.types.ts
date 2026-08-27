import React from "react";

export type TPanelVariant = "default" | "danger"

export type TPanel = {
    className?: string
    title?: React.ReactNode
    subtitle?: React.ReactNode
    actions?: React.ReactNode
    variant?: TPanelVariant
    children?: React.ReactNode
}
