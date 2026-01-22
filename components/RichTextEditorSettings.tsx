"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
// Checkbox will be created, for now using a simple div-based checkbox
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Settings } from "lucide-react";
import { ToolbarItem, createDefaultToolbarItems } from "./RichTextEditor";

interface RichTextEditorSettingsProps {
  toolbarItems: ToolbarItem[];
  onToolbarChange: (items: ToolbarItem[]) => void;
}

// All available toolbar items (for enabling/disabling)
const allAvailableItems = createDefaultToolbarItems();

function SortableToolbarItem({
  item,
  isEnabled,
  onToggle,
}: {
  item: ToolbarItem;
  isEnabled: boolean;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = item.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 border rounded-md bg-card hover:bg-muted/50 transition-colors"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${
          isEnabled
            ? "bg-primary border-primary"
            : "bg-background border-input hover:border-primary/50"
        }`}
        aria-checked={isEnabled}
        role="checkbox"
      >
        {isEnabled && (
          <svg
            className="h-3 w-3 text-primary-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </button>
      <label
        htmlFor={`toolbar-item-${item.id}`}
        className="flex-1 flex items-center gap-2 cursor-pointer"
      >
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{item.label}</span>
      </label>
    </div>
  );
}

export default function RichTextEditorSettings({
  toolbarItems,
  onToolbarChange,
}: RichTextEditorSettingsProps) {
  const [open, setOpen] = useState(false);
  const [enabledItems, setEnabledItems] = useState<ToolbarItem[]>(toolbarItems);
  const [availableItems, setAvailableItems] = useState<ToolbarItem[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Initialize available items (all items not in enabledItems)
  useEffect(() => {
    const enabledIds = new Set(enabledItems.map((item) => item.id));
    const available = allAvailableItems.filter(
      (item) => !enabledIds.has(item.id)
    );
    setAvailableItems(available);
  }, [enabledItems]);

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setEnabledItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        return newItems;
      });
    }
  };

  const toggleItem = (itemId: string) => {
    const item = allAvailableItems.find((i) => i.id === itemId);
    if (!item) return;

    const isEnabled = enabledItems.some((i) => i.id === itemId);

    if (isEnabled) {
      // Remove from enabled items
      setEnabledItems((items) => items.filter((i) => i.id !== itemId));
    } else {
      // Add to enabled items
      setEnabledItems((items) => [...items, item]);
    }
  };

  const handleSave = () => {
    // Ensure all items have proper icon components
    const itemsWithIcons = enabledItems.map((item) => {
      const defaultItem = allAvailableItems.find((d) => d.id === item.id);
      return defaultItem || item;
    });
    onToolbarChange(itemsWithIcons);
    setOpen(false);
  };

  const handleReset = () => {
    const defaultItems = createDefaultToolbarItems();
    setEnabledItems(defaultItems);
    onToolbarChange(defaultItems);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Customize Toolbar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Customize Toolbar</DialogTitle>
          <DialogDescription>
            Drag to reorder items, check/uncheck to enable/disable them.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">Enabled Items</h3>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={enabledItems.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {enabledItems.map((item) => (
                      <SortableToolbarItem
                        key={item.id}
                        item={item}
                        isEnabled={true}
                        onToggle={() => toggleItem(item.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            {availableItems.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Available Items</h3>
                <div className="space-y-2">
                  {availableItems.map((item) => (
                    <SortableToolbarItem
                      key={item.id}
                      item={item}
                      isEnabled={false}
                      onToggle={() => toggleItem(item.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={handleReset}>
            Reset to Default
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
