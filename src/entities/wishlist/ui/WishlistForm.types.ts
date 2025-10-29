import React from "react";

export type TWishlistFormData = {
    name: string
    description: string
    isPublic: boolean
    coverImage?: string
    allowComments: boolean
    allowSuggestions: boolean
    notifyOnPurchase: boolean
}

export type TWishlistValidationErrors = {
    name?: string
    description?: string
    coverImage?: string
}

type TFormChangeHandler<T> = (field: keyof T, value: T[keyof T]) => void;

export type TWishlistForm = {
    formData: TWishlistFormData
    errors: TWishlistValidationErrors
    isSubmitting: boolean
    handleInputChange: TFormChangeHandler<TWishlistFormData>
    handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void
    onCancel: () => void
}