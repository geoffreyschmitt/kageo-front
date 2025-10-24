import { useState, useCallback } from "react"
import type { TWishlistFormData, TWishlistValidationErrors } from "@/entities/wishlist"
import { updateWishlist } from "@/services/wishlist/updateWishlist"
import { mockUpdateWishlist } from "./lib/mockUpdateWishlist"
import {DEFAULT_WISHLIST_SETTINGS} from "@/entities/wishlist";
import {isValidUrl} from "@/shared/lib/isValidUrl";

type TUseEditWishlistModel = {
    onSubmit: (wishlistData: TWishlistFormData) => void
    onClose: () => void
    initialData?: Partial<TWishlistFormData>
    useMock?: boolean
}

export const useEditWishlistModel = ({
    onSubmit,
    onClose,
    initialData = {},
    useMock = false,
}: TUseEditWishlistModel) => {
    const [formData, setFormData] = useState<TWishlistFormData>({
        ...DEFAULT_WISHLIST_SETTINGS,
        ...initialData,
    })

    const [errors, setErrors] = useState<TWishlistValidationErrors>({})
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

    const validateForm = useCallback((): boolean => {
        const newErrors: TWishlistValidationErrors = {}

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

    const handleInputChange = useCallback(
        (field: keyof TWishlistFormData, value: string | boolean) => {
            setFormData((prev: TWishlistFormData) => ({ ...prev, [field]: value }))

            // Clear error for the field when user types/selects
            setErrors((prev: TWishlistValidationErrors) => {
                if (!prev[field as keyof TWishlistValidationErrors]) return prev
                const copy = { ...prev }
                delete copy[field as keyof TWishlistValidationErrors]
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