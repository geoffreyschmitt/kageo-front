"use client"

import {TButton} from "shared/ui/Button/Button.types";

import styles from "./Button.module.css"

export const Button = ({
    className = "",
    variant = "primary",
    type = "button",
    ...props
}: TButton) => {
    return (
        <button
            type={type}
            className={`${styles.button} ${styles[`button--${variant}`]} ${className}`}
            {...props}
        />
    )
}
