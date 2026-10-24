import React from "react";

import { useTranslations } from 'next-intl'

import {
    useEditWishModel,
} from "@/features/EditWish/model";

import {WishForm, TWishFormData, TWishForm} from "@/entities/wish";

import {Modal} from "@/shared/ui";

import {
    TEditWishModal,
} from "./EditWishModal.types";



export const EditWishModal = ({
    isOpen,
    onClose,
    onSubmit,
    wishId,
    initialData,
}: TEditWishModal) => {
    const t = useTranslations('editWishModal')
    const {
        formData,
        errors,
        isSubmitting,
        formError,
        handleInputChange,
        handleCheckboxChange,
        handleSubmit,
        linkImport,
    } = useEditWishModel({
        wishId,
        initialData,
        onSubmit,
        onClose,
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
            subtitle={initialData.name}
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
                onCancel={onClose}
                priority={formData.priority}
                linkImport={linkImport}
                submitLabel={t('submit')}
                submittingLabel={t('submitting')}
                formError={formError}
            />
        </Modal>
    );
};
