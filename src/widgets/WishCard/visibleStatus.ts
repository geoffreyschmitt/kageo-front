import type {TWishStatus} from '@/entities/wish'

type TInput = {
    status: TWishStatus
    isOwner: boolean
    isHistory: boolean
}

const GUEST_ONLY: TWishStatus[] = ['reserved', 'purchased', 'funded']

/**
 * Whether reservation state is hidden from the viewer. The owner never sees it on a live list
 * (surprise is sacred); on an archived list the event is over, so the owner sees who gave what.
 */
export const hidesGuestState = ({isOwner, isHistory}: Pick<TInput, 'isOwner' | 'isHistory'>): boolean =>
    isOwner && !isHistory

export const resolveVisibleStatus = (input: TInput): TWishStatus =>
    hidesGuestState(input) && GUEST_ONLY.includes(input.status) ? 'wanted' : input.status
