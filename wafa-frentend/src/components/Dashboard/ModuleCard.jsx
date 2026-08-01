import React from "react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, HelpCircle, X, BookOpen, Info, CheckCircle, Image as ImageIcon, FileText, File } from "lucide-react";

import { api } from "@/lib/utils";
import { moduleService } from "@/services/moduleService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const API_URL = import.meta.env.VITE_API_URL || "";

// Color schemes for modules (based on https://e-qe.online/dashboard)
const moduleColors = [
  { gradient: "from-blue-500 to-indigo-600", bg: "bg-blue-50", border: "border-blue-200", ring: "ring-blue-300" },
  { gradient: "from-purple-500 to-pink-600", bg: "bg-purple-50", border: "border-purple-200", ring: "ring-purple-300" },
  { gradient: "from-green-500 to-teal-600", bg: "bg-green-50", border: "border-green-200", ring: "ring-green-300" },
  { gradient: "from-orange-500 to-red-600", bg: "bg-orange-50", border: "border-orange-200", ring: "ring-orange-300" },
  { gradient: "from-cyan-500 to-blue-600", bg: "bg-cyan-50", border: "border-cyan-200", ring: "ring-cyan-300" },
  { gradient: "from-pink-500 to-rose-600", bg: "bg-pink-50", border: "border-pink-200", ring: "ring-pink-300" },
  { gradient: "from-yellow-500 to-orange-600", bg: "bg-yellow-50", border: "border-yellow-200", ring: "ring-yellow-300" },
  { gradient: "from-indigo-500 to-purple-600", bg: "bg-indigo-50", border: "border-indigo-200", ring: "ring-indigo-300" },
];

const ModuleCard = ({ course, handleCourseClick, index }) => {
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const colorScheme = moduleColors[index % moduleColors.length];
  const progress = course.progress || 0;
  const totalQuestions = course.totalQuestions || 0;
  const questionsAttempted = course.questionsAttempted || Math.round((progress / 100) * totalQuestions);
  const correctAnswers = course.correctAnswers || 0;
  const wrongAnswers = questionsAttempted - correctAnswers;

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

  // Show fallback if no valid URL, or if image failed to load
  const showFallback = !hasValidImageUrl || imageError;

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
      <motion.div
        key={course._id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        whileHover={{ scale: 1.03, y: -5 }}
        className={`relative bg-background backdrop-blur-sm rounded-2xl border-2 ${colorScheme.border} shadow-lg p-3 sm:p-4 md:p-5 cursor-pointer hover:shadow-2xl hover:ring-2 ${colorScheme.ring} transition-all duration-300 overflow-hidden group w-full`}
        onClick={() => handleCourseClick(course._id)}
      >
        {/* Animated background gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br ${colorScheme.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>

        {/* Help Button - Top Left - Always visible */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-2 left-2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-background shadow-lg flex items-center justify-center text-blue-600 hover:text-blue-700 hover:bg-blue-50 hover:shadow-xl transition-all border-2 border-blue-100"
          onClick={(e) => {
            e.stopPropagation();
            setShowHelpModal(true);
          }}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          title="Aide et informations"
        >
          <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
        </motion.button>

        {/* Course Image with gradient overlay */}
        <div className="relative mb-3 sm:mb-4 overflow-hidden rounded-xl h-32 sm:h-36 md:h-40 lg:h-44">
          {/* Always render the fallback gradient - it's the base layer */}
          <div
            className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center rounded-xl ${!customStyle ? `bg-gradient-to-br ${colorScheme.gradient}` : ''}`}
            style={customStyle ? {
              background: `linear-gradient(135deg, ${course.color}, ${adjustColor(course.color, -30)})`
            } : undefined}
          >
            <div className="p-4 flex flex-col items-center justify-center">
              <ImageIcon className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-white" />
              <span className="text-white text-sm sm:text-base md:text-lg font-bold text-center line-clamp-2 mt-2 px-2 drop-shadow-lg">
                {course.name}
              </span>
            </div>
          </div>

          {/* Only attempt to load image if URL is valid */}
          {hasValidImageUrl && !imageError && (
            <>
              <img
                src={fullImageUrl}
                alt={course.name}
                className={`absolute inset-0 w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
              {/* Image overlay gradient - only show when image is loaded */}
              {imageLoaded && (
                <div
                  className={`absolute inset-0 opacity-30 group-hover:opacity-20 transition-opacity duration-300 ${!customStyle ? `bg-gradient-to-t ${colorScheme.gradient}` : ''}`}
                  style={customStyle ? { background: `linear-gradient(to top, ${course.color}99, transparent)` } : undefined}
                ></div>
              )}
            </>
          )}

          {/* Progress badge on image */}
          <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 z-10">
            <motion.div
              className="bg-background/90 backdrop-blur-sm rounded-full px-2 sm:px-3 py-0.5 sm:py-1 shadow-lg"
              whileHover={{ scale: 1.1 }}
            >
              <span
                className={`text-xs sm:text-sm font-bold ${!customStyle ? `bg-gradient-to-r ${colorScheme.gradient} text-transparent bg-clip-text` : ''}`}
                style={customStyle ? { color: course.color } : undefined}
              >
                {progress}%
              </span>
            </motion.div>
          </div>
        </div>

        {/* Course Title */}
        <h3 className="relative text-sm sm:text-base md:text-lg font-bold text-foreground mb-2 sm:mb-3 line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem] group-hover:text-muted-foreground transition-colors">
          {course.name}
        </h3>

        {/* Course Stats */}
        <div className="relative flex flex-col items-stretch justify-between pt-2 sm:pt-3 border-t border-border gap-2">
          <motion.button
            className={`flex-1 px-3 py-1.5 rounded-md text-white text-xs font-semibold shadow-md hover:shadow-lg transition-all whitespace-nowrap ${!customStyle ? `bg-gradient-to-r ${colorScheme.gradient}` : ''}`}
            style={customStyle || undefined}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              handleCourseClick(course._id);
            }}
          >
            Commencer
          </motion.button>
        </div>
      </motion.div>

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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
              onClick={() => setShowImageModal(false)}
            >
              <motion.div
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
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* PDF Modal - Full screen with iframe */}
      {createPortal(
        <AnimatePresence>
          {showPdfModal && course.helpPdf && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
              onClick={() => setShowPdfModal(false)}
            >
              <motion.div
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
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default ModuleCard;
