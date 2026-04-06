import {useCallback, useEffect, useState} from 'react'

import {updateWishlist} from '@/shared/api/wishlist/updateWishlist'
import {eventBus} from '@/shared/eventBus'

import {TWishlistFormData, TWishlistValidationErrors, validateWishlistForm} from '@/entities/wishlist'
import {DEFAULT_WISHLIST_SETTINGS} from '@/entities/wishlist/model/constants';

import {mockUpdateWishlist} from './lib/mockUpdateWishlist'


type TUseEditWishlistModel = {
    onSubmit: (wishlistData: TWishlistFormData & { id: string }) => void
    onClose: () => void
    initialData?: Partial<TWishlistFormData> & { id?: string }
    useMock?: boolean
}

export const useEditWishlistModel = ({
    onSubmit,
    onClose,
    initialData = {},
    useMock = false,
}: TUseEditWishlistModel) => {
    // Extract and store the wishlist ID separately
    const [wishlistId, setWishlistId] = useState<string | undefined>(initialData.id)
    
    const [formData, setFormData] = useState<TWishlistFormData>({
        ...DEFAULT_WISHLIST_SETTINGS,
        ...initialData,
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
            ...initialData,
        })
        setErrors({})
    }, [initialData])

    useEffect(() => {
        setWishlistId(initialData.id)
        resetForm()
    }, [initialData, resetForm])

    const handleSubmit = useCallback(
        async (e?: React.FormEvent) => {
            if (e) e.preventDefault()

            const {errorList, hasError} = validateWishlistForm(formData);
            setErrors(errorList)

            if (hasError) return

            setIsSubmitting(true)
            try {
                if (!wishlistId) throw new Error('Missing wishlist ID')
                const dataWithId = { ...formData, id: wishlistId }
                const runner = useMock ? mockUpdateWishlist : updateWishlist
                const result = await runner(dataWithId)
                onSubmit(result)
                resetForm()
                onClose()
            } catch (err) {
                console.error('Erreur lors de la mise à jour de la wishlist :', err)
                eventBus.emit('ui:toast', { message: 'Could not update wishlist — please try again', type: 'error' })
            } finally {
                setIsSubmitting(false)
            }
        },
        [formData, onSubmit, onClose, resetForm, useMock, wishlistId],
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