'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  DragStartEvent, 
  PointerSensor, 
  useSensor, 
  useSensors 
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy
} from '@dnd-kit/sortable';
import { DashboardWidget, DashboardView } from './WidgetTypes';
import WidgetRenderer from './WidgetRenderer';
import DraggableWidget from './DraggableWidget';
import SortableWidget from './SortableWidget';
import { Button } from '@/components/ui/button';
import { PlusCircle, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AddWidgetForm from './AddWidgetForm';
import { migrateDashboardLayoutToDatabase, needsDashboardMigration } from '@/lib/migrate-dashboard-layout';

// Custom hook to handle hydration mismatch
function useMounted() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  return mounted;
}

interface DashboardWidgetContainerProps {
  currentView: DashboardView;
  onSave: (newView: DashboardView) => void;
  availableWidgets: DashboardWidget[];
  isEditMode?: boolean;
  selectedWalletId?: string;
}

export default function DashboardWidgetContainer({
  currentView,
  onSave,
  availableWidgets,
  isEditMode = false,
  selectedWalletId
}: DashboardWidgetContainerProps) {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(currentView.widgets);
  const [activeWidget, setActiveWidget] = useState<DashboardWidget | null>(null);
  const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isMounted = useMounted();

  // Load layout from database on mount and handle migration
  useEffect(() => {
    const loadLayout = async () => {
      try {
        // Check if migration is needed
        if (needsDashboardMigration()) {
          console.log('Migrating dashboard layout from localStorage to database...');
          const migrationResult = await migrateDashboardLayoutToDatabase();
          if (migrationResult.migrated) {
            console.log('Migration completed successfully');
          }
        }

        // Load from database
        const response = await fetch('/api/dashboard/layout');
        if (response.ok) {
          const data = await response.json();
          if (data.layout && data.layout.widgets) {
            setWidgets(data.layout.widgets);
          }
        }
      } catch (error) {
        console.error('Error loading dashboard layout:', error);
      }
    };

    if (isMounted) {
      loadLayout();
    }
  }, [isMounted]);

  // Configure DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Min distance before drag starts
      },
    })
  );

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const widgetData = active.data.current?.widget;
    
    if (widgetData) {
      setActiveWidget(widgetData);
    }
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        // Re-arrange the items in the array
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Update position numbers
        const updatedItems = newItems.map((item, index) => ({
          ...item,
          position: index,
        }));
        
        console.log('Drag end - rearranged widgets:', updatedItems);
        setHasChanges(true);
        
        // Set a timeout to call onSave after the state update completes
        setTimeout(() => {
          onSave({
            ...currentView,
            widgets: updatedItems,
            updatedAt: new Date()
          });
        }, 0);
        
        return updatedItems;
      });
    }
    
    setActiveWidget(null);
  }, [currentView, onSave]);

  // Add a new widget to the dashboard
  const handleAddWidget = (widget: DashboardWidget) => {
    setWidgets((prev) => {
      const newWidget = {
        ...widget,
        position: prev.length,
      };
      setHasChanges(true);
      return [...prev, newWidget];
    });
    setIsAddWidgetOpen(false);
  };

  // Remove a widget from the dashboard
  const handleRemoveWidget = (widgetId: string) => {
    setWidgets((prev) => {
      const filteredWidgets = prev.filter((w) => w.id !== widgetId);
      // Update position numbers
      const updatedWidgets = filteredWidgets.map((item, index) => ({
        ...item,
        position: index,
      }));
      setHasChanges(true);
      return updatedWidgets;
    });
  };

  // Handle widget resize
  const handleResizeWidget = (widgetId: string, newSize: string) => {
    console.log(`Resizing widget ${widgetId} to ${newSize}`);
    
    setWidgets((prev) => {
      const updatedWidgets = prev.map((widget) => {
        if (widget.id === widgetId) {
          return {
            ...widget,
            size: newSize as 'small' | 'medium' | 'large' | 'full',
          };
        }
        return widget;
      });
      
      setHasChanges(true);
      
      // Auto-save the changes immediately
      setTimeout(() => {
        onSave({
          ...currentView,
          widgets: updatedWidgets,
          updatedAt: new Date()
        });
      }, 0);
      
      return updatedWidgets;
    });
  };

  // Save dashboard layout and widget configurations
  const handleSaveDashboard = async () => {
    console.log('handleSaveDashboard called, saving widgets:', widgets);
    setIsSaving(true);
    
    try {
      // Save to database
      const response = await fetch('/api/dashboard/layout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          layout: {
            ...currentView,
            widgets,
            updatedAt: new Date()
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save layout');
      }

      // Also call the onSave callback for local state update
      onSave({
        ...currentView,
        widgets,
        updatedAt: new Date()
      });
      
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving dashboard layout:', error);
      alert('Failed to save dashboard layout. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Return loading state before mounting to prevent hydration mismatch
  if (!isMounted) {
    return <div className="p-4">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">{currentView.name}</h2>
        
        {isEditMode ? (
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsAddWidgetOpen(true)}
              className="flex items-center"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Widget
            </Button>
          </div>
        ) : hasChanges && (
          <Button
            onClick={handleSaveDashboard}
            disabled={isSaving}
            className="flex items-center"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Layout'}
          </Button>
        )}
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={widgets.map(w => w.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4" style={{ transition: 'all 0.2s ease-in-out' }}>
            {widgets.map((widget) => (
              <SortableWidget 
                key={widget.id} 
                widget={widget}
                onRemove={isEditMode ? handleRemoveWidget : undefined}
                onResize={isEditMode ? handleResizeWidget : undefined}
                isDraggable={isEditMode}
              >
                <WidgetRenderer widget={widget} selectedWalletId={selectedWalletId} />
              </SortableWidget>
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeWidget ? (
            <DraggableWidget widget={activeWidget}>
              <WidgetRenderer widget={activeWidget} selectedWalletId={selectedWalletId} />
            </DraggableWidget>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Dialog open={isAddWidgetOpen} onOpenChange={setIsAddWidgetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Widget</DialogTitle>
          </DialogHeader>
          <AddWidgetForm 
            availableWidgets={availableWidgets} 
            onAddWidget={handleAddWidget} 
            existingWidgets={widgets}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
} 