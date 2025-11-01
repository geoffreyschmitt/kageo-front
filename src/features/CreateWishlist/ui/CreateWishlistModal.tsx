import React, {useEffect, useState} from 'react'

import {WishlistForm} from '@/entities/wishlist/ui';

import {Modal} from '@/shared/ui';

import styles from './CreateWishlistModal.module.css'
import {TCreateWishlistModal} from '@/features/CreateWishlist/ui/CreateWishlistModal.types';
import {useCreateWishlistModel} from '@/features/CreateWishlist';
import {eventBus} from '@/shared/eventBus/lib/eventBus';

export const CreateWishlistModal = ({onClose, onSubmit}: TCreateWishlistModal) => {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const removeOpenModalEvent = eventBus.on('wishlist:openCreationModal', () => {
      setIsOpen(true)
    });
    const removeCloseModalEvent = eventBus.on('wishlist:closeCreationModal', () => {
      setIsOpen(false);
    });
    return () => {
      removeOpenModalEvent();
      removeCloseModalEvent();
    }
  }, [])

  const handleClose = () => {
    eventBus.emit('wishlist:closeCreationModal', {})
    onClose?.();
  }

  const {
    formData,
    errors,
    isSubmitting,
    handleInputChange,
    handleSubmit,
  } = useCreateWishlistModel({
    onSubmit,
    onClose: handleClose,
    useMock: true,
  })


  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Créer une Wishlist"
      className={styles.createWishlistModal}
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