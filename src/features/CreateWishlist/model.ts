import {useCallback, useState} from "react"

import {createWishlist} from "@/services/wishlist/createWishlist";

import type {TWishlistFormData, TWishlistValidationErrors} from "@/entities/wishlist"
import {validateWishlistForm} from '@/entities/wishlist/lib/validateWishlistForm';
import {DEFAULT_WISHLIST_SETTINGS} from "@/entities/wishlist/model/constants";

import {mockCreateWishlist} from "./lib/mockCreateWishlist"

type TUseCreateWishlistModel = {
    onSubmit: (wishlistData: TWishlistFormData) => void
    onClose: () => void
    useMock?: boolean
}

export const useCreateWishlistModel = ({
    onSubmit,
    onClose,
    useMock = false,
}: TUseCreateWishlistModel) => {
    const [formData, setFormData] = useState<TWishlistFormData>({
        ...DEFAULT_WISHLIST_SETTINGS,
    })

    const [errors, setErrors] = useState<TWishlistValidationErrors>({})
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

    const handleInputChange = useCallback(
        (field: keyof TWishlistFormData, value?: string | boolean) => {
            setFormData((prev: TWishlistFormData) => ({...prev, [field]: value}))

            // Clear error for the field when user types/selects
            setErrors((prev: TWishlistValidationErrors) => {
                if (!prev[field as keyof TWishlistValidationErrors]) return prev
                const copy = {...prev}
                delete copy[field as keyof TWishlistValidationErrors]
                return copy
            })
        },
        [],
    )

    const resetForm = useCallback(() => {
        setFormData({
            ...DEFAULT_WISHLIST_SETTINGS,
        })
        setErrors({})
    }, [])

    const handleSubmit = useCallback(
        async (e?: React.FormEvent) => {
            if (e) e.preventDefault()

            const {errorList, hasError} = validateWishlistForm(formData);
            setErrors(errorList)

            if (hasError) return

            setIsSubmitting(true)
            try {
                const runner = useMock ? mockCreateWishlist : createWishlist
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
        [formData, onSubmit, onClose, resetForm, useMock],
    )

    return {
        formData,
        errors,
        isSubmitting,
        handleInputChange,
        handleSubmit,
        resetForm,
    }
}