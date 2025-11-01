import type {TWishlistValidationErrors} from '@/entities/wishlist';
import {isValidUrl} from '@/shared/lib/isValidUrl';

export const validateWishlistForm = (formData): {
  errorList: TWishlistValidationErrors,
  hasError: boolean
} => {
  const errorList: TWishlistValidationErrors = {}

  if (!formData.name.trim()) {
    errorList.name = "Le nom de la wishlist est requis"
  } else if (formData.name.trim().length < 3) {
    errorList.name = "Le nom doit contenir au moins 3 caractères"
  }

  if (!formData.description.trim()) {
    errorList.description = "La description est requise"
  } else if (formData.description.trim().length < 10) {
    errorList.description = "La description doit contenir au moins 10 caractères"
  }

  if (formData.coverImage && !isValidUrl(formData.coverImage)) {
    errorList.coverImage = "URL d'image invalide"
  }

  return {
    errorList,
    hasError: Object.keys(errorList).length === 0,
  }
}