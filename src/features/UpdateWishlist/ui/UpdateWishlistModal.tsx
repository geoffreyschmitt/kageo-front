import React, {useEffect, useState} from 'react'

import type {TUpdateWishlistModal} from '@/features/UpdateWishlist'
import {useEditWishlistModel} from '@/features/UpdateWishlist/model'

import {WishlistForm} from '@/entities/wishlist/ui';

import {Modal} from '@/shared/ui';

import styles from './UpdateWishlistModal.module.css'
import {eventBus} from '@/shared/eventBus/lib/eventBus';

export const UpdateWishlistModal = ({onClose, onSubmit, initialData}: TUpdateWishlistModal) => {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    eventBus.on('wishlist:openUpdateModal', () => {
      setIsOpen(true);
    });
    eventBus.on('wishlist:closeUpdateModal', () => {
      setIsOpen(false);
    });
  }, [])

  const handleClose = () => {
    eventBus.emit('wishlist:closeUpdateModal', {})
    onClose?.();
  }

  const {
    formData,
    errors,
    isSubmitting,
    handleInputChange,
    handleSubmit,
  } = useEditWishlistModel({
    onSubmit,
    onClose: handleClose,
    initialData,
    useMock: true,
  })

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Modifier la Wishlist"
      className={styles.updateWishlistModal}
    >
      <WishlistForm
        formData={formData}
        errors={errors}
        isSubmitting={isSubmitting}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        onCancel={handleClose}
      />
    </Modal>
  )
}