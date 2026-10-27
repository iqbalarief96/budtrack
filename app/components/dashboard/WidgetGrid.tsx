'use client'

import React from 'react'
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
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { FiArrowDown, FiArrowUp, FiEyeOff, FiMove } from 'react-icons/fi'
import WidgetRenderer from './WidgetRenderer'
import type { DashboardWidget, WidgetSize } from './WidgetTypes'
import { SIZE_CLASS, SIZE_LABEL, widgetMeta } from './widgetCatalog'

type FrameProps = {
  widget: DashboardWidget
  index: number
  count: number
  editing: boolean
  selectedWalletId?: string
  onMove: (from: number, to: number) => void
  onResize: (id: string, size: WidgetSize) => void
  onRemove: (id: string) => void
}

function WidgetFrame({ widget, index, count, editing, selectedWalletId, onMove, onResize, onRemove }: FrameProps) {
  const meta = widgetMeta(widget.type)
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
    disabled: !editing,
  })
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition }
  // Widgets with their own card/heading render bare outside edit mode, so
  // there's no "Title › Title" duplication or card-in-card.
  const bare = meta.ownChrome && !editing
  const btn = 'rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-30'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${SIZE_CLASS[widget.size]} ${isDragging ? 'z-10 opacity-70' : ''} ${
        bare ? '' : `rounded-lg border bg-white shadow-sm ${editing ? 'border-dashed border-blue-300' : 'border-gray-200'}`
      }`}
    >
      {editing && (
        <div className="flex flex-wrap items-center gap-1 border-b border-blue-100 bg-blue-50/60 px-2 py-1.5">
          <button ref={setActivatorNodeRef} type="button" aria-label={`Geser ${widget.title}`} className={`${btn} cursor-grab touch-none`} {...attributes} {...listeners}>
            <FiMove />
          </button>
          <span className="mr-auto truncate text-xs font-medium text-gray-700">{widget.title}</span>
          <button type="button" aria-label="Naik" className={btn} disabled={index === 0} onClick={() => onMove(index, index - 1)}><FiArrowUp /></button>
          <button type="button" aria-label="Turun" className={btn} disabled={index === count - 1} onClick={() => onMove(index, index + 1)}><FiArrowDown /></button>
          <div className="mx-1 flex overflow-hidden rounded border border-gray-200 bg-white" role="group" aria-label="Ukuran widget">
            {meta.sizes.map((s) => (
              <button key={s} type="button" onClick={() => onResize(widget.id, s)} aria-pressed={widget.size === s}
                className={`px-1.5 py-0.5 text-[11px] ${widget.size === s ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                {SIZE_LABEL[s]}
              </button>
            ))}
          </div>
          <button type="button" aria-label={`Sembunyikan ${widget.title}`} className={`${btn} hover:text-red-600`} onClick={() => onRemove(widget.id)}><FiEyeOff /></button>
        </div>
      )}
      <div className={bare ? '' : 'p-4'}>
        {!bare && !editing && <h3 className="mb-3 text-sm font-semibold text-gray-700">{widget.title}</h3>}
        <WidgetRenderer widget={widget} selectedWalletId={selectedWalletId} />
      </div>
    </div>
  )
}

type GridProps = {
  widgets: DashboardWidget[]
  editing: boolean
  selectedWalletId?: string
  onChange: (next: DashboardWidget[]) => void
}

export default function WidgetGrid({ widgets, editing, selectedWalletId, onChange }: GridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const move = (from: number, to: number) => {
    if (to < 0 || to >= widgets.length) return
    onChange(arrayMove(widgets, from, to))
  }
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return
    move(widgets.findIndex((w) => w.id === e.active.id), widgets.findIndex((w) => w.id === e.over!.id))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-flow-row-dense grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {widgets.map((w, i) => (
            <WidgetFrame
              key={w.id}
              widget={w}
              index={i}
              count={widgets.length}
              editing={editing}
              selectedWalletId={selectedWalletId}
              onMove={move}
              onResize={(id, size) => onChange(widgets.map((x) => (x.id === id ? { ...x, size } : x)))}
              onRemove={(id) => onChange(widgets.filter((x) => x.id !== id))}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
