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
    const { isEdit, savedUrl, url, lastHandledUrl } = input
    if (!isHttpUrl(url)) return 'ignore'
    if (url === lastHandledUrl) return 'ignore'
    if (isEdit && url === savedUrl) return 'ignore'
    if (isEdit && savedUrl !== '') return 'askReplace'
    return 'fetchFillEmpty'
}
