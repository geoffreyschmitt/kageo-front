
import { useState, useCallback  } from "react"
import type { TWishFormData, TWishValidationErrors, TWishPriority} from "@/entities/wish"
import { addWish as addWishService } from "@/services/wishlist/addWish"
import { mockAddWish } from "./lib/mockAddWish"


type TUseAddWishModelParams = {
    onSubmit: (item: TWishFormData & { id: string }) => void
    onClose: () => void
    useMock?: boolean
}

export const useAddWishModel = ({
    onSubmit,
    onClose,
    useMock = false,
}: TUseAddWishModelParams) => {
    const [formData, setFormData] = useState<TWishFormData>({
        name: "",
        description: "",
        price: 0,
        currency: "€",
        imageUrl: "",
        priority: "medium",
        purchaseUrl: "",
        notes: "",
    })

    const [errors, setErrors] = useState<TWishValidationErrors>({})
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

    const validateForm = useCallback((): boolean => {
        const newErrors: TWishValidationErrors = {}

        if (!formData.name.trim()) newErrors.name = "Le nom est requis"
        if (!formData.description.trim()) newErrors.description = "La description est requise"
        if (!(typeof formData.price === "number") || Number.isNaN(formData.price) || formData.price <= 0)
            newErrors.price = "Le prix doit être supérieur à 0"
        if (formData.purchaseUrl && !isValidUrl(formData.purchaseUrl)) newErrors.purchaseUrl = "URL invalide"
        if (formData.imageUrl && !isValidUrl(formData.imageUrl)) newErrors.imageUrl = "URL d'image invalide"

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }, [formData])

    const isValidUrl = (value: string): boolean => {
        try {
            // eslint-disable-next-line no-new
            new URL(value)
            return true
        } catch {
            return false
        }
    }

    // Generic setter that accepts string | number for fields.
    const handleInputChange = useCallback(
        (field: keyof TWishFormData, value: string | number | TWishPriority) => {
            setFormData(prev => {
                // ensure numeric fields remain numbers
                const normalized =
                    field === "price" ? (typeof value === "number" ? value : Number.parseFloat(String(value) || "0")) : value
                return { ...prev, [field]: normalized } as TWishFormData
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
        (field: keyof TWishFormData, value: string | number | TWishPriority) => {
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

    const resetForm = useCallback(() => {
        setFormData({
            name: "",
            description: "",
            price: 0,
            currency: "€",
            imageUrl: "",
            priority: "medium",
            purchaseUrl: "",
            notes: "",
        })
        setErrors({})
    }, [])

    const handleSubmit = useCallback(
        async (e?: React.FormEvent) => {
            if (e) e.preventDefault()
            if (!validateForm()) return

            setIsSubmitting(true)
            try {
                const runner = useMock ? mockAddWish : addWishService
                const result = await runner(formData)
                // ensure id exists in result
                onSubmit(result)
                resetForm()
                onClose()
            } catch (err) {
                console.error("Erreur lors de l'ajout de souhait :", err)
                // Optionally set a global error state here
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
        handleCheckboxChange,
        handleSubmit,
        resetForm,
        validateForm,
    }
}