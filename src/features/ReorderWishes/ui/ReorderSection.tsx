'use client'

import Image from 'next/image'

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {CSS} from '@dnd-kit/utilities'
import {useTranslations} from 'next-intl'

import type {TWishCard} from '@/widgets/WishCard'

import styles from './ReorderSection.module.css'

type TReorderSectionProps = {
  title: string
  items: TWishCard[]
  // The section's ids in their new order.
  onChange: (sectionIds: string[]) => void
  onToTop: (id: string) => void
}

type TRowProps = {
  item: TWishCard
  isFirst: boolean
  onToTop: (id: string) => void
}

function ReorderRow({item, isFirst, onToTop}: TRowProps) {
  const t = useTranslations('wishlist')
  const {attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging} = useSortable({
    id: item.id,
  })

  return (
    <li
      ref={setNodeRef}
      className={`${styles.row} ${isDragging ? styles['row--dragging'] : ''}`}
      style={{transform: CSS.Transform.toString(transform), transition}}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        className={styles.handle}
        aria-label={t('reorderHandle', {name: item.name})}
        {...attributes}
        {...listeners}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <circle cx="5.5" cy="3.5" r="1.3"/><circle cx="10.5" cy="3.5" r="1.3"/>
          <circle cx="5.5" cy="8" r="1.3"/><circle cx="10.5" cy="8" r="1.3"/>
          <circle cx="5.5" cy="12.5" r="1.3"/><circle cx="10.5" cy="12.5" r="1.3"/>
        </svg>
      </button>
      <span className={styles.thumb} aria-hidden="true">
        {item.imageUrl ? (
          <Image src={item.imageUrl} alt="" width={96} height={96} className={styles.thumbImage}/>
        ) : (
          <span className={styles.thumbInitial}>{item.name.charAt(0).toUpperCase()}</span>
        )}
      </span>
      <span className={styles.name}>{item.name}</span>
      <button type="button" className={styles.toTop} disabled={isFirst} onClick={() => onToTop(item.id)}>
        {t('reorderMoveToTop')}
      </button>
    </li>
  )
}

export function ReorderSection({title, items, onChange, onToTop}: TReorderSectionProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {activationConstraint: {distance: 4}}),
    // A short hold starts a touch drag, so a swipe still scrolls the page.
    useSensor(TouchSensor, {activationConstraint: {delay: 150, tolerance: 6}}),
    useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates}),
  )

  const handleDragEnd = ({active, over}: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const ids = items.map((item) => item.id)
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from === -1 || to === -1) return
    onChange(arrayMove(ids, from, to))
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{title}</h2>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          <ul className={styles.list}>
            {items.map((item, index) => (
              <ReorderRow key={item.id} item={item} isFirst={index === 0} onToTop={onToTop}/>
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </section>
  )
}
