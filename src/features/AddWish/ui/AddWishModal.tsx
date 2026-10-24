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
}: TAddWishModal) => {
    const t = useTranslations('addWishModal')
    const {
        formData,
        errors,
        isSubmitting,
        formError,
        handleInputChange,
        handleCheckboxChange,
        handleSubmit,
        handleClose,
        linkImport,
    } = useAddWishModel({
        onSubmit,
        onClose,
        wishlistId,
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
            onClose={handleClose}
            title={t('title')}
            className={styles.addWishModal}
            closeOnOverlayClick={false}
        >
                <WishForm<TWishForm>
                    formData={formData}
                    errors={errors}
                    isSubmitting={isSubmitting}
                    handleInputChange={handleInputChange}
                    handleSelectChange={handleSelectChange}
                    handleCheckboxChange={handleCheckboxChange}
                    handleSubmit={handleSubmit}
                    onCancel={handleClose}
                    priority={formData.priority}
                    linkImport={linkImport}
                    formError={formError}
                />
        </Modal>
    );
};