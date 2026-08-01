import React, { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import {
  FileText, Plus, Loader2, ChevronRight, Upload,
  FolderOpen, Link as LinkIcon, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { api } from "@/lib/utils";

const Resumes = () => {
  const { t } = useTranslation(['admin', 'common']);
  const [resumes, setResumes] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Import dialog state
  const [importOpen, setImportOpen] = useState(false);
  const [importForm, setImportForm] = useState({
    moduleId: "",
    courseName: "",
    title: "",
    pdfFile: null
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchResumes();
    fetchModules();
  }, []);

  const fetchResumes = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await api.get("/resumes");
      const list = Array.isArray(data?.data) ? data.data : [];
      // Only show approved resumes to users
      const approved = list.filter(r => r.status === "approved");
      setResumes(approved);
    } catch (e) {
      setError("Erreur lors du chargement des résumés");
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const fetchModules = async () => {
    try {
      const { data } = await api.get("/modules");
      setModules(data?.data || []);
    } catch (e) {
      console.error("Failed to load modules:", e);
    }
  };

  // Group resumes by Module → Course
  const groupedResumes = resumes.reduce((acc, resume) => {
    const moduleId = resume.moduleId?._id || resume.moduleId || "unknown";
    const moduleName = resume.moduleId?.name || "Sans Module";
    const courseName = resume.courseName || "Sans Cours";

    if (!acc[moduleId]) {
      acc[moduleId] = {
        name: moduleName,
        courses: {}
      };
    }

    if (!acc[moduleId].courses[courseName]) {
      acc[moduleId].courses[courseName] = [];
    }

    acc[moduleId].courses[courseName].push(resume);
    return acc;
  }, {});

  const handleSeePDF = (pdfUrl) => {
    if (!pdfUrl) {
      toast.error("PDF non disponible");
      return;
    }
    // Construct full URL for local paths
    const fullUrl = pdfUrl.startsWith('http') ? pdfUrl : `${import.meta.env.VITE_API_URL?.replace('/api/v1', '')}${pdfUrl}`;
    window.open(fullUrl, "_blank");
  };

  const handleImport = async () => {
    if (!importForm.moduleId || !importForm.courseName || !importForm.title || !importForm.pdfFile) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("moduleId", importForm.moduleId);
      formData.append("courseName", importForm.courseName);
      formData.append("title", importForm.title);
      formData.append("pdf", importForm.pdfFile);
      formData.append("isAdminUpload", "false");
      // Note: User submissions should go through a different endpoint with status "pending"

      await api.post("/resumes/create", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      toast.success("Résumé soumis avec succès! En attente d'approbation.");
      setImportOpen(false);
      setImportForm({ moduleId: "", courseName: "", title: "", pdfFile: null });
      fetchResumes();
    } catch (e) {
      toast.error("Erreur lors de la soumission");
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setImportForm(prev => ({ ...prev, pdfFile: files[0] }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="text-muted-foreground">Chargement des résumés...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Header with Import Button */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Résumés et Cours</h2>
            <p className="text-muted-foreground">Consultez les résumés disponibles par module</p>
          </div>

          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4" />
                Importer un Résumé
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Importer un Résumé</DialogTitle>
                <DialogDescription>
                  Sélectionnez le module et fournissez les détails du fichier
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Module Select */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Module *</Label>
                    <Select
                      value={importForm.moduleId}
                      onValueChange={(v) => setImportForm(prev => ({ ...prev, moduleId: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a module" />
                      </SelectTrigger>
                      <SelectContent>
                        {modules.map(mod => (
                          <SelectItem key={mod._id} value={mod._id}>
                            {mod.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Course name *</Label>
                    <Input
                      placeholder="text input"
                      value={importForm.courseName}
                      onChange={(e) => setImportForm(prev => ({ ...prev, courseName: e.target.value }))}
                    />
                  </div>
                </div>

                {/* File Upload Zone */}
                <div
                  className="border-2 border-dashed border-blue-300 rounded-lg p-6 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer text-center"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <Upload className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">
                    Drop your file here or click to browse
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Supports Excel (.xlsx, .xls) and CSV files
                  </p>
                  <Input
                    type="file"
                    accept=".pdf,.xlsx,.xls,.csv"
                    onChange={(e) => setImportForm(prev => ({ ...prev, pdfFile: e.target.files?.[0] }))}
                    className="hidden"
                    id="resume-file-input"
                  />
                  <label htmlFor="resume-file-input">
                    <Button variant="outline" className="mt-3" type="button" asChild>
                      <span>Browse Files</span>
                    </Button>
                  </label>
                </div>

                {/* File Preview */}
                {importForm.pdfFile && (
                  <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                    <FileText className="h-4 w-4 text-green-600" />
                    <span className="text-green-700">{importForm.pdfFile.name}</span>
                  </div>
                )}

                {/* Resume Name */}
                <div className="space-y-2">
                  <Label>Resume Name *</Label>
                  <Input
                    placeholder="e.g. Résumé - ECG DS 1"
                    value={importForm.title}
                    onChange={(e) => setImportForm(prev => ({ ...prev, title: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    This will be used to identify the imported resume
                  </p>
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setImportOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleImport} disabled={uploading}>
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Submit"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Modules Accordion */}
        <Card>
          <CardContent className="p-4">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            {Object.keys(groupedResumes).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun résumé disponible</p>
                <p className="text-sm mt-2">Cliquez sur "Importer un Résumé" pour ajouter</p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full space-y-2">
                {Object.entries(groupedResumes).map(([moduleId, moduleData]) => (
                  <AccordionItem
                    key={moduleId}
                    value={moduleId}
                    className="border rounded-lg px-4 bg-card"
                  >
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-foreground">
                          {moduleData.name}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="space-y-2 pl-2">
                        {Object.entries(moduleData.courses).map(([courseName, coursePdfs]) => (
                          <div key={courseName} className="flex flex-wrap items-center gap-2 py-1">
                            <span className="text-sm text-muted-foreground min-w-[120px]">
                              - {courseName} :
                            </span>
                            {coursePdfs.map((pdf, idx) => (
                              <React.Fragment key={pdf._id}>
                                {idx > 0 && <span className="text-gray-400">-</span>}
                                <button
                                  onClick={() => handleSeePDF(pdf.pdfUrl)}
                                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                >
                                  {pdf.title || `résumé ${idx + 1}`}
                                  <span className="text-gray-400">(lien)</span>
                                </button>
                              </React.Fragment>
                            ))}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Resumes;
