import React, { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import {
  FileText, Download, Check, X, Eye, Loader2, BookOpen,
  Plus, ChevronDown, ChevronRight, FolderOpen, File,
  Upload, Trash2, Edit
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { PageHeader, StatCard, TableFilters } from "@/components/shared";
import { toast } from "sonner";
import { api } from "@/lib/utils";

const ResumesAdmin = () => {
  const { t } = useTranslation(['admin', 'common']);
  const [resumes, setResumes] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Upload dialog state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    moduleId: "",
    courseName: "",
    title: "",
    pdfFile: null
  });
  const [uploading, setUploading] = useState(false);

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModule, setSelectedModule] = useState("all");

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
      setResumes(list);
    } catch (e) {
      setError(t('admin:failed_load_resumes'));
      toast.error(t('common:error_loading'));
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

  // Filter grouped resumes
  const filteredGroupedResumes = Object.entries(groupedResumes).reduce((acc, [moduleId, moduleData]) => {
    if (selectedModule !== "all" && moduleId !== selectedModule) {
      return acc;
    }

    const filteredCourses = Object.entries(moduleData.courses).reduce((courseAcc, [courseName, courseResumes]) => {
      const filteredPdfs = courseResumes.filter(resume =>
        resume.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        courseName.toLowerCase().includes(searchTerm.toLowerCase())
      );

      if (filteredPdfs.length > 0) {
        courseAcc[courseName] = filteredPdfs;
      }
      return courseAcc;
    }, {});

    if (Object.keys(filteredCourses).length > 0) {
      acc[moduleId] = {
        name: moduleData.name,
        courses: filteredCourses
      };
    }

    return acc;
  }, {});

  const handleUpload = async () => {
    if (!uploadForm.moduleId || !uploadForm.courseName || !uploadForm.title || !uploadForm.pdfFile) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("moduleId", uploadForm.moduleId);
      formData.append("courseName", uploadForm.courseName);
      formData.append("title", uploadForm.title);
      formData.append("pdf", uploadForm.pdfFile);
      formData.append("isAdminUpload", "true");

      await api.post("/resumes/admin-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      toast.success("Résumé ajouté avec succès");
      setUploadOpen(false);
      setUploadForm({ moduleId: "", courseName: "", title: "", pdfFile: null });
      fetchResumes();
    } catch (e) {
      toast.error("Erreur lors de l'upload");
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce résumé ?")) return;

    try {
      await api.delete(`/resumes/${id}`);
      toast.success("Résumé supprimé");
      fetchResumes();
    } catch (e) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleSeePDF = (pdfUrl) => {
    if (!pdfUrl) {
      toast.error("PDF non disponible");
      return;
    }
    // Construct full URL for local paths
    const fullUrl = pdfUrl.startsWith('http') ? pdfUrl : `${import.meta.env.VITE_API_URL?.replace('/api/v1', '')}${pdfUrl}`;
    window.open(fullUrl, "_blank");
  };

  const handleApprove = async (id) => {
    try {
      await api.patch(`/resumes/${id}/status`, { status: "approved" });
      toast.success("Résumé approuvé avec succès");
      fetchResumes();
    } catch (e) {
      console.error("Error approving resume:", e);
      toast.error("Erreur lors de l'approbation");
    }
  };

  const handleReject = async (id) => {
    try {
      await api.patch(`/resumes/${id}/status`, { status: "rejected" });
      toast.success("Résumé rejeté");
      fetchResumes();
    } catch (e) {
      console.error("Error rejecting resume:", e);
      toast.error("Erreur lors du rejet");
    }
  };

  // Separate user submissions (pending for approval) from admin uploads
  const userSubmissions = resumes.filter(r => !r.isAdminUpload && r.userId);
  const pendingSubmissions = userSubmissions.filter(r => r.status === "pending");

  const totalResumes = resumes.length;
  const totalModules = Object.keys(groupedResumes).length;
  const totalCourses = Object.values(groupedResumes).reduce(
    (sum, mod) => sum + Object.keys(mod.courses).length,
    0
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto" />
          <p className="text-muted-foreground">Chargement des résumés...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <PageHeader
            title="Gestion des Résumés"
            description="Organisez les résumés par Module et Cours"
          />

          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Ajouter un Résumé
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Ajouter un nouveau résumé</DialogTitle>
                <DialogDescription>
                  Uploadez un PDF de résumé pour un cours spécifique
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Module</Label>
                  <Select
                    value={uploadForm.moduleId}
                    onValueChange={(v) => setUploadForm(prev => ({ ...prev, moduleId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un module" />
                    </SelectTrigger>
                    <SelectContent>
                      {modules.map(mod => (
                        <SelectItem key={mod._id} value={mod._id}>
                          {mod.name} ({mod.semester})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Nom du Cours</Label>
                  <Input
                    placeholder="Ex: Anatomie I, Biochimie..."
                    value={uploadForm.courseName}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, courseName: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Titre du Résumé</Label>
                  <Input
                    placeholder="Ex: Résumé Chapitre 1"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Fichier PDF</Label>
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setUploadForm(prev => ({ ...prev, pdfFile: e.target.files?.[0] }))}
                  />
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setUploadOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleUpload} disabled={uploading}>
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Upload...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Uploader
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Total Résumés"
            value={totalResumes.toString()}
            icon={<FileText className="w-6 h-6" />}
            variant="blue"
          />
          <StatCard
            title="Modules"
            value={totalModules.toString()}
            icon={<FolderOpen className="w-6 h-6" />}
            variant="purple"
          />
          <StatCard
            title="Cours"
            value={totalCourses.toString()}
            icon={<BookOpen className="w-6 h-6" />}
            variant="green"
          />
        </div>

        {/* User Submissions Section */}
        {userSubmissions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-orange-500" />
                Soumissions des Utilisateurs
                {pendingSubmissions.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {pendingSubmissions.length} en attente
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Résumés soumis par les utilisateurs - nécessitent une approbation
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Titre</TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead>Cours</TableHead>
                      <TableHead>PDF</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userSubmissions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Aucune soumission d'utilisateur
                        </TableCell>
                      </TableRow>
                    ) : (
                      userSubmissions.map((submission) => (
                        <TableRow key={submission._id}>
                          <TableCell className="font-mono text-xs">
                            {submission._id?.slice(-6) || "—"}
                          </TableCell>
                          <TableCell className="font-medium">
                            {submission.userId?.name || submission.userId?.email || "Utilisateur"}
                          </TableCell>
                          <TableCell>{submission.title || "—"}</TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {submission.moduleId?.name || "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{submission.courseName || "—"}</span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSeePDF(submission.pdfUrl)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Voir
                            </Button>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              submission.status === "approved" ? "success" :
                                submission.status === "rejected" ? "destructive" :
                                  "secondary"
                            }>
                              {submission.status === "approved" ? "Approuvé" :
                                submission.status === "rejected" ? "Rejeté" :
                                  "En attente"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {submission.status === "pending" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleApprove(submission._id)}
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                    title="Approuver"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleReject(submission._id)}
                                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                    title="Rejeter"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(submission._id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <TableFilters
                  onSearch={setSearchTerm}
                  placeholder="Rechercher par titre ou cours..."
                  showYearFilter={false}
                />
              </div>
              <div className="w-full md:w-64">
                <Select value={selectedModule} onValueChange={setSelectedModule}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrer par module" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les modules</SelectItem>
                    {modules.map(mod => (
                      <SelectItem key={mod._id} value={mod._id}>
                        {mod.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hierarchical View */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-blue-500" />
              Structure des Résumés
            </CardTitle>
            <CardDescription>
              Module → Cours → PDFs
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            {Object.keys(filteredGroupedResumes).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun résumé trouvé</p>
                <p className="text-sm mt-2">Cliquez sur "Ajouter un Résumé" pour commencer</p>
              </div>
            ) : (
              <Accordion type="multiple" className="w-full">
                {Object.entries(filteredGroupedResumes).map(([moduleId, moduleData]) => (
                  <AccordionItem key={moduleId} value={moduleId}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <FolderOpen className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold">{moduleData.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {Object.keys(moduleData.courses).length} cours • {
                              Object.values(moduleData.courses).reduce((sum, pdfs) => sum + pdfs.length, 0)
                            } résumés
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-6">
                      <Accordion type="multiple" className="w-full">
                        {Object.entries(moduleData.courses).map(([courseName, coursePdfs]) => (
                          <AccordionItem key={courseName} value={`${moduleId}-${courseName}`}>
                            <AccordionTrigger className="hover:no-underline py-2">
                              <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-purple-100 rounded">
                                  <BookOpen className="h-4 w-4 text-purple-600" />
                                </div>
                                <div className="text-left">
                                  <p className="font-medium text-sm">{courseName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {coursePdfs.length} résumé{coursePdfs.length > 1 ? 's' : ''}
                                  </p>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pl-8">
                              <div className="space-y-2">
                                {coursePdfs.map((pdf) => (
                                  <div
                                    key={pdf._id}
                                    className="flex items-center justify-between p-3 bg-background rounded-lg hover:bg-muted transition-colors"
                                  >
                                    <div className="flex items-center gap-3">
                                      <File className="h-4 w-4 text-red-500" />
                                      <div>
                                        <p className="text-sm font-medium">{pdf.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {new Date(pdf.createdAt).toLocaleDateString('fr-FR')}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleSeePDF(pdf.pdfUrl)}
                                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(pdf._id)}
                                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
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

export default ResumesAdmin;
