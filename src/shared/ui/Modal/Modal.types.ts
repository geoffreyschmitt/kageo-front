export type TModal = {
    className?: string
    isOpen: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
}
