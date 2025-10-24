"use client"

import styles from "./ProposeWishModal.module.css"
import type { TProposeWishModal } from "./ProposeWishModal.types"
import { useProposeWishForm } from "../model"
import {Modal} from "@/shared/ui";
import {TProposedWishFormData, WishForm} from "@/entities/wish";
import React from "react";
import {TProposedWishForm} from "@/entities/wish/ui/WishForm.types";

export const ProposeWishModal = ({ isOpen, onClose, onSubmit }: TProposeWishModal) => {
    const { formData, errors, isSubmitting, handleInputChange, handleCheckboxChange, handleSubmit } =
        useProposeWishForm({onSubmit, onClose})

    if (!isOpen) return null

    const handleSelectChange =
        (field: keyof TProposedWishFormData) =>
            (e: React.ChangeEvent<HTMLSelectElement>) => {
                const value = e.target.value;
                handleInputChange(field, value);
            };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title=" Proposer un souhait"
            className={styles.proposeWishModal}
        >
            <WishForm<TProposedWishForm>
                formData={formData}
                errors={errors}
                isSubmitting={isSubmitting}
                handleInputChange={handleInputChange}
                handleSelectChange={handleSelectChange}
                handleCheckboxChange={handleCheckboxChange}
                handleSubmit={handleSubmit}
                onCancel={onClose}
                isProposedWish
            />
        </Modal>
    )
}