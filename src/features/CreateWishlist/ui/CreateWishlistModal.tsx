import React, {useEffect, useState} from 'react'

import { useTranslations } from 'next-intl'

import {useCreateWishlistModel} from '@/features/CreateWishlist';
import {TCreateWishlistModal} from '@/features/CreateWishlist/ui/CreateWishlistModal.types';

import {WishlistForm} from '@/entities/wishlist/ui';

import {eventBus} from '@/shared/eventBus/lib/eventBus';
import {Modal} from '@/shared/ui';

import styles from './CreateWishlistModal.module.css'


export const CreateWishlistModal = ({onClose, onSubmit, onError}: TCreateWishlistModal) => {
  const t = useTranslations('createWishlistModal')
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
    onError,
    onClose: handleClose,
  })


  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('title')}
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