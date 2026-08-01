import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, Download, ExternalLink, Loader2, FolderOpen, BookOpen, Image as ImageIcon, FileType } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const ResumesModal = ({ isOpen, onClose, examData }) => {
  const { t } = useTranslation(['dashboard', 'common']);
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    if (isOpen && examData?.moduleId) {
      fetchResumes();
    }
  }, [isOpen, examData?.moduleId]);

  const fetchResumes = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch resumes for this module
      const response = await api.get(`/resumes?moduleId=${examData.moduleId}`);
      const list = Array.isArray(response.data?.data) ? response.data.data : [];
      setResumes(list);
    } catch (err) {
      console.error('Error fetching resumes:', err);
      setError(t('dashboard:failed_load_resumes', 'Impossible de charger les résumés'));
    } finally {
      setLoading(false);
    }
  };

  // Group resumes by course name
  const groupedResumes = resumes.reduce((acc, resume) => {
    const courseName = resume.courseName || 'Général';
    if (!acc[courseName]) {
      acc[courseName] = [];
    }
    acc[courseName].push(resume);
    return acc;
  }, {});

  // Helper function to determine file type
  const getFileType = (url) => {
    if (!url) return 'unknown';
    const extension = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) return 'image';
    if (['doc', 'docx'].includes(extension)) return 'word';
    if (extension === 'pdf') return 'pdf';
    return 'document';
  };

  // Helper function to get appropriate icon
  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'image':
        return <ImageIcon className="h-4 w-4 text-purple-600" />;
      case 'word':
        return <FileType className="h-4 w-4 text-blue-600" />;
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4 text-purple-600" />;
    }
  };

  // Handle file viewing based on type
  const handleViewFile = (resume, fileType, fullUrl) => {
    if (fileType === 'image') {
      setSelectedImage(fullUrl);
    } else {
      window.open(fullUrl, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-5 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white dark:bg-slate-900/20 p-2 rounded-lg">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">
                    {t('dashboard:resumes', 'Résumés / Cours')}
                  </h2>
                  <p className="text-purple-100 text-sm">
                    {examData?.name || t('dashboard:current_exam', 'Examen en cours')}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white dark:bg-slate-900/20 rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="max-h-[calc(80vh-120px)]">
            <div className="p-5 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                </div>
              ) : error ? (
                <div className="text-center py-12 text-red-500">
                  <p>{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchResumes}
                    className="mt-2"
                  >
                    {t('common:retry', 'Réessayer')}
                  </Button>
                </div>
              ) : resumes.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FolderOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="font-medium">
                    {t('dashboard:no_resumes', 'Aucun résumé disponible')}
                  </p>
                  <p className="text-sm">
                    {t('dashboard:no_resumes_desc', 'Les résumés seront ajoutés bientôt')}
                  </p>
                </div>
              ) : (
                Object.entries(groupedResumes).map(([courseName, courseResumes]) => (
                  <div key={courseName} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-purple-600" />
                      <h3 className="font-semibold text-gray-900">{courseName}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {courseResumes.length}
                      </Badge>
                    </div>
                    <div className="grid gap-2 pl-6">
                      {courseResumes.map((resume) => {
                        const fileFullUrl = resume.pdfUrl?.startsWith('http') ? resume.pdfUrl : `${import.meta.env.VITE_API_URL?.replace('/api/v1', '')}${resume.pdfUrl}`;
                        const fileType = getFileType(resume.pdfUrl);
                        return (
                          <motion.div
                            key={resume._id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border hover:bg-purple-50 hover:border-purple-200 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border group-hover:bg-purple-100 transition-colors">
                                {getFileIcon(fileType)}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 text-sm">
                                  {resume.title}
                                </p>
                                <div className="flex items-center gap-2">
                                  <p className="text-xs text-gray-500">
                                    {new Date(resume.createdAt).toLocaleDateString('fr-FR')}
                                  </p>
                                  {fileType !== 'pdf' && (
                                    <Badge variant="outline" className="text-xs capitalize">
                                      {fileType === 'word' ? 'Word' : fileType === 'image' ? 'Image' : 'Doc'}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewFile(resume, fileType, fileFullUrl)}
                                className="gap-1.5 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                              >
                                <ExternalLink className="h-4 w-4" />
                                <span className="hidden sm:inline">{t('common:view', 'Voir')}</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = fileFullUrl;
                                  const ext = fileType === 'image' ? '.jpg' : fileType === 'word' ? '.docx' : '.pdf';
                                  link.download = resume.title || `resume${ext}`;
                                  link.click();
                                }}
                                className="gap-1.5 text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                              >
                                <Download className="h-4 w-4" />
                                <span className="hidden sm:inline">{t('common:download', 'Télécharger')}</span>
                              </Button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </motion.div>

        {/* Image Viewer Dialog */}
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
            <div className="relative bg-black">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedImage(null)}
                className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
              <img
                src={selectedImage}
                alt="Resume"
                className="w-full h-auto max-h-[85vh] object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </AnimatePresence>
  );
};

export default ResumesModal;
