import React from "react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { HelpCircle, X, BookOpen, Info, Image as ImageIcon, FileText, File } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const API_URL = import.meta.env.VITE_API_URL || "";

// Color schemes for modules (based on https://e-qe.online/dashboard)
const moduleColors = [
  { gradient: "from-blue-500 to-indigo-600" },
  { gradient: "from-purple-500 to-pink-600" },
  { gradient: "from-green-500 to-teal-600" },
  { gradient: "from-orange-500 to-red-600" },
  { gradient: "from-cyan-500 to-blue-600" },
  { gradient: "from-pink-500 to-rose-600" },
  { gradient: "from-yellow-500 to-orange-600" },
  { gradient: "from-indigo-500 to-purple-600" },
];

const ModuleCard = ({ course, handleCourseClick, index }) => {
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const colorScheme = moduleColors[index % moduleColors.length];
  const progress = Math.min(100, Math.max(0, Number(course.progress) || 0));

  // Construct proper URL for imageUrl
  const getFullImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    return `${API_URL?.replace('/api/v1', '')}${url}`;
  };

  const fullImageUrl = getFullImageUrl(course.imageUrl);

  // Check if imageUrl is valid (not empty, not "null", not "undefined", starts with http or /)
  const hasValidImageUrl = fullImageUrl &&
    typeof fullImageUrl === 'string' &&
    fullImageUrl.trim() !== '' &&
    fullImageUrl !== 'null' &&
    fullImageUrl !== 'undefined' &&
    (fullImageUrl.startsWith('http') || fullImageUrl.startsWith('/') || fullImageUrl.startsWith('data:'));

  // Use custom color from module if available
  const moduleColor = course.color || null;
  const customStyle = moduleColor ? {
    background: `linear-gradient(135deg, ${moduleColor}, ${adjustColor(moduleColor, -30)})`
  } : null;

  // Helper function to darken/lighten color
  function adjustColor(color, amount) {
    const hex = color.replace('#', '');
    const num = parseInt(hex, 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  return (
    <>
      <Motion.div
        key={course._id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06 }}
        whileHover={{ y: -4 }}
        className="group relative flex min-h-[230px] w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-md transition-shadow duration-300 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-950"
        onClick={() => handleCourseClick(course._id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleCourseClick(course._id);
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`Ouvrir le module ${course.name}`}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 via-sky-500 to-teal-400" />

        <div className="flex items-start justify-between gap-4 pt-2">
          {/* Admin-managed module image */}
          <div
            className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg shadow-sm sm:h-20 sm:w-20 ${!customStyle ? `bg-gradient-to-br ${colorScheme.gradient}` : ""}`}
            style={customStyle || undefined}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <ImageIcon className="h-8 w-8 text-white/90" aria-hidden="true" />
            </div>
            {hasValidImageUrl && !imageError && (
              <img
                src={fullImageUrl}
                alt={course.name}
                className={`absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            )}
          </div>

          {/* Legacy module help: text, image and PDF */}
          <Motion.button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-600 shadow-sm transition-colors hover:border-sky-300 hover:bg-sky-100 hover:text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300"
            onClick={(event) => {
              event.stopPropagation();
              setShowHelpModal(true);
            }}
            onKeyDown={(event) => event.stopPropagation()}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            aria-label={`Afficher l'aide du module ${course.name}`}
            title="Aide et informations"
          >
            <HelpCircle className="h-5 w-5" aria-hidden="true" />
          </Motion.button>
        </div>

        {/* Module name */}
        <h3 className="my-5 line-clamp-2 flex min-h-12 flex-1 items-center justify-center text-center text-lg font-bold text-slate-900 dark:text-white">
          {course.name}
        </h3>

        {/* Module progress */}
        <div className="rounded-lg bg-slate-950 px-3 py-2.5 text-white dark:bg-slate-900">
          <div className="mb-2 flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-wide">
            <span className="text-slate-400">Progression</span>
            <span className="text-cyan-300">{progress}%</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-slate-800"
            role="progressbar"
            aria-label={`Progression du module ${course.name}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <Motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-sky-400"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.04 }}
            />
          </div>
        </div>
      </Motion.div>

      {/* Help Modal */}
      <Dialog open={showHelpModal} onOpenChange={setShowHelpModal}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${!customStyle ? `bg-gradient-to-r ${colorScheme.gradient}` : ''}`}
                style={customStyle || undefined}
              >
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="block text-lg">{course.name}</span>
                  {course.difficulty && (
                    <Badge
                      className={`text-xs px-2 py-0.5 ${course.difficulty === 'easy' ? 'bg-green-100 text-green-700 border-green-200' :
                        course.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                          'bg-red-100 text-red-700 border-red-200'
                        }`}
                      variant="outline"
                    >
                      {course.difficulty === 'easy' ? 'easy' :
                        course.difficulty === 'medium' ? 'medium' : 'hard'}
                    </Badge>
                  )}
                </div>
                <span className="text-sm font-normal text-gray-500">Guide du module</span>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto space-y-4 mt-4 pr-2 max-h-[60vh]">
            {/* Module Info with toggle buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="gap-1">
                <Info className="w-3 h-3" />
                {course.semester || "N/A"}
              </Badge>
              <Badge
                className="gap-1 text-white"
                style={customStyle || undefined}
              >
                {progress}% Complété
              </Badge>

              {/* Help Image badge - opens modal */}
              {(course.helpImage || course.imageUrl) && (
                <Badge
                  className="gap-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white cursor-pointer hover:from-pink-600 hover:to-rose-600 transition-all"
                  onClick={() => setShowImageModal(true)}
                >
                  <ImageIcon className="w-3 h-3" />
                  Voir Image
                </Badge>
              )}

              {/* Help PDF badge - opens modal */}
              {course.helpPdf && (
                <Badge
                  className="gap-1 bg-gradient-to-r from-purple-500 to-violet-500 text-white cursor-pointer hover:from-purple-600 hover:to-violet-600 transition-all"
                  onClick={() => setShowPdfModal(true)}
                >
                  <File className="w-3 h-3" />
                  Voir PDF
                </Badge>
              )}

              {/* Text content badge */}
              {(course.helpContent || course.infoText || course.textContent) && (
                <Badge className="gap-1 bg-gradient-to-r from-cyan-500 to-teal-500 text-white">
                  <FileText className="w-3 h-3" />
                  Texte disponible
                </Badge>
              )}
            </div>

            {/* Text Content - Show by default first (priority 1) */}
            {course.textContent && (
              <div className="p-4 bg-indigo-50 border-2 border-indigo-200 rounded-xl">
                <h4 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Contenu du module
                </h4>
                <div className="text-sm text-indigo-800 leading-relaxed whitespace-pre-wrap overflow-y-auto" style={{ maxHeight: '300px' }}>
                  {course.textContent}
                </div>
              </div>
            )}

            {/* Detailed Help Content (priority 2) */}
            {course.helpContent && (
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" />
                  Guide détaillé
                </h4>
                <div className="text-sm text-blue-800 leading-relaxed whitespace-pre-wrap overflow-y-auto" style={{ maxHeight: '300px' }}>
                  {course.helpContent}
                </div>
              </div>
            )}

            {/* Short Description (priority 3) */}
            {course.infoText && (
              <div className="p-4 bg-card border-2 border-border rounded-xl">
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  En bref
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed overflow-y-auto" style={{ maxHeight: '200px' }}>
                  {course.infoText}
                </p>
              </div>
            )}

            {/* Help Image Preview - click opens modal */}
            {(course.helpImage || course.imageUrl) && (
              <div className="space-y-2">
                <h4 className="font-semibold text-pink-900 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-pink-600" />
                  Image d'aide
                </h4>
                <div 
                  className="rounded-xl border-2 border-pink-200 bg-pink-50 min-h-[120px] flex items-center justify-center overflow-hidden cursor-pointer hover:border-pink-400 hover:shadow-lg transition-all"
                  onClick={() => setShowImageModal(true)}
                >
                  <img
                    src={(() => {
                      const imageUrl = course.helpImage || course.imageUrl;
                      return imageUrl.startsWith("http") ? imageUrl : `${API_URL?.replace('/api/v1', '')}${imageUrl}`;
                    })()}
                    alt="Guide du module"
                    className="max-w-full max-h-48 object-contain hover:scale-105 transition-transform"
                  />
                </div>
                <p className="text-xs text-pink-700 text-center">Cliquez pour agrandir l'image</p>
              </div>
            )}

            {/* Help PDF - click opens modal */}
            {course.helpPdf && (
              <div className="space-y-2">
                <h4 className="font-semibold text-purple-900 flex items-center gap-2">
                  <File className="w-5 h-5 text-purple-600" />
                  Document PDF
                </h4>
                <div 
                  className="p-6 bg-purple-50 border-2 border-purple-200 rounded-xl cursor-pointer hover:bg-purple-100 hover:border-purple-400 hover:shadow-lg transition-all text-center"
                  onClick={() => setShowPdfModal(true)}
                >
                  <File className="w-12 h-12 mx-auto text-purple-600 mb-3" />
                  <p className="text-sm font-medium text-purple-800">Cliquez pour ouvrir le PDF</p>
                  <p className="text-xs text-purple-600 mt-1">Document d'aide disponible</p>
                </div>
              </div>
            )}

            {/* No content fallback */}
            {!course.infoText && !course.helpContent && !course.imageUrl && !course.textContent && !course.helpImage && !course.helpPdf && (
              <div className="rounded-xl border-2 border-dashed border-border bg-card min-h-[120px] flex items-center justify-center">
                <div className="text-center p-4 text-gray-500">
                  <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Aucune information d'aide disponible pour ce module.</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-6 pt-4 border-t flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => setShowHelpModal(false)}
              className="w-full sm:w-auto"
            >
              Fermer
            </Button>
            <Button
              size="default"
              className="text-white w-full sm:w-auto"
              style={customStyle || undefined}
              onClick={() => {
                setShowHelpModal(false);
                handleCourseClick(course._id);
              }}
            >
              Commencer le module
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Modal - Full screen with scroll */}
      {createPortal(
        <AnimatePresence>
          {showImageModal && (course.helpImage || course.imageUrl) && (
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
              onClick={() => setShowImageModal(false)}
            >
              <Motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-6xl max-h-[95vh] bg-background rounded-xl shadow-2xl overflow-hidden z-[10000]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-pink-50 to-rose-50">
                  <h3 className="font-semibold text-pink-900 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    {course.name} - Image d'aide
                  </h3>
                  <button
                    onClick={() => setShowImageModal(false)}
                    className="p-2 hover:bg-pink-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-pink-700" />
                  </button>
                </div>
                {/* Scrollable Image Container */}
                <div className="overflow-auto p-6 flex items-center justify-center bg-card" style={{ maxHeight: 'calc(95vh - 80px)' }}>
                  <img
                    src={(() => {
                      const imageUrl = course.helpImage || course.imageUrl;
                      return imageUrl.startsWith("http") ? imageUrl : `${API_URL?.replace('/api/v1', '')}${imageUrl}`;
                    })()}
                    alt="Guide du module"
                    className="max-w-full h-auto object-contain rounded-lg shadow-lg"
                  />
                </div>
              </Motion.div>
            </Motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* PDF Modal - Full screen with iframe */}
      {createPortal(
        <AnimatePresence>
          {showPdfModal && course.helpPdf && (
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
              onClick={() => setShowPdfModal(false)}
            >
              <Motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-6xl h-[95vh] bg-background rounded-xl shadow-2xl overflow-hidden z-[10000]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-50 to-violet-50">
                  <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                    <File className="w-5 h-5" />
                    {course.name} - Document PDF
                  </h3>
                  <button
                    onClick={() => setShowPdfModal(false)}
                    className="p-2 hover:bg-purple-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-purple-700" />
                  </button>
                </div>
                <div className="h-[calc(95vh-80px)] overflow-auto">
                  <iframe
                    src={(() => {
                      const pdfUrl = course.helpPdf.startsWith("http") ? course.helpPdf : `${API_URL?.replace('/api/v1', '')}${course.helpPdf}`;
                      return `${pdfUrl}#view=FitH`;
                    })()}
                    className="w-full h-full"
                    title="PDF Viewer"
                  />
                </div>
              </Motion.div>
            </Motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default ModuleCard;
