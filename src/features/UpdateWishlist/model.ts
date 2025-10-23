// features/EditWishlist/model.ts

import { useState, useCallback } from "react"
import type { TEditWishlistFormData, TEditWishlistValidationErrors } from "@/entities/wishlist"
import { updateWishlist } from "@/services/wishlist/updateWishlist"
import { mockUpdateWishlist } from "./lib/mockUpdateWishlist"
import {DEFAULT_WISHLIST_SETTINGS} from "@/entities/wishlist";

type TUseEditWishlistModel = {
    onSubmit: (wishlistData: TEditWishlistFormData) => void
    onClose: () => void
    initialData?: Partial<TEditWishlistFormData>
    useMock?: boolean
}

export const useEditWishlistModel = ({
    onSubmit,
    onClose,
    initialData = {},
    useMock = false,
}: TUseEditWishlistModel) => {
    const [formData, setFormData] = useState<TEditWishlistFormData>({
        ...DEFAULT_WISHLIST_SETTINGS,
        ...initialData,
    })

    const [errors, setErrors] = useState<TEditWishlistValidationErrors>({})
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

    const validateForm = useCallback((): boolean => {
        const newErrors: TEditWishlistValidationErrors = {}

        if (!formData.name.trim()) {
            newErrors.name = "Le nom de la wishlist est requis"
        } else if (formData.name.trim().length < 3) {
            newErrors.name = "Le nom doit contenir au moins 3 caractères"
        }

        if (!formData.description.trim()) {
            newErrors.description = "La description est requise"
        } else if (formData.description.trim().length < 10) {
            newErrors.description = "La description doit contenir au moins 10 caractères"
        }

        if (formData.coverImage && !isValidUrl(formData.coverImage)) {
            newErrors.coverImage = "URL d'image invalide"
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }, [formData])

    const isValidUrl = (value: string): boolean => {
        try {
            new URL(value)
            return true
        } catch {
            return false
        }
    }

    const handleInputChange = useCallback(
        (field: keyof TEditWishlistFormData, value: string | boolean) => {
            setFormData((prev: TEditWishlistFormData) => ({ ...prev, [field]: value }))

            // Clear error for the field when user types/selects
            setErrors((prev: TEditWishlistValidationErrors) => {
                if (!prev[field as keyof TEditWishlistValidationErrors]) return prev
                const copy = { ...prev }
                delete copy[field as keyof TEditWishlistValidationErrors]
                return copy
            })
        },
        [],
    )

    const resetForm = useCallback(() => {
        setFormData({
            ...DEFAULT_WISHLIST_SETTINGS,
            ...initialData,
        })
        setErrors({})
    }, [initialData])

    const handleSubmit = useCallback(
        async (e?: React.FormEvent) => {
            if (e) e.preventDefault()
            if (!validateForm()) return

            setIsSubmitting(true)
            try {
                const runner = useMock ? mockUpdateWishlist : updateWishlist
                await runner(formData)
                onSubmit(formData)
                resetForm()
                onClose()
            } catch (err) {
                console.error("Erreur lors de la mise à jour de la wishlist :", err)
            } finally {
                setIsSubmitting(false)
            }
        },
        [formData, onSubmit, onClose, resetForm, useMock, validateForm],
    )

    return {
        formData,
        errors,
        isSubmitting,
        handleInputChange,
        handleSubmit,
        resetForm,
        validateForm,
    }
}