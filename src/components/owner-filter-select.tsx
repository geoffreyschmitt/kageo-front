"use client"
import { useState, useRef, useEffect } from "react"

import styles from "./owner-filter-select.module.css"

interface OwnerFilterSelectProps {
    owners: string[]
    selectedOwner: string | null
    onSelectOwner: (owner: string | null) => void
}

export default function OwnerFilterSelect({ owners, selectedOwner, onSelectOwner }: OwnerFilterSelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const dropdownRef = useRef<HTMLDivElement>(null)

    const filteredOwners = owners.filter((owner) => owner.toLowerCase().includes(searchTerm.toLowerCase()))

    const handleSelect = (owner: string) => {
        onSelectOwner(owner)
        setSearchTerm(owner)
        setIsOpen(false)
    }

    const handleClear = () => {
        onSelectOwner(null)
        setSearchTerm("")
        setIsOpen(false)
    }

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [])

    return (
        <div className={styles.ownerFilterSelect} ref={dropdownRef}>
            <label htmlFor="owner-search" className={styles.ownerFilterSelect__label}>
                Filter by Owner
            </label>
            <div className={styles.ownerFilterSelect__inputContainer}>
                <input
                    id="owner-search"
                    type="text"
                    className={styles.ownerFilterSelect__input}
                    placeholder="Search or select owner..."
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value)
                        setIsOpen(true)
                    }}
                    onFocus={() => setIsOpen(true)}
                />
                {selectedOwner && (
                    <button type="button" className={styles.ownerFilterSelect__clearButton} onClick={handleClear}>
                        ×
                    </button>
                )}
            </div>

            {isOpen && (
                <div className={styles.ownerFilterSelect__dropdown}>
                    {filteredOwners.length > 0 ? (
                        <ul className={styles.ownerFilterSelect__list}>
                            {filteredOwners.map((owner) => (
                                <li key={owner} className={styles.ownerFilterSelect__listItem}>
                                    <button
                                        type="button"
                                        className={`${styles.ownerFilterSelect__optionButton} ${selectedOwner === owner ? styles["ownerFilterSelect__optionButton--selected"] : ""}`}
                                        onClick={() => handleSelect(owner)}
                                    >
                                        {owner}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className={styles.ownerFilterSelect__noResults}>No owners found.</div>
                    )}
                </div>
            )}
        </div>
    )
}
