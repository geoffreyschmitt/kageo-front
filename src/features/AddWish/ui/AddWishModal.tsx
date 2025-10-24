import React from "react";
import styles from "./AddWishModal.module.css";
import {
    TAddWishModal,
} from "./AddWishModal.types";
import {
    useAddWishModel,
} from "@/features/AddWish/model";
import {Modal} from "@/shared/ui";
import {WishForm, TWishFormData, TWishForm} from "@/entities/wish";


export const AddWishModal = ({
    isOpen,
    onClose,
    onSubmit,
    useMock = false,
}: TAddWishModal) => {
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
        useMock,
    });

    if (!isOpen) return null;

    const handleSelectChange =
        (field: keyof TWishFormData) =>
            (e: React.ChangeEvent<HTMLSelectElement>) => {
                const value = e.target.value;
                handleInputChange(field, value);
            };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title=" Ajouter un souhait"
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