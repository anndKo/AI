import { useState, useRef, useEffect, useCallback } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageViewerProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export function ImageViewer({ src, alt, onClose }: ImageViewerProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTouchDistance = useRef<number | null>(null);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((prev) => Math.min(Math.max(0.5, prev + delta), 5));
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastTouchDistance.current = distance;
    } else if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  }, [position]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      e.preventDefault();
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = (distance - lastTouchDistance.current) * 0.01;
      setScale((prev) => Math.min(Math.max(0.5, prev + delta), 5));
      lastTouchDistance.current = distance;
    } else if (e.touches.length === 1 && isDragging) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleTouchEnd = useCallback(() => {
    lastTouchDistance.current = null;
    setIsDragging(false);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resetView = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("touchstart", handleTouchStart, { passive: false });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd);

    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center">
      {/* Close button - always visible on mobile */}
      <Button
        variant="secondary"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-3 right-3 z-50 w-12 h-12 bg-white/20 hover:bg-white/30 text-white rounded-full shadow-lg backdrop-blur-sm flex items-center justify-center"
      >
        <X className="w-7 h-7" />
      </Button>

      {/* Controls - bottom on mobile, top-right on desktop */}
      <div className="absolute bottom-16 md:bottom-auto md:top-4 left-1/2 md:left-auto md:right-16 -translate-x-1/2 md:translate-x-0 flex gap-2 z-10">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setScale((s) => Math.min(s + 0.25, 5))}
          className="w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-full backdrop-blur-sm"
        >
          <ZoomIn className="w-5 h-5" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setScale((s) => Math.max(s - 0.25, 0.5))}
          className="w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-full backdrop-blur-sm"
        >
          <ZoomOut className="w-5 h-5" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={resetView}
          className="w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-full backdrop-blur-sm"
        >
          <RotateCcw className="w-5 h-5" />
        </Button>
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/10 text-white px-3 py-1 rounded-full text-sm">
        {Math.round(scale * 100)}%
      </div>

      {/* Image container */}
      {/* Image container */}
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden p-4"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-[90vw] max-h-[80vh] object-contain select-none pointer-events-none"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? "none" : "transform 0.1s ease-out",
          }}
          draggable={false}
        />
      </div>
    </div>
  );
}
