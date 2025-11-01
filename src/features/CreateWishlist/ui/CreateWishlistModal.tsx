import React from 'react'

import {WishlistForm} from '@/entities/wishlist/ui';

import {Modal} from '@/shared/ui';

import styles from './CreateWishlistModal.module.css'
import {TCreateWishlistModal} from '@/features/CreateWishlist/ui/CreateWishlistModal.types';
import {useCreateWishlistModel} from '@/features/CreateWishlist';

export const CreateWishlistModal = ({isOpen, onClose, onSubmit}: TCreateWishlistModal) => {
  const {
    formData,
    errors,
    isSubmitting,
    handleInputChange,
    handleSubmit,
  } = useCreateWishlistModel({
    onSubmit,
    onClose,
    useMock: true,
  })

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Créer une Wishlist"
      className={styles.createWishlistModal}
    >
      <WishlistForm
        formData={formData}
        errors={errors}
        isSubmitting={isSubmitting}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        onCancel={onClose}
      />
    </Modal>
  )
}