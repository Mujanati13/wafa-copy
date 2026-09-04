import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, FileText, Image as ImageIcon, Play, Clock, BarChart3, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';

const ModulePreviewModal = ({ isOpen, onClose, module }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('image');

  if (!isOpen || !module) return null;

  // Determine difficulty styling
  const getDifficultyStyles = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'facile':
      case 'easy':
        return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', label: 'Facile' };
      case 'moyen':
      case 'medium':
        return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', label: 'Moyen' };
      case 'difficile':
      case 'hard':
        return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', label: 'Difficile' };
      case 'très difficile':
      case 'very hard':
        return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', label: 'Très Difficile' };
      default:
        return { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border', label: 'Non défini' };
    }
  };

  const difficultyStyles = getDifficultyStyles(module.difficulty);

  const handleStartModule = () => {
    onClose();
    navigate(`/dashboard/subjects/${module._id}`);
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99999]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[100000] w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="overflow-hidden shadow-2xl border-0">
              {/* Header with gradient */}
              <div 
                className="relative h-24 sm:h-32 bg-gradient-to-br from-blue-500 to-indigo-600 p-4 sm:p-6"
                style={module.color ? { background: `linear-gradient(135deg, ${module.color}, ${module.color}cc)` } : {}}
              >
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 sm:p-2 rounded-full bg-background/20 hover:bg-background/30 transition-colors"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </button>

                <div className="absolute bottom-3 sm:bottom-4 left-4 sm:left-6 right-4 sm:right-6">
                  <h2 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2 truncate">{module.name}</h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`${difficultyStyles.bg} ${difficultyStyles.text} ${difficultyStyles.border} text-xs`}>
                      {difficultyStyles.label}
                    </Badge>
                    {module.semester && (
                      <Badge variant="secondary" className="bg-background/20 text-white border-0 text-xs">
                        {module.semester}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <CardContent className="p-4 sm:p-6 space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <div className="text-center p-2 sm:p-3 bg-card rounded-lg">
                    <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 mx-auto text-blue-500 mb-1" />
                    <p className="text-base sm:text-lg font-bold">{module.examCount || module.exams?.length || 0}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Examens</p>
                  </div>
                  <div className="text-center p-2 sm:p-3 bg-card rounded-lg">
                    <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 mx-auto text-green-500 mb-1" />
                    <p className="text-base sm:text-lg font-bold">{module.progress || 0}%</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Progression</p>
                  </div>
                  <div className="text-center p-2 sm:p-3 bg-card rounded-lg">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 mx-auto text-purple-500 mb-1" />
                    <p className="text-base sm:text-lg font-bold">{module.duration || '30'}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">min/exam</p>
                  </div>
                </div>

                {/* Content Tabs (Image/PDF or Text) */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="image" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                      <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                      Image/PDF
                    </TabsTrigger>
                    <TabsTrigger value="text" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                      <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                      Texte
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="image" className="mt-4">
                    {module.imageUrl || module.pdfUrl ? (
                      <div className="relative aspect-video bg-transparent rounded-lg overflow-hidden border border-border">
                        {module.imageUrl && (
                          <img 
                            src={module.imageUrl} 
                            alt={module.name}
                            className="w-full h-full object-contain p-2"
                            loading="lazy"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                              const fallback = document.createElement('div');
                              fallback.className = 'w-full h-full flex items-center justify-center bg-card';
                              fallback.innerHTML = `
                                <div class="text-center text-muted-foreground p-4">
                                  <svg class="h-16 w-16 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <p class="text-sm font-medium">Image non disponible</p>
                                  <p class="text-xs text-muted-foreground mt-1">L'image n'a pas pu être chargée</p>
                                </div>
                              `;
                              e.target.parentElement.appendChild(fallback);
                            }}
                          />
                        )}
                      </div>
                    ) : (
                      <div className="aspect-video bg-card rounded-lg flex items-center justify-center border border-border">
                        <div className="text-center text-muted-foreground p-4">
                          <ImageIcon className="h-16 w-16 mx-auto mb-3 opacity-40" />
                          <p className="text-sm font-medium">Aucune image disponible</p>
                          <p className="text-xs text-muted-foreground mt-1">Ce module n'a pas d'image associée</p>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="text" className="mt-4">
                    <div className="bg-card rounded-lg p-3 sm:p-4 max-h-32 sm:max-h-40 overflow-y-auto">
                      {module.description || module.infoText ? (
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                          {module.description || module.infoText}
                        </p>
                      ) : (
                        <p className="text-xs sm:text-sm text-muted-foreground italic">
                          Aucune description disponible pour ce module.
                        </p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Categories Info */}
                {module.categories && module.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {module.categories.map((cat, idx) => (
                      <Badge key={idx} variant="outline" className="text-[10px] sm:text-xs">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Action Button */}
                <Button 
                  onClick={handleStartModule}
                  className="w-full py-4 sm:py-6 text-base sm:text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  <Play className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Commencer le module
                </Button>

                {/* Warning note */}
                <p className="text-[10px] sm:text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Assurez-vous d'avoir du temps disponible avant de commencer
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // Render modal in a portal to escape layout constraints
  return isOpen ? createPortal(modalContent, document.body) : null;
};

export default ModulePreviewModal;
