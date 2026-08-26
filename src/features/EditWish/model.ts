import { useState, useCallback, useEffect } from "react"
import { useTranslations } from "next-intl"

import { editWish as editWishService } from "@/shared/api/wish/editWish"

import type { TWishFormData, TWishValidationErrors, TWishPriority} from "@/entities/wish"

import {isValidUrl} from "@/shared/lib/isValidUrl";

import { mockEditWish } from "./lib/mockEditWish"


type TUseEditWishModelParams = {
    wishId: string
    initialData: Partial<TWishFormData>
    onSubmit: (item: TWishFormData & { id: string }) => void
    onClose: () => void
    useMock?: boolean
}

export const useEditWishModel = ({
    wishId,
    initialData,
    onSubmit,
    onClose,
    useMock = false,
}: TUseEditWishModelParams) => {
    const [formData, setFormData] = useState<TWishFormData>({
        name: initialData.name || "",
        description: initialData.description || "",
        price: initialData.price || 0,
        currency: initialData.currency || "€",
        imageUrl: initialData.imageUrl || "",
        priority: initialData.priority || "medium",
        purchaseUrl: initialData.purchaseUrl || "",
        notes: initialData.notes || "",
    })

    const [errors, setErrors] = useState<TWishValidationErrors>({})
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

    // Update form data when initialData changes
    useEffect(() => {
        setFormData({
            name: initialData.name || "",
            description: initialData.description || "",
            price: initialData.price || 0,
            currency: initialData.currency || "€",
            imageUrl: initialData.imageUrl || "",
            priority: initialData.priority || "medium",
            purchaseUrl: initialData.purchaseUrl || "",
            notes: initialData.notes || "",
        })
        setErrors({})
    }, [initialData])

    const t = useTranslations('wishForm')

    const validateForm = useCallback((): boolean => {
        const newErrors: TWishValidationErrors = {}

        if (!formData.name.trim()) newErrors.name = t('errors.nameRequired')
        if (!(typeof formData.price === "number") || Number.isNaN(formData.price) || formData.price <= 0)
            newErrors.price = t('errors.priceMustBePositive')
        if (formData.purchaseUrl && !isValidUrl(formData.purchaseUrl)) newErrors.purchaseUrl = t('errors.invalidUrl')
        if (formData.imageUrl && !isValidUrl(formData.imageUrl)) newErrors.imageUrl = t('errors.invalidImageUrl')

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }, [formData, t])

    // Generic setter that accepts string | number for fields.
    const handleInputChange = useCallback(
        (field: keyof TWishFormData, value: string | number | TWishPriority) => {
            setFormData(prev => {
                // ensure numeric fields remain numbers
                const normalized =
                    field === "price" ? (typeof value === "number" ? value : Number.parseFloat(String(value) || "0")) : value
                return { ...prev, [field]: normalized } as TWishFormData
            })

            // clear error for the field when user types/selects
            setErrors(prev => {
                if (!prev[field]) return prev
                const copy = { ...prev }
                delete copy[field]
                return copy
            })
        },
        [],
    )

    const handleCheckboxChange = useCallback(
        (field: keyof TWishFormData, value: string | number | TWishPriority) => {
            setFormData(prev => ({...prev, [field]: value}))
            // clear error for the field when user changes checkbox
            setErrors(prev => {
                if (!prev[field]) return prev
                const copy = {...prev}
                delete copy[field]
                return copy
            })
        },
        [],
    )

    const resetForm = useCallback(() => {
        setFormData({
            name: initialData.name || "",
            description: initialData.description || "",
            price: initialData.price || 0,
            currency: initialData.currency || "€",
            imageUrl: initialData.imageUrl || "",
            priority: initialData.priority || "medium",
            purchaseUrl: initialData.purchaseUrl || "",
            notes: initialData.notes || "",
        })
        setErrors({})
    }, [initialData])

    const handleSubmit = useCallback(
        async (e?: React.FormEvent) => {
            if (e) e.preventDefault()
            if (!validateForm()) return

            setIsSubmitting(true)
            try {
                const runner = useMock ? mockEditWish : editWishService
                const result = await runner(wishId, formData)
                // ensure id exists in result
                onSubmit(result)
                resetForm()
                onClose()
            } catch (err) {
                console.error("Erreur lors de la modification de souhait :", err)
                // Optionally set a global error state here
            } finally {
                setIsSubmitting(false)
            }
        },
        [wishId, formData, onSubmit, onClose, resetForm, useMock, validateForm],
    )

    return {
        formData,
        errors,
        isSubmitting,
        handleInputChange,
        handleCheckboxChange,
        handleSubmit,
        resetForm,
        validateForm,
    }
}
