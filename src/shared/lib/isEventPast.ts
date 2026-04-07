export const isEventPast = (eventDate: Date): boolean => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return eventDate.getTime() < today.getTime()
}
