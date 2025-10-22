"use client"

import type React from "react"

import { useState } from "react"
import styles from "./Tabs.module.css"
import { TTabs } from "./Tabs.types"

export const Tabs = ({ tabs, initialTab }: TTabs) => {
    const [activeTab, setActiveTab] = useState(initialTab || tabs[0]?.label)

    return (
        <div className={styles.tabs}>
            <div className={styles.tabs__header}>
                {tabs.map((tab) => (
                    <button
                        key={tab.label}
                        className={`${styles.tabs__button} ${activeTab === tab.label ? styles["tabs__button--active"] : ""}`}
                        onClick={() => setActiveTab(tab.label)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className={styles.tabs__content}>{tabs.find((tab) => tab.label === activeTab)?.content}</div>
        </div>
    )
}
