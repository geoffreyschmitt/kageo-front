"use client"

import styles from "./Button.module.css"
import {TButton} from "shared/ui/Button/Button.types";

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
