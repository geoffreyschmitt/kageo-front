'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { importWishFromUrl } from '@/shared/api/wish/importFromUrl'
import type { TImportedFields, TImportedVariant } from '@/shared/lib/extractWishFields'

import { applyImport, type TFormPatch, type TImportableForm } from './applyImport'
import {
    decideDismissal,
    decideFillStart,
    decideImportOutcome,
    isRateLimitError,
    toVersionChoices,
    type TImportMode,
    type TLinkImportStatus,
    type TVersionChoice,
} from './importFlow'
import { applyVersion, extractFirstUrl } from './importHelpers'

export type TLinkImport = {
    status: TLinkImportStatus
    versions: TVersionChoice[]
    canFill: boolean
    onFill: () => void
    onChooseMode: (mode: TImportMode) => void
    onChooseVersion: (index: number) => void
    reset: () => void // back to a clean slate: drops any in-flight request and the question
}

type TParams<T extends TImportableForm & { purchaseUrl: string }> = {
    formData: T
    applyPatch: (patch: TFormPatch) => void
    savedUrl?: string // defined means Edit mode; a non-empty one asks Replace / Only fill empty
}

type TFlow = {
    status: TLinkImportStatus
    askedUrl: string // link the current question is about, '' when none
    askedPrice: number // form price when the version question appeared
    pending: { base: TImportedFields; variants: TImportedVariant[]; mode: TImportMode } | null
    baseToApply: TImportedFields | null // product-level fields to put in empty fields (price typed)
}

const IDLE: TFlow = { status: 'idle', askedUrl: '', askedPrice: 0, pending: null, baseToApply: null }
const NO_VERSIONS: TVersionChoice[] = []

export const useLinkImport = <T extends TImportableForm & { purchaseUrl: string }>({
    formData,
    applyPatch,
    savedUrl,
}: TParams<T>): TLinkImport => {
    const [storedFlow, setFlow] = useState<TFlow>(IDLE)

    // A question disappears when the link changes (nothing applied) or, for the version
    // question, when the person types a price (product-level fields then go to empty
    // fields). Adjusted while rendering, so the question never shows for a stale link.
    const dismissal = decideDismissal({
        status: storedFlow.status,
        askedUrl: storedFlow.askedUrl,
        linkText: formData.purchaseUrl,
        askedPrice: storedFlow.askedPrice,
        price: formData.price,
    })
    let flow = storedFlow
    if (dismissal !== 'none') {
        flow = dismissal === 'applyBase' && storedFlow.pending
            ? { ...IDLE, status: 'found', baseToApply: storedFlow.pending.base }
            : IDLE
        setFlow(flow)
    }

    // Always the latest values, so a late response never merges into stale state.
    const formRef = useRef(formData)
    const applyRef = useRef(applyPatch)
    const flowRef = useRef(flow)
    useEffect(() => {
        formRef.current = formData
        applyRef.current = applyPatch
        flowRef.current = flow
    })

    const requestIdRef = useRef(0)
    const controllerRef = useRef<AbortController | null>(null)
    const loadingRef = useRef(false)

    const apply = useCallback((patch: TFormPatch) => {
        if (Object.keys(patch).length > 0) applyRef.current(patch)
    }, [])

    const { baseToApply } = flow
    useEffect(() => {
        if (baseToApply) apply(applyImport(formRef.current, baseToApply, 'fillEmpty'))
    }, [baseToApply, apply])

    // Drops any running request: its answer will never apply.
    const cancel = useCallback(() => {
        controllerRef.current?.abort()
        controllerRef.current = null
        requestIdRef.current++
        loadingRef.current = false
    }, [])

    const run = useCallback(
        async (url: string, mode: TImportMode) => {
            cancel()
            const controller = new AbortController()
            controllerRef.current = controller
            const requestId = requestIdRef.current
            loadingRef.current = true
            setFlow({ ...IDLE, status: 'loading' })

            try {
                const result = await importWishFromUrl(url, controller.signal)
                if (requestId !== requestIdRef.current) return // reset, unmount or newer request
                loadingRef.current = false
                if (formRef.current.purchaseUrl.trim() !== url) {
                    setFlow(IDLE) // the link changed while loading: this answer is for another link
                    return
                }
                const outcome = decideImportOutcome(result, mode, formRef.current.price)
                switch (outcome.kind) {
                    case 'notFound':
                        setFlow({ ...IDLE, status: 'notFound' })
                        return
                    case 'applyFields':
                        apply(applyImport(formRef.current, outcome.fields, outcome.mode))
                        setFlow({ ...IDLE, status: 'found' })
                        return
                    case 'applyVersion':
                        apply(applyVersion(formRef.current, outcome.base, outcome.variant, outcome.mode))
                        setFlow({ ...IDLE, status: 'found' })
                        return
                    case 'ask':
                        // Nothing from the import is applied until a version is chosen.
                        setFlow({
                            ...IDLE,
                            status: 'chooseVersion',
                            askedUrl: url,
                            askedPrice: formRef.current.price,
                            pending: { base: outcome.base, variants: outcome.variants, mode: outcome.mode },
                        })
                        return
                }
            } catch (error) {
                if (requestId !== requestIdRef.current || controller.signal.aborted) return // silent
                loadingRef.current = false
                // 429: the toast already shows, the form stays usable.
                setFlow({ ...IDLE, status: isRateLimitError(error) ? 'idle' : 'notFound' })
            }
        },
        [apply, cancel],
    )

    const onFill = useCallback(() => {
        if (loadingRef.current) return
        const start = decideFillStart({ linkText: formRef.current.purchaseUrl, savedUrl })
        if (start.kind === 'none') return
        if (start.replaceFieldText) applyRef.current({ purchaseUrl: start.url })
        if (start.kind === 'askMode') {
            cancel()
            setFlow({ ...IDLE, status: 'chooseMode', askedUrl: start.url }) // no fetch before the answer
            return
        }
        void run(start.url, 'fillEmpty')
    }, [savedUrl, cancel, run])

    const onChooseMode = useCallback(
        (mode: TImportMode) => {
            const current = flowRef.current
            if (current.status !== 'chooseMode' || !current.askedUrl) return
            if (formRef.current.purchaseUrl.trim() !== current.askedUrl) {
                setFlow(IDLE) // the field changed since the question: import nothing
                return
            }
            void run(current.askedUrl, mode)
        },
        [run],
    )

    const onChooseVersion = useCallback(
        (index: number) => {
            const current = flowRef.current
            const pending = current.status === 'chooseVersion' ? current.pending : null
            const variant = pending?.variants[index]
            if (!pending || !variant) return
            apply(applyVersion(formRef.current, pending.base, variant, pending.mode))
            setFlow({ ...IDLE, status: 'found' })
        },
        [apply],
    )

    const reset = useCallback(() => {
        cancel() // a late answer must not touch the next form
        setFlow(IDLE)
    }, [cancel])

    useEffect(
        () => () => {
            requestIdRef.current++
            controllerRef.current?.abort()
        },
        [],
    )

    const { pending } = flow
    const versions = useMemo(() => (pending ? toVersionChoices(pending.variants) : NO_VERSIONS), [pending])
    const canFill = extractFirstUrl(formData.purchaseUrl) !== null

    return { status: flow.status, versions, canFill, onFill, onChooseMode, onChooseVersion, reset }
}
