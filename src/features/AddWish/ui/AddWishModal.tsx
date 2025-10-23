import React from "react";
import styles from "./AddWishModal.module.css";
import {
    TAddWishModal,
    TAddWishFormData
} from "./AddWishModal.types";
import {
    useAddWishModel,
} from "@/features/AddWish/model";
import {WishForm} from "@/entities/wish/ui/WishForm";
import {Modal} from "@/shared/ui";


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
        handleSubmit,
    } = useAddWishModel({
        onSubmit,
        onClose,
        useMock,
    });

    if (!isOpen) return null;

    const handleSelectChange =
        (field: keyof TAddWishFormData) =>
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
                <WishForm
                    formData={formData}
                    errors={errors}
                    isSubmitting={isSubmitting}
                    handleInputChange={handleInputChange}
                    handleSelectChange={handleSelectChange}
                    handleSubmit={handleSubmit}
                    onCancel={onClose}
                />
        </Modal>
    );
};