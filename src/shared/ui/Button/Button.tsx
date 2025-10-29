"use client"

import NextLink from "next/link";

import {TButton, TButtonAsButton, TButtonAsLink} from "shared/ui/Button/Button.types";

import styles from "./Button.module.css"


export const Button = ({
    className = "",
    variant = "primary",
    href,
    ...props
}: TButton) => {
    const classNames = `${styles.button} ${styles[`button--${variant}`]} ${className}`

    if (href) {
        return (
            <NextLink  {...props as TButtonAsLink} href={href} className={classNames} />
        )
    }

    const { type = "button", ...buttonProps } = props as TButtonAsButton
    return (
        <button
            type={type}
            className={classNames}
            {...buttonProps}
        />
    )
}
