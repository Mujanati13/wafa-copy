import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

const MIN_SCALE = 1;
const MAX_SCALE = 5;

/**
 * Highly responsive, multi-touch capable Image Viewer Modal / Lightbox.
 * Supports:
 * - Pinch-to-zoom (2-finger scaling)
 * - Double-tap to zoom in / reset
 * - Drag-to-pan when scaled > 1
 * - Desktop mouse wheel zoom & click-and-drag panning
 * - Boundary clamping so the image never drifts off-screen
 * - Floating on-screen toolbar for touch / accessibility fallbacks
 */
const ImageViewerModal = ({ isOpen, imageUrl, alt = "Image agrandie", onClose }) => {
  const [scale, setScaleState] = useState(1);
  const [position, setPositionState] = useState({ x: 0, y: 0 });
  const [isGesturing, setIsGesturing] = useState(false);
  const [isMouseDragging, setIsMouseDragging] = useState(false);

  const containerRef = useRef(null);
  const imageRef = useRef(null);

  // Use refs to retain current values inside non-passive native event listeners
  const scaleRef = useRef(1);
  const positionRef = useRef({ x: 0, y: 0 });
  const touchStateRef = useRef({
    isPinching: false,
    isDragging: false,
    startDist: 0,
    startScale: 1,
    startPos: { x: 0, y: 0 },
    startCenter: { x: 0, y: 0 },
    lastX: 0,
    lastY: 0,
  });
  const lastTapTimeRef = useRef(0);
  const lastTapPosRef = useRef({ x: 0, y: 0 });
  const mouseDragStartRef = useRef({ x: 0, y: 0, startPosX: 0, startPosY: 0 });

  const setScale = useCallback((val) => {
    const clamped = Math.min(Math.max(val, MIN_SCALE), MAX_SCALE);
    scaleRef.current = clamped;
    setScaleState(clamped);
    if (clamped === MIN_SCALE) {
      positionRef.current = { x: 0, y: 0 };
      setPositionState({ x: 0, y: 0 });
    }
  }, []);

  const setPosition = useCallback((newPos) => {
    positionRef.current = newPos;
    setPositionState(newPos);
  }, []);

  // Compute boundaries for panning based on container and scaled image dimensions
  const getBounds = useCallback((currentScale) => {
    if (!containerRef.current || !imageRef.current) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }
    const cRect = containerRef.current.getBoundingClientRect();
    const naturalW = imageRef.current.offsetWidth || cRect.width;
    const naturalH = imageRef.current.offsetHeight || cRect.height;

    const scaledW = naturalW * currentScale;
    const scaledH = naturalH * currentScale;

    const maxX = Math.max(0, (scaledW - cRect.width) / 2 + 20);
    const maxY = Math.max(0, (scaledH - cRect.height) / 2 + 20);

    return { minX: -maxX, maxX, minY: -maxY, maxY };
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setIsGesturing(false);
  }, [setScale, setPosition]);

  // Zoom step controls (+ and - buttons)
  const handleZoomIn = useCallback(() => {
    const newScale = Math.min(scaleRef.current * 1.4, MAX_SCALE);
    const bounds = getBounds(newScale);
    setScale(newScale);
    setPosition({
      x: Math.min(Math.max(positionRef.current.x * 1.4, bounds.minX), bounds.maxX),
      y: Math.min(Math.max(positionRef.current.y * 1.4, bounds.minY), bounds.maxY),
    });
    setIsGesturing(false);
  }, [getBounds, setScale, setPosition]);

  const handleZoomOut = useCallback(() => {
    const newScale = Math.max(scaleRef.current / 1.4, MIN_SCALE);
    if (newScale <= 1.05) {
      resetZoom();
    } else {
      const bounds = getBounds(newScale);
      setScale(newScale);
      setPosition({
        x: Math.min(Math.max(positionRef.current.x / 1.4, bounds.minX), bounds.maxX),
        y: Math.min(Math.max(positionRef.current.y / 1.4, bounds.minY), bounds.maxY),
      });
      setIsGesturing(false);
    }
  }, [getBounds, resetZoom, setScale, setPosition]);

  // Handle escape key and body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Reset state when opening a new image
  useEffect(() => {
    if (isOpen) {
      resetZoom();
    }
  }, [isOpen, imageUrl, resetZoom]);

  // Native non-passive touch listeners to handle pinch and pan with preventDefault()
  useEffect(() => {
    if (!isOpen) return;
    const container = containerRef.current;
    if (!container) return;

    const getTouchDist = (t1, t2) => Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
    const getTouchCenter = (t1, t2) => ({
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2,
    });

    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        // Start pinch
        if (e.cancelable) e.preventDefault();
        touchStateRef.current.isPinching = true;
        touchStateRef.current.isDragging = false;
        touchStateRef.current.startDist = getTouchDist(e.touches[0], e.touches[1]);
        touchStateRef.current.startScale = scaleRef.current;
        touchStateRef.current.startPos = { ...positionRef.current };
        touchStateRef.current.startCenter = getTouchCenter(e.touches[0], e.touches[1]);
        setIsGesturing(true);
      } else if (e.touches.length === 1) {
        touchStateRef.current.isPinching = false;
        touchStateRef.current.isDragging = true;
        touchStateRef.current.lastX = e.touches[0].clientX;
        touchStateRef.current.lastY = e.touches[0].clientY;
        if (scaleRef.current > 1) {
          setIsGesturing(true);
        }
      }
    };

    const onTouchMove = (e) => {
      if (touchStateRef.current.isPinching && e.touches.length === 2) {
        if (e.cancelable) e.preventDefault();
        const currentDist = getTouchDist(e.touches[0], e.touches[1]);
        const currentCenter = getTouchCenter(e.touches[0], e.touches[1]);
        const distRatio = currentDist / (touchStateRef.current.startDist || 1);
        const nextScale = Math.min(
          Math.max(touchStateRef.current.startScale * distRatio, MIN_SCALE),
          MAX_SCALE
        );

        const centerDx = currentCenter.x - touchStateRef.current.startCenter.x;
        const centerDy = currentCenter.y - touchStateRef.current.startCenter.y;
        const nextX = touchStateRef.current.startPos.x + centerDx;
        const nextY = touchStateRef.current.startPos.y + centerDy;

        const bounds = getBounds(nextScale);
        scaleRef.current = nextScale;
        setScaleState(nextScale);
        const clampedX = Math.min(Math.max(nextX, bounds.minX), bounds.maxX);
        const clampedY = Math.min(Math.max(nextY, bounds.minY), bounds.maxY);
        positionRef.current = { x: clampedX, y: clampedY };
        setPositionState({ x: clampedX, y: clampedY });
        setIsGesturing(true);
      } else if (touchStateRef.current.isDragging && e.touches.length === 1) {
        if (scaleRef.current > 1) {
          if (e.cancelable) e.preventDefault();
          const dx = e.touches[0].clientX - touchStateRef.current.lastX;
          const dy = e.touches[0].clientY - touchStateRef.current.lastY;
          touchStateRef.current.lastX = e.touches[0].clientX;
          touchStateRef.current.lastY = e.touches[0].clientY;

          const bounds = getBounds(scaleRef.current);
          const nextX = Math.min(Math.max(positionRef.current.x + dx, bounds.minX), bounds.maxX);
          const nextY = Math.min(Math.max(positionRef.current.y + dy, bounds.minY), bounds.maxY);
          positionRef.current = { x: nextX, y: nextY };
          setPositionState({ x: nextX, y: nextY });
          setIsGesturing(true);
        }
      }
    };

    const onTouchEnd = (e) => {
      if (touchStateRef.current.isPinching && e.touches.length < 2) {
        touchStateRef.current.isPinching = false;
        setIsGesturing(false);
        if (scaleRef.current < 1.05) {
          resetZoom();
        }
      }

      if (e.touches.length === 0) {
        touchStateRef.current.isDragging = false;
        setIsGesturing(false);

        // Double-tap gesture handling
        if (e.changedTouches.length === 1) {
          const now = Date.now();
          const touch = e.changedTouches[0];
          const timeDiff = now - lastTapTimeRef.current;
          const distDiff = Math.hypot(
            touch.clientX - lastTapPosRef.current.x,
            touch.clientY - lastTapPosRef.current.y
          );

          if (timeDiff < 300 && distDiff < 30) {
            // Double-tap detected
            if (scaleRef.current > 1.2) {
              resetZoom();
            } else {
              const targetScale = 2.5;
              const rect = container.getBoundingClientRect();
              const tapX = touch.clientX - rect.left - rect.width / 2;
              const tapY = touch.clientY - rect.top - rect.height / 2;
              const bounds = getBounds(targetScale);
              const targetX = Math.min(Math.max(-tapX * (targetScale - 1), bounds.minX), bounds.maxX);
              const targetY = Math.min(Math.max(-tapY * (targetScale - 1), bounds.minY), bounds.maxY);

              scaleRef.current = targetScale;
              setScaleState(targetScale);
              positionRef.current = { x: targetX, y: targetY };
              setPositionState({ x: targetX, y: targetY });
              setIsGesturing(false);
            }
            lastTapTimeRef.current = 0;
          } else {
            lastTapTimeRef.current = now;
            lastTapPosRef.current = { x: touch.clientX, y: touch.clientY };
          }
        }
      }
    };

    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd);
    container.addEventListener('touchcancel', onTouchEnd);

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [isOpen, getBounds, resetZoom]);

  // Desktop mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.25 : 0.8;
    const nextScale = Math.min(Math.max(scaleRef.current * zoomFactor, MIN_SCALE), MAX_SCALE);

    if (nextScale <= 1.05) {
      resetZoom();
    } else {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - rect.width / 2;
      const mouseY = e.clientY - rect.top - rect.height / 2;
      const ratio = nextScale / scaleRef.current;
      const nextX = positionRef.current.x - mouseX * (ratio - 1);
      const nextY = positionRef.current.y - mouseY * (ratio - 1);
      const bounds = getBounds(nextScale);

      setScale(nextScale);
      setPosition({
        x: Math.min(Math.max(nextX, bounds.minX), bounds.maxX),
        y: Math.min(Math.max(nextY, bounds.minY), bounds.maxY),
      });
      setIsGesturing(false);
    }
  };

  // Desktop mouse click-and-drag pan
  const handleMouseDown = (e) => {
    if (scaleRef.current <= 1 || e.button !== 0) return;
    setIsMouseDragging(true);
    setIsGesturing(true);
    mouseDragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startPosX: positionRef.current.x,
      startPosY: positionRef.current.y,
    };
  };

  useEffect(() => {
    if (!isMouseDragging) return;

    const handleMouseMove = (e) => {
      const dx = e.clientX - mouseDragStartRef.current.x;
      const dy = e.clientY - mouseDragStartRef.current.y;
      const bounds = getBounds(scaleRef.current);
      const nextX = Math.min(
        Math.max(mouseDragStartRef.current.startPosX + dx, bounds.minX),
        bounds.maxX
      );
      const nextY = Math.min(
        Math.max(mouseDragStartRef.current.startPosY + dy, bounds.minY),
        bounds.maxY
      );
      positionRef.current = { x: nextX, y: nextY };
      setPositionState({ x: nextX, y: nextY });
    };

    const handleMouseUp = () => {
      setIsMouseDragging(false);
      setIsGesturing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isMouseDragging, getBounds]);

  const handleBackdropClick = (e) => {
    // Only close on background tap if not zoomed in and not gesturing
    if (scale === 1 && !isGesturing) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && imageUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-md select-none touch-none overflow-hidden"
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-label={alt}
        >
          {/* Top-Right Close Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="fixed right-4 top-4 z-[90] rounded-full border border-white/20 bg-black/60 p-3 text-white shadow-xl backdrop-blur-sm transition-all hover:bg-black/90 hover:scale-105 active:scale-95 sm:right-6 sm:top-6"
            aria-label="Fermer l'image"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Image Container */}
          <div
            ref={containerRef}
            onWheel={handleWheel}
            className={`relative flex h-full w-full items-center justify-center p-4 sm:p-8 ${
              scale > 1
                ? isMouseDragging
                  ? 'cursor-grabbing'
                  : 'cursor-grab'
                : 'cursor-default'
            }`}
          >
            <div
              style={{
                transform: `translate3d(${position.x}px, ${position.y}px, 0px) scale(${scale})`,
                transition: isGesturing ? 'none' : 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                willChange: 'transform',
                transformOrigin: 'center center',
              }}
              className="flex items-center justify-center max-w-full max-h-full"
              onMouseDown={handleMouseDown}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                ref={imageRef}
                src={imageUrl}
                alt={alt}
                draggable={false}
                className="max-h-[82vh] max-w-[92vw] rounded-lg object-contain shadow-2xl pointer-events-none sm:max-h-[85vh] sm:max-w-[88vw]"
              />
            </div>
          </div>

          {/* Floating Controls Toolbar */}
          <div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-1.5 rounded-full border border-white/20 bg-neutral-950/80 px-3 py-1.5 shadow-2xl backdrop-blur-md sm:gap-2 sm:px-4 sm:py-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleZoomOut}
              disabled={scale <= MIN_SCALE}
              className="rounded-full p-2 text-white/90 transition-all hover:bg-white/20 hover:text-white disabled:opacity-30 disabled:pointer-events-none active:scale-95"
              aria-label="Zoom arrière"
              title="Zoom arrière"
            >
              <ZoomOut className="h-5 w-5" />
            </button>

            <button
              onClick={resetZoom}
              className="min-w-[60px] rounded-full px-2.5 py-1 text-xs font-semibold text-white/90 transition-all hover:bg-white/20 hover:text-white active:scale-95 flex items-center justify-center gap-1"
              aria-label="Réinitialiser le zoom"
              title="Réinitialiser le zoom"
            >
              {scale > 1.05 ? (
                <>
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>{Math.round(scale * 100)}%</span>
                </>
              ) : (
                <span>100%</span>
              )}
            </button>

            <button
              onClick={handleZoomIn}
              disabled={scale >= MAX_SCALE}
              className="rounded-full p-2 text-white/90 transition-all hover:bg-white/20 hover:text-white disabled:opacity-30 disabled:pointer-events-none active:scale-95"
              aria-label="Zoom avant"
              title="Zoom avant"
            >
              <ZoomIn className="h-5 w-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ImageViewerModal;
