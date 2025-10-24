"use client"

import {useCallback, useState} from "react"

import {addWish as addWishService} from "@/services/wishlist/addWish";

import type { TProposedWishFormData, TProposedWishValidationErrors } from "@/entities/wish"

import {isValidUrl} from "@/shared/lib/isValidUrl";

import { mockProposeWish } from "./lib/mockProposeWish"

type TUseProposeWishFormParams = {
    onSubmit: (item: TProposedWishFormData & { id: string }) => void
    onClose: () => void
    useMock?: boolean
}

export const useProposeWishForm = ({
   onSubmit,
   onClose,
   useMock = false,
}: TUseProposeWishFormParams) => {
    const [formData, setFormData] = useState<TProposedWishFormData>({
        name: "",
        description: "",
        price: 0,
        currency: "$",
        imageUrl: "",
        purchaseUrl: "",
        notes: "",
        showToOwner: false,
    })

    const [errors, setErrors] = useState<TProposedWishValidationErrors>({})
    const [isSubmitting, setIsSubmitting] = useState(false)

    const validateForm = (): boolean => {
        const newErrors: Partial<Record<keyof TProposedWishFormData, string>> = {}
        if (!formData.name.trim()) newErrors.name = "Item name is required"
        if (!formData.description.trim()) newErrors.description = "Description is required"
        if (formData.price < 0) newErrors.price = "Price cannot be negative"
        if (formData.purchaseUrl && !isValidUrl(formData.purchaseUrl))
            newErrors.purchaseUrl = "Invalid URL"
        if (formData.imageUrl && !isValidUrl(formData.imageUrl)) newErrors.imageUrl = "Invalid image URL"

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    // Generic setter that accepts string | number | boolean for fields.
    const handleInputChange = useCallback(
        (field: keyof TProposedWishFormData, value: string | number | boolean) => {
            setFormData(prev => {
                // ensure numeric fields remain numbers
                const normalized =
                    field === "price" ? (typeof value === "number" ? value : Number.parseFloat(String(value) || "0")) : value
                return { ...prev, [field]: normalized } as TProposedWishFormData
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
        (field: keyof TProposedWishFormData, value: string | number | boolean) => {
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

    const resetForm = (): void => {
        setFormData({
            name: "",
            description: "",
            price: 0,
            currency: "$",
            imageUrl: "",
            purchaseUrl: "",
            notes: "",
            showToOwner: false,
        })
        setErrors({})
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault()
        if (!validateForm()) return
        setIsSubmitting(true)
        try {
            const runner = useMock ? mockProposeWish : addWishService
            const result = await runner(formData)

            await onSubmit(result)
            resetForm()
            onClose()
        } catch (err) {
            console.error("Erreur lors de la proposition de souhait :", err)
            // Optionally set a global error state here
        } finally {
            setIsSubmitting(false)
        }
    }

    return {
        formData,
        errors,
        isSubmitting,
        handleInputChange,
        handleCheckboxChange,
        handleSubmit,
        resetForm,
    }
}
