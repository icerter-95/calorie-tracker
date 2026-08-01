import { useRef, useState } from 'react'
import type { MealEntry } from '../types'
import MealCard from './MealCard'

const DELETE_WIDTH = 80
const OPEN_THRESHOLD = DELETE_WIDTH * 0.4
const FULL_DELETE_OVERSWIPE = DELETE_WIDTH * 0.35
const AXIS_LOCK_PX = 8

interface SwipeableMealCardProps {
  meal: MealEntry
  onEdit: () => void
  onDelete: () => void
  hideMealType?: boolean
}

export default function SwipeableMealCard({
  meal,
  onEdit,
  onDelete,
  hideMealType,
}: SwipeableMealCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const offsetRef = useRef(0)
  const startX = useRef(0)
  const startY = useRef(0)
  const startOffset = useRef(0)
  const dragging = useRef(false)
  const dragAxis = useRef<'x' | 'y' | null>(null)

  function setDragOffset(value: number) {
    offsetRef.current = value
    setOffset(value)
  }

  function maxDragDistance() {
    return containerRef.current?.offsetWidth ?? DELETE_WIDTH * 2
  }

  function snapOpen() {
    setDragOffset(-DELETE_WIDTH)
  }

  function snapClosed() {
    setDragOffset(0)
  }

  function triggerDelete() {
    onDelete()
  }

  function handlePointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest('button')) return

    startX.current = e.clientX
    startY.current = e.clientY
    startOffset.current = offsetRef.current
    dragging.current = true
    dragAxis.current = null
    setIsDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging.current) return

    const deltaX = e.clientX - startX.current
    const deltaY = e.clientY - startY.current

    if (dragAxis.current === null) {
      if (Math.abs(deltaX) < AXIS_LOCK_PX && Math.abs(deltaY) < AXIS_LOCK_PX) return
      dragAxis.current = Math.abs(deltaX) > Math.abs(deltaY) ? 'x' : 'y'
      if (dragAxis.current === 'y') {
        dragging.current = false
        setIsDragging(false)
        e.currentTarget.releasePointerCapture(e.pointerId)
        return
      }
    }

    const newOffset = Math.min(
      0,
      Math.max(-maxDragDistance(), startOffset.current + deltaX),
    )
    setDragOffset(newOffset)
  }

  function finishDrag(e: React.PointerEvent) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }

    const wasHorizontal = dragAxis.current === 'x'
    dragging.current = false
    dragAxis.current = null
    setIsDragging(false)

    if (!wasHorizontal) return

    const currentOffset = offsetRef.current
    const fullDeleteThreshold = -(DELETE_WIDTH + FULL_DELETE_OVERSWIPE)

    if (currentOffset <= fullDeleteThreshold) {
      triggerDelete()
      return
    }

    if (currentOffset < -OPEN_THRESHOLD) {
      snapOpen()
    } else {
      snapClosed()
    }
  }

  function handleDeleteClick() {
    triggerDelete()
  }

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-2xl">
      <div
        className="absolute inset-y-0 right-0 flex items-stretch"
        style={{ width: DELETE_WIDTH }}
      >
        <button
          type="button"
          onClick={handleDeleteClick}
          className="flex w-full items-center justify-center bg-red-600 text-sm font-medium text-white"
        >
          Delete
        </button>
      </div>

      <div
        className={`relative touch-pan-y ${isDragging ? '' : 'transition-transform duration-200 ease-out'}`}
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <MealCard
          meal={meal}
          onEdit={onEdit}
          onDelete={onDelete}
          hideDelete
          hideMealType={hideMealType}
        />
      </div>
    </div>
  )
}
