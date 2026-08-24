import type {TWishlistValidationErrors} from '@/entities/wishlist';

import {isValidUrl} from '@/shared/lib/isValidUrl';

type TValidateWishlistFormData = {
    name: string
    description: string
    coverImage?: string
    eventDate: string
}

export const validateWishlistForm = (
    formData: TValidateWishlistFormData,
    t: (key: string) => string,
): {
    errorList: TWishlistValidationErrors,
    hasError: boolean
} => {
    const errorList: TWishlistValidationErrors = {}

    if (!formData.name.trim()) {
        errorList.name = t('errors.nameRequired')
    } else if (formData.name.trim().length < 3) {
        errorList.name = t('errors.nameTooShort')
    }

    if (!formData.description.trim()) {
        errorList.description = t('errors.descriptionRequired')
    } else if (formData.description.trim().length < 10) {
        errorList.description = t('errors.descriptionTooShort')
    }

    if (formData.coverImage && !isValidUrl(formData.coverImage)) {
        errorList.coverImage = t('errors.invalidImageUrl')
    }

    if (!formData.eventDate) {
        errorList.eventDate = t('errors.eventDateRequired')
    } else if (isNaN(new Date(formData.eventDate).getTime())) {
        errorList.eventDate = t('errors.invalidDate')
    }

    return {
        errorList,
        hasError: Object.keys(errorList).length > 0,
    }
}
