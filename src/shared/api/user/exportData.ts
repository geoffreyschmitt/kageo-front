export const exportData = async (): Promise<void> => {
    const res = await fetch('/api/user/export')

    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`API error ${res.status}: ${text}`)
    }

    const data = await res.json()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `kageo-export-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}
