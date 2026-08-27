import {TPanel} from "@/shared/ui/Panel/Panel.types";

import styles from "./Panel.module.css"


export const Panel = ({className = "", title, subtitle, actions, variant = "default", children}: TPanel) => {
    const hasHeader = Boolean(title || subtitle || actions)

    return (
        <section className={`${styles.panel} ${styles[`panel--${variant}`]} ${className}`}>
            {hasHeader && (
                <div className={styles.panel__header}>
                    <div className={styles.panel__headerText}>
                        {title && <h2 className={styles.panel__title}>{title}</h2>}
                        {subtitle && <p className={styles.panel__subtitle}>{subtitle}</p>}
                    </div>
                    {actions && <div className={styles.panel__actions}>{actions}</div>}
                </div>
            )}
            {children && <div className={styles.panel__body}>{children}</div>}
        </section>
    )
}
