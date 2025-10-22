import React from "react";

export type TTab = {
    label: string
    content: React.ReactNode
}

export type TTabs = {
    tabs: TTab[]
    initialTab?: string
}