'use client'

import { usePotDashboardModel } from '../model'
import type { TPotDashboardProps } from './PotDashboard.types'
import styles from './PotDashboard.module.css'

export const PotDashboard = ({
    totalContributed,
    myContribution,
    contributors,
    currency,
}: TPotDashboardProps) => {
    const { isExpanded, toggle } = usePotDashboardModel()

    return (
        <div className={styles.potDashboard}>
            <button className={styles.potDashboard__header} onClick={toggle} aria-expanded={isExpanded}>
                <span className={styles.potDashboard__title}>Gift pot — your overview</span>
                <span className={styles.potDashboard__total}>
                    {currency}{totalContributed.toFixed(2)} pooled
                </span>
                <svg
                    className={`${styles.potDashboard__chevron} ${isExpanded ? styles['potDashboard__chevron--open'] : ''}`}
                    width="14" height="14" viewBox="0 0 14 14" fill="none"
                >
                    <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            </button>

            {isExpanded && (
                <div className={styles.potDashboard__body}>
                    {myContribution > 0 && (
                        <p className={styles.potDashboard__myContrib}>
                            Your contribution: <strong>{currency}{myContribution.toFixed(2)}</strong>
                        </p>
                    )}
                    {contributors.length === 0 ? (
                        <p className={styles.potDashboard__empty}>No contributions yet.</p>
                    ) : (
                        <ul className={styles.potDashboard__list}>
                            {contributors.map((c, i) => (
                                <li key={i} className={styles.potDashboard__row}>
                                    <span className={styles.potDashboard__name}>{c.name}</span>
                                    <span className={styles.potDashboard__amount}>{currency}{c.amount.toFixed(2)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    )
}
