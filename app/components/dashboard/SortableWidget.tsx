'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DashboardWidget } from './WidgetTypes';
import { FiMove, FiX, FiMaximize } from 'react-icons/fi';

interface SortableWidgetProps {
  widget: DashboardWidget;
  children: React.ReactNode;
  onRemove?: (widgetId: string) => void;
  onResize?: (widgetId: string, newSize: string) => void;
}

export default function SortableWidget({ 
  widget, 
  children, 
  onRemove,
  onResize,
  ...props
}: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transitionProperty: 'transform, opacity',
    transitionDuration: '0.2s',
    transitionTimingFunction: 'ease-in-out',
  };

  // Determine widget size CSS classes
  const sizeClasses = {
    small: 'col-span-1',
    medium: 'col-span-1 md:col-span-2',
    large: 'col-span-1 md:col-span-3',
    full: 'col-span-full',
  };

  const handleResize = () => {
    if (!onResize) return;
    
    // Cycle through sizes: small -> medium -> large -> full -> small
    const sizes = ['small', 'medium', 'large', 'full'] as const;
    const currentIndex = sizes.indexOf(widget.size as any);
    const nextIndex = (currentIndex + 1) % sizes.length;
    
    onResize(widget.id, sizes[nextIndex]);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        ${sizeClasses[widget.size]}
        bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden
        duration-200 ease-in-out
        ${isDragging ? 'opacity-70 z-50 shadow-xl' : 'opacity-100'}
      `}
      {...props}
    >
      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-medium text-gray-700">{widget.title}</h3>
          <div className="flex items-center space-x-1">
            <button
              {...attributes}
              {...listeners}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-grab"
              title="Drag to move"
              onClick={(e) => e.stopPropagation()}
            >
              <FiMove size={16} />
            </button>
            
            {onResize && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleResize();
                }}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                title="Resize widget"
              >
                <FiMaximize size={16} />
              </button>
            )}
            
            {onRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(widget.id);
                }}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                title="Remove widget"
              >
                <FiX size={16} />
              </button>
            )}
          </div>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
} 