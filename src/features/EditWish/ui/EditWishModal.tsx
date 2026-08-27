import React from "react";
import { useTranslations } from 'next-intl'

import {
    useEditWishModel,
} from "@/features/EditWish/model";

import {WishForm, TWishFormData, TWishForm} from "@/entities/wish";

import {Modal} from "@/shared/ui";

import styles from "./EditWishModal.module.css";
import {
    TEditWishModal,
} from "./EditWishModal.types";



export const EditWishModal = ({
    isOpen,
    onClose,
    onSubmit,
    wishId,
    initialData,
    useMock = false,
}: TEditWishModal) => {
    const t = useTranslations('editWishModal')
    const {
        formData,
        errors,
        isSubmitting,
        handleInputChange,
        handleCheckboxChange,
        handleSubmit,
    } = useEditWishModel({
        wishId,
        initialData,
        onSubmit,
        onClose,
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
            className={styles.editWishModal}
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
                submitLabel={t('submit')}
                submittingLabel={t('submitting')}
            />
        </Modal>
    );
};
