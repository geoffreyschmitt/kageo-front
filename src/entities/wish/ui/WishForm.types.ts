import React from "react";

import {TWishPriority} from "@/entities/wish/Wish.types";


export type TWishFormData = {
    name: string
    description: string
    price: number
    currency: string
    imageUrl: string
    priority: TWishPriority
    purchaseUrl: string
    notes: string
}

export type TWishValidationErrors = Partial<Record<keyof TWishFormData, string>>

export type TProposedWishFormData = Omit<TWishFormData, 'priority'> & {
    showToOwner: boolean
}
export type TProposedWishValidationErrors = Partial<Record<keyof TProposedWishFormData, string>>

type TFormChangeHandler<T> = (field: keyof T, value: T[keyof T]) => void;

type TBaseWishFormProps<TData, TErrors> = {
    formData: TData
    errors: TErrors
    isSubmitting: boolean
    handleInputChange: TFormChangeHandler<TData>
    handleSelectChange: TFormChangeHandler<TData>
    handleCheckboxChange: TFormChangeHandler<TData>
    handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void
    onCancel: () => void
}

export type TWishForm = TBaseWishFormProps<TWishFormData, TWishValidationErrors> & {
    isProposedWish?: false
    priority: TWishPriority
}

export type TProposedWishForm = TBaseWishFormProps<TProposedWishFormData, TProposedWishValidationErrors> & {
    isProposedWish: true
}
