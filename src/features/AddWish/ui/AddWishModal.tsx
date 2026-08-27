import React from "react";
import { useTranslations } from 'next-intl'

import {
    useAddWishModel,
} from "@/features/AddWish/model";

import {WishForm, TWishFormData, TWishForm} from "@/entities/wish";

import {Modal} from "@/shared/ui";

import styles from "./AddWishModal.module.css";
import {
    TAddWishModal,
} from "./AddWishModal.types";



export const AddWishModal = ({
    isOpen,
    onClose,
    onSubmit,
    wishlistId,
    useMock = false,
}: TAddWishModal) => {
    const t = useTranslations('addWishModal')
    const {
        formData,
        errors,
        isSubmitting,
        handleInputChange,
        handleCheckboxChange,
        handleSubmit,
    } = useAddWishModel({
        onSubmit,
        onClose,
        wishlistId,
        useMock,
    });

    const handleSelectChange = (
        field: keyof TWishFormData,
        value: TWishFormData[keyof TWishFormData],
    ) => {
        handleInputChange(field, value);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('title')}
            className={styles.addWishModal}
        >
                <WishForm<TWishForm>
                    formData={formData}
                    errors={errors}
                    isSubmitting={isSubmitting}
                    handleInputChange={handleInputChange}
                    handleSelectChange={handleSelectChange}
                    handleCheckboxChange={handleCheckboxChange}
                    handleSubmit={handleSubmit}
                    onCancel={onClose}
                    priority={formData.priority}
                />
        </Modal>
    );
};