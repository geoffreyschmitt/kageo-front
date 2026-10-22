import type { TImportedFields } from '@/shared/lib/extractWishFields'

export type TImportableForm = {
    name: string
    description: string
    price: number
    currency: string
    imageUrl: string
}

export type TFormPatch = Partial<TImportableForm & { purchaseUrl: string }>

const isBlank =(value: string): boolean => value.trim() === ''
const isEmptyPrice = (price: number): boolean => Number.isNaN(price) || price <= 0
const hasText = (value: string | undefined): value is string => value !== undefined && !isBlank(value)

// Returns only the fields to change. 'fillEmpty' never overwrites what the person
// typed; 'replace' overwrites every field the page provides. Priority and notes are
// not part of the form type, so they can never be touched.
export const applyImport = (
    current: TImportableForm,
    imported: TImportedFields,
    mode: 'fillEmpty' | 'replace',
): Partial<TImportableForm> => {
    const overwrite = mode === 'replace'
    const patch: Partial<TImportableForm> = {}

    if (hasText(imported.name) && (overwrite || isBlank(current.name))) patch.name = imported.name
    if (hasText(imported.description) && (overwrite || isBlank(current.description))) {
        patch.description = imported.description
    }
    if (hasText(imported.imageUrl) && (overwrite || isBlank(current.imageUrl))) patch.imageUrl = imported.imageUrl

    const hasPrice = imported.price !== undefined && Number.isFinite(imported.price) && imported.price > 0
    if (hasPrice && (overwrite || isEmptyPrice(current.price))) {
        patch.price = imported.price
        if (hasText(imported.currency)) patch.currency = imported.currency
    }

    return patch
}
