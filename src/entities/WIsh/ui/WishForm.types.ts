import React from "react";

export type TWishFormData = {
    name: string
    description: string
    price: number
    currency: string
    imageUrl: string
    priority: "low" | "medium" | "high"
    purchaseUrl: string
    notes: string
}

export type TWishValidationErrors = Partial<Record<keyof TWishFormData, string>>


export type TWishForm = {
    formData: TWishFormData
    errors: TWishValidationErrors
    isSubmitting: boolean
    handleInputChange: (field: keyof TWishFormData, value: any) => void
    handleSelectChange: (field: keyof TWishFormData, value: any) => void
    handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void
    onCancel: () => void
}
