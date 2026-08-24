'use client'

import { useDeleteWishlistModel } from '../model'
import type { TDeleteWishlistButton } from './DeleteWishlistButton.types'
import { DeleteWishlistConfirmationModal } from './DeleteWishlistConfirmationModal'

export const DeleteWishlistButton = ({
    wishlistId,
    wishlistName,
    onDelete,
    onError,
    className,
    children,
}: TDeleteWishlistButton) => {
    const { isDeleting, handleDelete, isConfirmOpen, openConfirm, closeConfirm } = useDeleteWishlistModel({
        wishlistId,
        onDelete,
        onError,
    })

    return (
        <>
            <button className={className} onClick={openConfirm} disabled={isDeleting}>
                {children}
            </button>
            <DeleteWishlistConfirmationModal
                isOpen={isConfirmOpen}
                onClose={closeConfirm}
                onConfirm={handleDelete}
                wishlistName={wishlistName || 'this wishlist'}
            />
        </>
    )
}
