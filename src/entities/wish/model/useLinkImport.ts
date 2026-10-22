'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { importWishFromUrl } from '@/shared/api/wish/importFromUrl'

import { applyImport, type TImportableForm } from './applyImport'
import { decideLinkAction, shouldCancelInFlight, shouldDismissQuestion } from './linkImportPolicy'

export type TLinkImport = {
    status: 'idle' | 'loading' | 'found' | 'notFound' | 'asking'
    onLinkPaste: (pastedUrl: string) => void
    onLinkBlur: () => void
    onReplace: () => void
    onKeep: () => void
    reset: () => void // back to a clean slate: drops any in-flight request and the question
}

type TParams<T extends TImportableForm & { purchaseUrl: string }> = {
    formData: T
    applyPatch: (patch: Partial<TImportableForm>) => void
    savedUrl?: string // defined means Edit mode
}

export const useLinkImport = <T extends TImportableForm & { purchaseUrl: string }>({
    formData,
    applyPatch,
    savedUrl,
}: TParams<T>): TLinkImport => {
    const [status, setStatus] = useState<TLinkImport['status']>('idle')

    // Always the latest values, so a late response never merges into stale state.
    const formRef = useRef(formData)
    const applyRef = useRef(applyPatch)
    useEffect(() => {
        formRef.current = formData
        applyRef.current = applyPatch
    })

    const lastHandledRef = useRef('')
    const pendingUrlRef = useRef('')
    const requestIdRef = useRef(0)
    const controllerRef = useRef<AbortController | null>(null)
    const inFlightUrlRef = useRef('') // url of the running request, '' when none

    const run = useCallback(async (url: string, mode: 'fillEmpty' | 'replace') => {
        controllerRef.current?.abort()
        const controller = new AbortController()
        controllerRef.current = controller
        const requestId = ++requestIdRef.current
        inFlightUrlRef.current = url
        setStatus('loading')

        try {
            const fields = await importWishFromUrl(url, controller.signal)
            if (requestId !== requestIdRef.current) return // a newer request owns the state
            inFlightUrlRef.current = ''
            if (!fields) {
                setStatus('notFound')
                return
            }
            const patch = applyImport(formRef.current, fields, mode)
            if (Object.keys(patch).length > 0) applyRef.current(patch)
            setStatus('found')
        } catch (error) {
            if (requestId !== requestIdRef.current || controller.signal.aborted) return // silent
            inFlightUrlRef.current = ''
            const rateLimited = error instanceof Error && error.message.includes('429')
            setStatus(rateLimited ? 'idle' : 'notFound') // 429: the toast already shows
        }
    }, [])

    const handleUrl = useCallback(
        (rawUrl: string) => {
            const url = rawUrl.trim()
            if (shouldCancelInFlight({ inFlightUrl: inFlightUrlRef.current, url })) {
                // The field moved on from the url being imported: drop that answer.
                controllerRef.current?.abort()
                requestIdRef.current++
                inFlightUrlRef.current = ''
                lastHandledRef.current = '' // so re-entering that url imports again
                setStatus('idle')
            }
            if (pendingUrlRef.current && shouldDismissQuestion({ savedUrl: savedUrl ?? '', url, pendingUrl: pendingUrlRef.current })) {
                // The field no longer holds the url being asked about.
                pendingUrlRef.current = ''
                lastHandledRef.current = '' // so re-entering that url asks again
                setStatus('idle')
                return
            }
            const action = decideLinkAction({
                isEdit: savedUrl !== undefined,
                savedUrl: savedUrl ?? '',
                url,
                lastHandledUrl: lastHandledRef.current,
            })
            if (action === 'ignore') return
            lastHandledRef.current = url
            if (action === 'askReplace') {
                controllerRef.current?.abort()
                requestIdRef.current++
                pendingUrlRef.current = url
                setStatus('asking') // nothing is fetched until the person answers
                return
            }
            void run(url, 'fillEmpty')
        },
        [savedUrl, run],
    )

    const onLinkPaste = useCallback((pastedUrl: string) => handleUrl(pastedUrl), [handleUrl])
    const onLinkBlur = useCallback(() => handleUrl(formRef.current.purchaseUrl), [handleUrl])

    const onReplace = useCallback(() => {
        const url = pendingUrlRef.current
        if (!url) return
        pendingUrlRef.current = ''
        if (formRef.current.purchaseUrl.trim() !== url) {
            // Field changed since the question: drop it rather than import a stale url.
            lastHandledRef.current = ''
            setStatus('idle')
            return
        }
        void run(url, 'replace')
    }, [run])

    const onKeep = useCallback(() => {
        pendingUrlRef.current = ''
        setStatus('idle')
    }, [])

    const reset = useCallback(() => {
        controllerRef.current?.abort()
        requestIdRef.current++ // a late answer must not touch the next form
        inFlightUrlRef.current = ''
        lastHandledRef.current = ''
        pendingUrlRef.current = ''
        setStatus('idle')
    }, [])

    useEffect(
        () => () => {
            requestIdRef.current++
            controllerRef.current?.abort()
        },
        [],
    )

    return { status, onLinkPaste, onLinkBlur, onReplace, onKeep, reset }
}
