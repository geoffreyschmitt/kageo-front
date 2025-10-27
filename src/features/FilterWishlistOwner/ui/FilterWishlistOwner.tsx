"use client"

import { useState, useRef, useEffect } from "react";

import { useFilterWishlistOwner } from "@/features/FilterWishlistOwner/model";
import {TFilterWishlistOwner, TWishlistOwner} from "@/features/FilterWishlistOwner/ui/FilterWishlistOwner.types";


import styles from "./FilterWishlistOwner.module.css";

export const OwnerFilter = ({ owners, selectedOwner, onSelectOwner }:TFilterWishlistOwner) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    const { filteredOwners } = useFilterWishlistOwner({owners, search: selectedOwner});



    const handleSelect = (owner: TWishlistOwner) => {
        onSelectOwner(owner);
        setSearchTerm(owner.name);
        setIsOpen(false);
    };

    const handleClear = () => {
        onSelectOwner(null);
        setSearchTerm("");
        setIsOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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
                        setSearchTerm(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                />
                {selectedOwner && (
                    <button
                        type="button"
                        className={styles.ownerFilterSelect__clearButton}
                        onClick={handleClear}
                    >
                        ×
                    </button>
                )}
            </div>

            {isOpen && (
                <div className={styles.ownerFilterSelect__dropdown}>
                    {filteredOwners.length > 0 ? (
                        <ul className={styles.ownerFilterSelect__list}>
                            {filteredOwners.map((owner) => (
                                <li key={owner.id} className={styles.ownerFilterSelect__listItem}>
                                    <button
                                        type="button"
                                        className={`${styles.ownerFilterSelect__optionButton} ${
                                            selectedOwner === owner.name
                                                ? styles["ownerFilterSelect__optionButton--selected"]
                                                : ""
                                        }`}
                                        onClick={() => handleSelect(owner)}
                                    >
                                        {owner.name}
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
    );
};