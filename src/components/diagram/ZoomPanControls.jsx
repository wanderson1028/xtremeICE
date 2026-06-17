import React from "react";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from "lucide-react";

export default function ZoomPanControls({ 
  zoomLevel, 
  onZoomIn, 
  onZoomOut, 
  onFitToScreen, 
  onResetView,
  disabled = false 
}) {
  return (
    <div className="absolute top-4 right-4 flex flex-col gap-2 bg-card/80 backdrop-blur-sm border border-border rounded-lg p-2 z-10">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={onZoomIn}
        disabled={disabled || zoomLevel >= 3}
        title="Zoom in"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      
      <div className="text-xs text-muted-foreground text-center w-8 h-6 flex items-center justify-center">
        {Math.round(zoomLevel * 100)}%
      </div>
      
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={onZoomOut}
        disabled={disabled || zoomLevel <= 0.3}
        title="Zoom out"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>

      <div className="h-px bg-border my-1" />

      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={onFitToScreen}
        disabled={disabled}
        title="Fit to screen"
      >
        <Maximize2 className="h-4 w-4" />
      </Button>

      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={onResetView}
        disabled={disabled}
        title="Reset view"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
}