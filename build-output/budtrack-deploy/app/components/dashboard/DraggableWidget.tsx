'use client';

import React, { useState, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { DashboardWidget } from './WidgetTypes';
import { FiMove, FiX, FiMaximize } from 'react-icons/fi';
import { cn } from '@/lib/utils';

interface DraggableWidgetProps {
  widget: DashboardWidget;
  children: React.ReactNode;
  onRemove?: (widgetId: string) => void;
  onResize?: (widgetId: string, newSize: string) => void;
  isDraggable?: boolean;
}

export default function DraggableWidget({ 
  widget, 
  children, 
  onRemove,
  onResize,
  isDraggable = true,
  ...props
}: DraggableWidgetProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: widget.id,
    data: { widget },
    disabled: !isDraggable
  });

  const [isResizing, setIsResizing] = useState(false);
  const [widgetWidth, setWidgetWidth] = useState<number | null>(null);
  const [widgetHeight, setWidgetHeight] = useState<number | null>(null);
  const [startResizePosition, setStartResizePosition] = useState({ x: 0, y: 0 });
  const [startDimensions, setStartDimensions] = useState({ width: 0, height: 0 });

  // Style for the widget
  const style = {
    transform: CSS.Translate.toString(transform),
    // Fix transition properties to be consistent
    transitionProperty: 'transform, opacity',
    transitionDuration: '0.2s',
    transitionTimingFunction: 'ease-in-out',
    ...(widgetWidth && widgetHeight ? { 
      width: `${widgetWidth}px`, 
      height: `${widgetHeight}px`,
      gridColumn: 'span 1'
    } : {})
  };

  // Enhanced animation for dragging
  const getDraggingStyles = (isDragging: boolean) => {
    if (isDragging) {
      return {
        opacity: '0.7',
        zIndex: '50',
        cursor: 'grabbing',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        transform: 'scale(1.02)'
      };
    }
    return {};
  };

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent) => {
    if (!isDraggable) return;
    
    // Prevent the event from bubbling up to parent elements
    e.preventDefault();
    e.stopPropagation();
    
    const element = e.currentTarget.parentElement;
    if (!element) return;
    
    setIsResizing(true);
    setStartResizePosition({ x: e.clientX, y: e.clientY });
    setStartDimensions({ 
      width: element.offsetWidth, 
      height: element.offsetHeight 
    });
    
    // Add event listeners to document to handle mouse move and up
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', handleResizeEnd);
  };
  
  // Handle resize
  const handleResize = (e: MouseEvent) => {
    if (!isResizing) return;
    
    // Prevent any default behaviors
    e.preventDefault();
    e.stopPropagation();
    
    const deltaX = e.clientX - startResizePosition.x;
    const deltaY = e.clientY - startResizePosition.y;
    
    const newWidth = Math.max(200, startDimensions.width + deltaX);
    const newHeight = Math.max(100, startDimensions.height + deltaY);
    
    setWidgetWidth(newWidth);
    setWidgetHeight(newHeight);
  };
  
  // Handle resize end
  const handleResizeEnd = (e?: MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setIsResizing(false);
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', handleResizeEnd);
    
    // Determine new size based on width
    if (widgetWidth && onResize) {
      let newSize: 'small' | 'medium' | 'large' | 'full' = 'small';
      const containerWidth = document.querySelector('.grid')?.clientWidth || 1200;
      
      if (widgetWidth <= containerWidth * 0.3) {
        newSize = 'small';
      } else if (widgetWidth <= containerWidth * 0.5) {
        newSize = 'medium';
      } else if (widgetWidth <= containerWidth * 0.8) {
        newSize = 'large';
      } else {
        newSize = 'full';
      }
      
      // Only update if size changed
      if (newSize !== widget.size) {
        onResize(widget.id, newSize);
      }
    }
  };

  // Cleanup resize listeners
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing, startResizePosition, startDimensions]);

  // Determine widget size CSS classes
  const sizeClasses = {
    small: 'col-span-1',
    medium: 'col-span-1 md:col-span-2',
    large: 'col-span-1 md:col-span-3',
    full: 'col-span-full',
  };

  // Disable drag events during resize
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        e.stopPropagation();
        handleResize(e);
      }
    };
    
    window.addEventListener('mousemove', handleGlobalMouseMove, { capture: true });
    
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove, { capture: true });
    };
  }, [isResizing]);

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        ...getDraggingStyles(isDragging)
      }}
      className={cn(
        sizeClasses[widget.size],
        'bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden',
        'transition-all duration-200 ease-in-out relative',
        isDragging ? 'opacity-70 z-50 cursor-grabbing shadow-xl' : 'opacity-100',
        isResizing ? 'z-40 shadow-lg resize-in-progress' : ''
      )}
      {...(isResizing ? {} : props)}
    >
      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-medium text-gray-700">{widget.title}</h3>
          {isDraggable && (
            <div className="flex items-center space-x-1">
              <button
                {...(isResizing ? {} : attributes)}
                {...(isResizing ? {} : listeners)}
                className={`p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 ${isResizing ? '' : 'cursor-grab'}`}
                title="Drag to move"
                disabled={isResizing}
              >
                <FiMove size={16} />
              </button>
              
              {onRemove && (
                <button
                  onClick={() => onRemove(widget.id)}
                  className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  title="Remove widget"
                  disabled={isResizing}
                >
                  <FiX size={16} />
                </button>
              )}
            </div>
          )}
        </div>
        <div>{children}</div>
      </div>
      
      {/* Resize handle with improved interaction */}
      {isDraggable && (
        <div 
          className="absolute bottom-0 right-0 w-6 h-6 bg-gray-100 cursor-se-resize rounded-tl-md flex items-center justify-center hover:bg-blue-100"
          onMouseDown={(e) => {
            e.stopPropagation();
            handleResizeStart(e);
          }}
          title="Resize widget"
        >
          <FiMaximize size={10} className="text-gray-500" />
        </div>
      )}
    </div>
  );
} 