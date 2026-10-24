"use client"

import type React from "react"
import { useState } from "react"

import styles from "./Tabs.module.css"
import { TTab, TTabs } from "./Tabs.types"

const tabKey = (tab: TTab) => tab.id ?? tab.label

export const Tabs = ({ tabs, initialTab }: TTabs) => {
    const [activeTab, setActiveTab] = useState(initialTab || (tabs[0] && tabKey(tabs[0])))

    return (
        <div className={styles.tabs}>
            <div className={styles.tabs__header}>
                {tabs.map((tab) => {
                    const active = activeTab === tabKey(tab)
                    return (
                        <button
                            key={tabKey(tab)}
                            className={`${styles.tabs__button} ${active ? styles["tabs__button--active"] : ""}`}
                            onClick={() => setActiveTab(tabKey(tab))}
                            aria-pressed={active}
                        >
                            {tab.label}
                            {tab.count !== undefined && <span className={styles.tabs__count}>{tab.count}</span>}
                        </button>
                    )
                })}
            </div>
            <div className={styles.tabs__content}>{tabs.find((tab) => tabKey(tab) === activeTab)?.content}</div>
        </div>
    )
}
