import React from "react";

export type TWishlistFormData = {
    name: string
    description: string
    isPublic: boolean
    coverImage?: string
    allowSuggestions: boolean
    eventDate: string
}

export type TWishlistValidationErrors = {
    name?: string
    description?: string
    coverImage?: string
    eventDate?: string
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