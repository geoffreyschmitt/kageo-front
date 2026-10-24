import React from "react";

export type TTab = {
    label: string
    content: React.ReactNode
    /** Stable key for the active tab; defaults to the label. Set it when the label can change (e.g. a count). */
    id?: string
    count?: number
}

export type TTabs = {
    tabs: TTab[]
    initialTab?: string
}
