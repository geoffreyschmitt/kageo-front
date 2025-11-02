import {useCallback, useEffect, useState} from 'react'

import {updateWishlist} from '@/services/wishlist/updateWishlist'

import {TWishlistFormData, TWishlistValidationErrors, validateWishlistForm} from '@/entities/wishlist'
import {DEFAULT_WISHLIST_SETTINGS} from '@/entities/wishlist/model/constants';

import {mockUpdateWishlist} from './lib/mockUpdateWishlist'


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

  useEffect(() => {
    resetForm()
  }, [initialData])


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

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault()

      const {errorList, hasError} = validateWishlistForm(formData);
      setErrors(errorList)

      if (hasError) return

      setIsSubmitting(true)
      try {
        const runner = useMock ? mockUpdateWishlist : updateWishlist
        await runner(formData)
        onSubmit(formData)
        resetForm()
        onClose()
      } catch (err) {
        console.error('Erreur lors de la mise à jour de la wishlist :', err)
      } finally {
        setIsSubmitting(false)
      }
    },
    [formData, onSubmit, onClose, resetForm, useMock, validateWishlistForm],
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