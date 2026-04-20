'use client'

import { useState } from 'react'

export const usePotDashboardModel = () => {
    const [isExpanded, setIsExpanded] = useState(true)

    const toggle = () => setIsExpanded(prev => !prev)

    return { isExpanded, toggle }
}
