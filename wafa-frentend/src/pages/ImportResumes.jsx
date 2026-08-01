import React, { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, Loader2, Upload, ArrowRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/utils";
import { toast } from "sonner";

const ImportResumes = () => {
  const { t } = useTranslation(['admin', 'common']);

  const [modules, setModules] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [expandedModules, setExpandedModules] = useState({});

  // Import form states
  const [selectedModule, setSelectedModule] = useState("");
  const [courseName, setCourseName] = useState("");
  const [resumeName, setResumeName] = useState("");
  const [file, setFile] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [modulesRes, resumesRes] = await Promise.all([
        api.get("/modules"),
        api.get("/resumes/with-modules")
      ]);
      
      setModules(modulesRes.data?.data || []);
      setResumes(resumesRes.data?.data || []);
    } catch (err) {
      console.error("Error fetching data:", err);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (moduleId) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  // Group resumes by module and course
  const getResumesByModule = (moduleId) => {
    return resumes.filter(r => r.moduleId?._id === moduleId || r.moduleId === moduleId);
  };

  const getResumesByCourse = (moduleId, courseName) => {
    return resumes.filter(r => 
      (r.moduleId?._id === moduleId || r.moduleId === moduleId) && 
      r.courseName === courseName
    );
  };

  const getCoursesForModule = (moduleId) => {
    const moduleResumes = getResumesByModule(moduleId);
    const courses = [...new Set(moduleResumes.map(r => r.courseName))];
    return courses.filter(Boolean);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleSubmit = async () => {
    if (!selectedModule || !courseName.trim() || !resumeName.trim() || !file) {
      toast.error("Veuillez remplir tous les champs requis");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('moduleId', selectedModule);
      formData.append('courseName', courseName.trim());
      formData.append('title', resumeName.trim());

      const response = await api.post("/resumes/admin-upload", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success("Résumé importé avec succès !");
      
      // Reset form
      setSelectedModule("");
      setCourseName("");
      setResumeName("");
      setFile(null);
      
      // Refresh data
      fetchData();
    } catch (error) {
      console.error("Error uploading resume:", error);
      toast.error("Erreur lors de l'import du résumé");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteResume = async (resumeId, resumeTitle) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${resumeTitle}" ?`)) {
      return;
    }

    try {
      await api.delete(`/resumes/${resumeId}`);
      toast.success("Résumé supprimé avec succès !");
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Error deleting resume:", error);
      toast.error("Erreur lors de la suppression du résumé");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold text-foreground">Résumés</h2>
          <p className="text-muted-foreground">Importer et parcourir les résumés par module et cours</p>
        </div>

        {/* Import Section */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <ArrowRight className="w-5 h-5" />
              For import:
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Select your module hierarchy and provide the file details
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Module Select */}
              <div className="space-y-2">
                <Label className="font-medium text-foreground">
                  Module <span className="text-red-500">*</span>
                </Label>
                <Select value={selectedModule} onValueChange={setSelectedModule}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Choose a module" />
                  </SelectTrigger>
                  <SelectContent>
                    {modules.map((module) => (
                      <SelectItem key={module._id} value={module._id}>
                        {module.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Course Name Input */}
              <div className="space-y-2">
                <Label className="font-medium text-foreground">
                  Course name <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="text input"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>

            {/* File Upload Area */}
            <div
              className="border-2 border-dashed border-blue-300 rounded-lg p-8 bg-blue-50/30 hover:bg-blue-50/50 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <div className="flex flex-col items-center gap-3">
                <Upload className="w-10 h-10 text-blue-500" />
                <div className="text-center">
                  <p className="font-medium text-foreground">
                    Drop your file here or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Supports PDF, Word (.doc, .docx), and Images (.jpg, .png, .gif, .webp)
                  </p>
                </div>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="bg-card"
                  onClick={(e) => {
                    e.stopPropagation();
                    document.getElementById('file-upload')?.click();
                  }}
                >
                  Browse Files
                </Button>
              </div>
            </div>

            {/* File Preview */}
            {file && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-900">
                  Selected file: {file.name}
                </p>
              </div>
            )}

            {/* Resume Name Input */}
            <div className="space-y-2">
              <Label className="font-medium text-foreground">
                Resume Name <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                placeholder="e.g. Résumé - ECG DS 1"
                value={resumeName}
                onChange={(e) => setResumeName(e.target.value)}
                className="h-10"
              />
              <p className="text-xs text-muted-foreground">
                This will be used to identify the imported resume
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-start pt-2">
              <Button
                onClick={handleSubmit}
                disabled={uploading || !selectedModule || !courseName.trim() || !resumeName.trim() || !file}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Submit
                  </>
                )}
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              → it will be appaired like lien (URL)
            </p>
          </CardContent>
        </Card>

        {/* Modules Accordion */}
        <div className="space-y-3">
          {modules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Aucun module trouvé
            </div>
          ) : (
            modules.map((module) => {
              const courses = getCoursesForModule(module._id);
              const isExpanded = expandedModules[module._id];

              return (
                <div key={module._id} className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                  {/* Module Header */}
                  <button
                    onClick={() => toggleModule(module._id)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-background transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-foreground">
                        {module.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border-t border-border"
                      >
                        <div className="px-6 py-4 bg-card">
                          {courses.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">Aucun résumé disponible</p>
                          ) : (
                            <div className="space-y-2">
                              {courses.map((courseName, index) => {
                                const courseResumes = getResumesByCourse(module._id, courseName);
                                
                                return (
                                  <div key={index} className="flex items-start gap-3 text-sm">
                                    <span className="font-medium text-foreground whitespace-nowrap">
                                      - {courseName} :
                                    </span>
                                    <div className="flex flex-wrap gap-x-2 gap-y-1">
                                      {courseResumes.map((resume, idx) => {
                                        const pdfFullUrl = resume.pdfUrl?.startsWith('http') ? resume.pdfUrl : `${import.meta.env.VITE_API_URL?.replace('/api/v1', '')}${resume.pdfUrl}`;
                                        return (
                                          <React.Fragment key={resume._id}>
                                            <div className="inline-flex items-center gap-1.5">
                                              <a
                                                href={pdfFullUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-800 hover:underline"
                                              >
                                                {resume.title} (lien)
                                              </a>
                                              <button
                                                onClick={() => handleDeleteResume(resume._id, resume.title)}
                                                className="text-red-500 hover:text-red-700 transition-colors p-0.5"
                                                title="Supprimer ce résumé"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                            {idx < courseResumes.length - 1 && (
                                              <span className="text-gray-400">-</span>
                                            )}
                                          </React.Fragment>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportResumes;
