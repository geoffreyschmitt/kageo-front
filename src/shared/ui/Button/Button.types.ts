import {ButtonHTMLAttributes} from "react";


export type TButtonVariant = "primary" | "secondary" | "outline" | "ghost"

export type TButton = ButtonHTMLAttributes<HTMLButtonElement> & {
    className?: string
    variant?: TButtonVariant
}