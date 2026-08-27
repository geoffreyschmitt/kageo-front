export const formatDate = (date: string | Date, locale: string): string => {
    const parsed = typeof date === 'string' ? new Date(date) : date

    return parsed.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
}
