"use client"

import React from "react";
import { useTranslations } from 'next-intl'

import {TProposedWishFormData, WishForm} from "@/entities/wish";
import {TProposedWishForm} from "@/entities/wish/ui/WishForm.types";

import {Modal} from "@/shared/ui";

import {useProposeWishForm} from "../model"

import styles from "./ProposeWishModal.module.css"
import type {TProposeWishModal} from "./ProposeWishModal.types"

export const ProposeWishModal = ({isOpen, onClose, onSubmit, wishlistId, useMock = false}: TProposeWishModal) => {
    const t = useTranslations('proposeWishModal')
    const {formData, errors, isSubmitting, handleInputChange, handleCheckboxChange, handleSubmit} =
        useProposeWishForm({onSubmit, onClose, wishlistId, useMock})

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
            title={t('title')}
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