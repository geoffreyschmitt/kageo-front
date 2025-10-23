import React from "react";

export type TWishlistFormData = {
    name: string
    description: string
    isPublic: boolean
    coverImage?: string
    category: string
    allowComments: boolean
    allowSuggestions: boolean
    notifyOnPurchase: boolean
}

export type TWishlistValidationErrors = {
    name?: string
    description?: string
    coverImage?: string
}

export type TWishlistForm = {
    formData: TWishlistFormData
    errors: TWishlistValidationErrors
    isSubmitting: boolean
    handleInputChange: (field: keyof TWishlistFormData, value: any) => void
    handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void
    onCancel: () => void
}