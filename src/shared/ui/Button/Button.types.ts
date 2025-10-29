import {AnchorHTMLAttributes, ButtonHTMLAttributes} from "react";


export type TButtonVariant = "primary" | "secondary" | "outline" | "ghost"

export type TButtonAsButton = ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: never
    className?: string
    variant?: TButtonVariant
}

export type TButtonAsLink = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
    href: string
    className?: string
    variant?: TButtonVariant
}

export type TButton = TButtonAsButton | TButtonAsLink