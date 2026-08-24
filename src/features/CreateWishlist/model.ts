import {useCallback, useState} from "react"

import {useTranslations} from 'next-intl'

import {createWishlist} from "@/shared/api/wishlist/createWishlist";
import {eventBus} from "@/shared/eventBus";

import type {TWishlistFormData, TWishlistValidationErrors} from "@/entities/wishlist"
import {validateWishlistForm} from '@/entities/wishlist/lib/validateWishlistForm';
import {DEFAULT_WISHLIST_SETTINGS} from "@/entities/wishlist/model/constants";

import {mockCreateWishlist} from "./lib/mockCreateWishlist"

type TUseCreateWishlistModel = {
    onSubmit: (wishlistData: TWishlistFormData & { id: string; isPending?: boolean }) => void
    onError?: (tempId: string) => void
    onClose: () => void
    useMock?: boolean
}

export const useCreateWishlistModel = ({
    onSubmit,
    onError,
    onClose,
    useMock = false,
}: TUseCreateWishlistModel) => {
    const [formData, setFormData] = useState<TWishlistFormData>({
        ...DEFAULT_WISHLIST_SETTINGS,
    })

    const [errors, setErrors] = useState<TWishlistValidationErrors>({})
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

    const t = useTranslations('wishlistForm')

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

            const {errorList, hasError} = validateWishlistForm(formData, t);
            setErrors(errorList)

            if (hasError) return

            setIsSubmitting(true)
            
            // Generate temporary ID immediately for optimistic update
            const tempId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" 
                ? `temp-${crypto.randomUUID()}` 
                : `temp-${Date.now()}`
            
            // Call onSubmit immediately with temp ID for optimistic update
            onSubmit({
                ...formData,
                id: tempId,
                isPending: true
            })

            try {
                const runner = useMock ? mockCreateWishlist : createWishlist
                const result = await runner(formData)
                // Call onSubmit again with real ID from API
                onSubmit({
                    ...result,
                    isPending: false
                })
                resetForm()
                onClose()
            } catch (err) {
                console.error("Erreur lors de la création de la wishlist :", err)
                onError?.(tempId)
                eventBus.emit('ui:toast', { message: t('createError'), type: 'error' })
            } finally {
                setIsSubmitting(false)
            }
        },
        [formData, onSubmit, onClose, resetForm, useMock, t],
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