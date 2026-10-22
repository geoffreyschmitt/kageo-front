const isHttpUrl = (value: string): boolean => {
    try {
        const { protocol } = new URL(value)
        return protocol === 'http:' || protocol === 'https:'
    } catch {
        return false
    }
}

export const decideLinkAction = (input: {
    isEdit: boolean
    savedUrl: string
    url: string
    lastHandledUrl: string
}): 'ignore' | 'fetchFillEmpty' | 'askReplace' => {
    const isEdit = input.isEdit
    const url = input.url.trim()
    const savedUrl = input.savedUrl.trim()
    const lastHandledUrl = input.lastHandledUrl.trim()
    if (!isHttpUrl(url)) return 'ignore'
    if (url === lastHandledUrl) return 'ignore'
    if (isEdit && url === savedUrl) return 'ignore'
    if (isEdit && savedUrl !== '') return 'askReplace'
    return 'fetchFillEmpty'
}

// True when a pending 'replace?' question no longer matches the field: the url went
// back to the saved one, was cleared, or is no longer http(s). A different valid url
// is not a dismissal; decideLinkAction asks again for it.
export const shouldDismissQuestion = (input: { savedUrl: string; url: string; pendingUrl: string }): boolean => {
    const url = input.url.trim()
    if (url === input.pendingUrl.trim()) return false
    return !isHttpUrl(url) || url === input.savedUrl.trim()
}
