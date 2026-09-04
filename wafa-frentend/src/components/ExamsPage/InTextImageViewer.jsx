import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, X, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { resolveQuestionImageUrl } from '@/lib/mediaUrl';

/**
 * InTextImageViewer - Button and modal to display images related to a question
 * Can be placed inline within question text or as a standalone button
 */
const InTextImageViewer = ({ 
  images = [], // Array of image URLs
  inline = false, // If true, renders as small inline button
  buttonText,
  className,
}) => {
  const { t } = useTranslation(['common']);
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!images || images.length === 0) return null;

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    resetTransform();
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    resetTransform();
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const resetTransform = () => {
    setZoom(1);
    setRotation(0);
  };

  // Inline button (small, can be placed inside text)
  if (inline) {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium",
            "bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md",
            "transition-colors cursor-pointer mx-1",
            className
          )}
        >
          <Image className="h-3 w-3" />
          {buttonText || t('common:view_image', 'Voir image')}
        </button>
        <ImageModal />
      </>
    );
  }

  // Standard button
  const TriggerButton = () => (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setIsOpen(true)}
      className={cn("gap-2", className)}
    >
      <Image className="h-4 w-4" />
      {buttonText || t('common:images', 'Images')}
      {images.length > 1 && (
        <span className="ml-1 bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full">
          {images.length}
        </span>
      )}
    </Button>
  );

  const ImageModal = () => (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              {t('common:question_images', 'Images de la question')}
              {images.length > 1 && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({currentIndex + 1} / {images.length})
                </span>
              )}
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Image Controls */}
        <div className="flex items-center justify-center gap-2 px-4 py-2 border-b">
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-16 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomIn}
            disabled={zoom >= 3}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-2" />
          <Button
            variant="outline"
            size="icon"
            onClick={handleRotate}
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetTransform}
          >
            {t('common:reset', 'Réinitialiser')}
          </Button>
        </div>

        {/* Image Display */}
        <div className="relative flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900 min-h-[400px]">
          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-card/80 hover:bg-card shadow-md"
                onClick={handlePrevious}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-card/80 hover:bg-card shadow-md"
                onClick={handleNext}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}

          {/* Image */}
          <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
            <img
              src={resolveQuestionImageUrl(images[currentIndex])}
              alt={`Question image ${currentIndex + 1}`}
              className="max-w-full max-h-[60vh] object-contain transition-transform duration-200"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
              }}
              onError={(e) => {
                e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="%23f3f4f6" width="200" height="200"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af">Image non disponible</text></svg>';
              }}
            />
          </div>
        </div>

        {/* Thumbnail navigation */}
        {images.length > 1 && (
          <div className="flex items-center justify-center gap-2 p-4 border-t overflow-x-auto">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentIndex(idx);
                  resetTransform();
                }}
                className={cn(
                  "w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all",
                  currentIndex === idx
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-gray-400"
                )}
              >
                <img
                  src={resolveQuestionImageUrl(img)}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      <TriggerButton />
      <ImageModal />
    </>
  );
};

export default InTextImageViewer;
