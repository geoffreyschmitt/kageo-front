import React, {useEffect, useRef, useState} from 'react'

import { useTranslations } from 'next-intl'

import type {TUpdateWishlistModal} from '@/features/UpdateWishlist'
import {useEditWishlistModel} from '@/features/UpdateWishlist/model'

import {WishlistForm} from '@/entities/wishlist/ui';

import {eventBus} from '@/shared/eventBus/lib/eventBus';
import {Modal} from '@/shared/ui';

import styles from './UpdateWishlistModal.module.css'

export const UpdateWishlistModal = ({onClose, onSubmit, initialData = {}}: TUpdateWishlistModal) => {
    const t = useTranslations('updateWishlistModal')
    const [isOpen, setIsOpen] = useState(false)
    const [initialDataToUse, setIsInitialDataToUse] = useState(initialData)
    // The listeners below are registered once but must reset to the latest prop.
    const initialDataRef = useRef(initialData)
    useEffect(() => {
        initialDataRef.current = initialData
    }, [initialData])

    useEffect(() => {
        const removeOpenModalEvent = eventBus.on('wishlist:openUpdateModal', (payload) => {
            const normalized = {
                ...payload,
                eventDate: payload.eventDate instanceof Date
                    ? payload.eventDate.toISOString().slice(0, 10)
                    : payload.eventDate ?? '',
            }
            setIsInitialDataToUse(normalized)
            setTimeout(() => {
                setIsOpen(true);
            }, 0)
        });
        const removeCloseModalEvent = eventBus.on('wishlist:closeUpdateModal', () => {
            setIsOpen(false);
            setIsInitialDataToUse(initialDataRef.current)
        });
        return () => {
            removeOpenModalEvent();
            removeCloseModalEvent();
        }
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
        initialData: initialDataToUse,
    })

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={t('title')}
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