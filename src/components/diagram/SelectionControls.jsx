import React from "react";
import { Button } from "@/components/ui/button";
import { X, Copy, Group, Trash2 } from "lucide-react";

export default function SelectionControls({
  selectionCount,
  onClear,
  onGroupSelected,
  onDeleteSelected,
  disabled = false
}) {
  if (selectionCount === 0) return null;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm border border-border rounded-lg px-4 py-3 flex items-center gap-3 z-10">
      <span className="text-sm text-muted-foreground">
        {selectionCount} device{selectionCount !== 1 ? "s" : ""} selected
      </span>

      <div className="h-6 w-px bg-border" />

      <Button
        variant="outline"
        size="sm"
        className="h-7 gap-2"
        onClick={onGroupSelected}
        disabled={disabled || selectionCount < 2}
        title="Group selected devices"
      >
        <Group className="h-3.5 w-3.5" /> Group
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="h-7 gap-2"
        onClick={onDeleteSelected}
        disabled={disabled}
        title="Delete selected devices"
      >
        <Trash2 className="h-3.5 w-3.5 text-destructive" />
      </Button>

      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7"
        onClick={onClear}
        disabled={disabled}
        title="Clear selection"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}