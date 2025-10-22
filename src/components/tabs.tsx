"use client"

import type React from "react"

import { useState } from "react"
import styles from "./tabs.module.css"

interface Tab {
    label: string
    content: React.ReactNode
}

interface TabsProps {
    tabs: Tab[]
    initialTab?: string
}

export default function Tabs({ tabs, initialTab }: TabsProps) {
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
