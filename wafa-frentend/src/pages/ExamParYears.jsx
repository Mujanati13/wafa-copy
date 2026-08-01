import { useMemo, useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Calendar, Search, Filter, Plus, Edit, Trash2, Eye, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/shared";
import { toast } from "sonner";
import NewExamForm from "@/components/admin/NewExamForm";
import { api } from "@/lib/utils";

const DEFAULT_EXAM_IMAGE = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSMC9M_cEyx3SqKeJVj_RbrtTxkDXhVP1k_2A&s";

const ExamParYears = () => {
  const { t } = useTranslation(['admin', 'common']);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAddExamForm, setShowAddExamForm] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [viewingExam, setViewingExam] = useState(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [moduleFilter, setModuleFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [semesterFilter, setSemesterFilter] = useState("all"); // New: semester filter for form
  const [formSemesterFilter, setFormSemesterFilter] = useState("all"); // New: semester filter for module selection in form
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [formData, setFormData] = useState({
    examName: "",
    moduleName: "",
    year: "",
    imageUrl: DEFAULT_EXAM_IMAGE,
    helpText: "",
    courseCategoryId: "",
  });

  const placeholderImage = DEFAULT_EXAM_IMAGE;

  useEffect(() => {
    fetchExams();
    fetchModules();
    fetchCourseCategories();
  }, [showCreateForm]);

  const [modules, setModules] = useState([]);
  const [courseCategories, setCourseCategories] = useState([]);

  const fetchModules = async () => {
    try {
      const { data } = await api.get("/modules");
      setModules(data?.data || []);
    } catch (err) {
      console.error("Error fetching modules:", err);
    }
  };

  const fetchCourseCategories = async () => {
    try {
      const { data } = await api.get("/course-categories");
      setCourseCategories(data?.data || []);
    } catch (err) {
      console.error("Error fetching course categories:", err);
    }
  };

  const handleAddExam = async () => {
    if (!formData.examName || !formData.moduleName || !formData.year) {
      toast.error(t('admin:fill_required_fields'));
      return;
    }

    try {
      // Find module ID from name
      const selectedModule = modules.find(m => m.name === formData.moduleName);
      if (!selectedModule) {
        toast.error("Module non trouvé");
        return;
      }

      await api.post("/exams/create", {
        name: formData.examName,
        moduleId: selectedModule._id,
        year: parseInt(formData.year),
        imageUrl: formData.imageUrl || DEFAULT_EXAM_IMAGE,
        infoText: formData.helpText || "",
        courseCategoryId: formData.courseCategoryId || null,
      });

      setShowAddExamForm(false);
      setFormSemesterFilter("all");
      setFormData({
        examName: "",
        moduleName: "",
        year: "",
        imageUrl: DEFAULT_EXAM_IMAGE,
        helpText: "",
        courseCategoryId: "",
      });
      toast.success(t('admin:exam_added_success'));
      fetchExams();
    } catch (err) {
      console.error("Error creating exam:", err);
      const errorMessage = err.response?.data?.message || "";
      
      if (errorMessage.toLowerCase().includes("unique") || errorMessage.toLowerCase().includes("already exists")) {
        toast.error("Cet examen existe déjà. Veuillez utiliser un nom différent pour cette année.", {
          description: `Un examen avec le nom "${formData.examName}" existe déjà pour cette année.`,
          duration: 5000
        });
      } else if (errorMessage) {
        toast.error(errorMessage);
      } else {
        toast.error("Erreur lors de la création de l'examen");
      }
    }
  };

  const handleDeleteExam = async (examId) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet examen ?")) return;

    try {
      await api.delete(`/exams/delete/${examId}`);
      toast.success("Examen supprimé avec succès");
      fetchExams();
    } catch (err) {
      console.error("Error deleting exam:", err);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(new Set(currentExams.map(e => e.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (id, checked) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedItems(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedItems.size} examen(s) ?`)) return;

    try {
      await Promise.all(
        Array.from(selectedItems).map(id => api.delete(`/exams/delete/${id}`))
      );
      toast.success(`${selectedItems.size} examen(s) supprimé(s) avec succès`);
      setSelectedItems(new Set());
      fetchExams();
    } catch (error) {
      console.error("Error bulk deleting exams:", error);
      toast.error("Erreur lors de la suppression groupée");
    }
  };

  const handleEditExam = (exam) => {
    // Find the module to get its semester for the form filter
    const module = modules.find(m => m.name === exam.moduleName);
    if (module && module.semester) {
      setFormSemesterFilter(module.semester);
    }
    
    setFormData({
      examName: exam.examName || "",
      moduleName: exam.moduleName || "",
      year: String(exam.year || ""),
      imageUrl: (exam.imageUrl === placeholderImage || !exam.imageUrl) ? DEFAULT_EXAM_IMAGE : exam.imageUrl,
      helpText: exam.helpText || "",
      courseCategoryId: exam.courseCategoryId || "",
    });
    setEditingExam(exam);
    setShowAddExamForm(true);
  };

  const handleUpdateExam = async () => {
    if (!formData.examName || !formData.moduleName || !formData.year) {
      toast.error(t('admin:fill_required_fields'));
      return;
    }

    try {
      const selectedModule = modules.find(m => m.name === formData.moduleName);
      if (!selectedModule) {
        toast.error("Module non trouvé");
        return;
      }

      const response = await api.patch(`/exams/update/${editingExam.id}`, {
        name: formData.examName,
        moduleId: selectedModule._id,
        year: parseInt(formData.year),
        imageUrl: formData.imageUrl || DEFAULT_EXAM_IMAGE,
        infoText: formData.helpText || "",
        courseCategoryId: formData.courseCategoryId || null,
      });

      if (response.data?.success) {
        setShowAddExamForm(false);
        setEditingExam(null);
        setFormSemesterFilter("all");
        setFormData({
          examName: "",
          moduleName: "",
          year: "",
          imageUrl: DEFAULT_EXAM_IMAGE,
          helpText: "",
        });
        toast.success("Examen mis à jour avec succès");
        fetchExams();
      } else {
        toast.error(response.data?.message || "Erreur lors de la mise à jour");
      }
    } catch (err) {
      console.error("Error updating exam:", err);
      const errorMessage = err.response?.data?.message || "";
      
      if (errorMessage.toLowerCase().includes("unique") || errorMessage.toLowerCase().includes("already exists")) {
        toast.error("Cet examen existe déjà. Veuillez utiliser un nom différent.", {
          description: `Un examen avec le nom "${formData.examName}" existe déjà pour cette année.`,
          duration: 5000
        });
      } else if (errorMessage) {
        toast.error(errorMessage);
      } else {
        toast.error("Erreur lors de la mise à jour de l'examen");
      }
    }
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const fetchExams = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get("/exams/all");
      const list = (data?.data || []).map((e) => ({
        id: e?._id,
        moduleName: e?.moduleName || e?.moduleId?.name || "",
        examName: e?.name || "",
        year: String(e?.year ?? ""),
        imageUrl: e?.imageUrl || placeholderImage,
        totalQuestions: e?.totalQuestions || 0, // Use totalQuestions from backend
        helpText: e?.infoText || "",
        courseCategoryId: e?.courseCategoryId || "",
        status: "active",
      }));
      list.sort((a, b) => b.year.localeCompare(a.year));
      setExams(list);
    } catch (err) {
      console.error("Error fetching exams:", err);
      setError(t('admin:failed_load_exams'));
      toast.error(t('common:error_loading'));
    } finally {
      setLoading(false);
    }
  };

  const filteredExams = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return exams.filter((exam) => {
      // Check module filter
      const passesModule = moduleFilter === "all" || exam.moduleName === moduleFilter;
      
      // Check year filter - ensure both are strings for comparison
      const passesYear = yearFilter === "all" || String(exam.year) === String(yearFilter);
      
      // Check semester filter - find module and compare semester
      let passesSemester = true;
      if (semesterFilter !== "all") {
        const examModule = modules.find(m => m.name === exam.moduleName);
        passesSemester = examModule && examModule.semester === semesterFilter;
      }
      
      // Check search
      const passesSearch =
        exam.examName.toLowerCase().includes(term) ||
        exam.moduleName.toLowerCase().includes(term) ||
        String(exam.year).includes(term) ||
        String(exam.id).includes(term);
      
      return passesModule && passesYear && passesSemester && passesSearch;
    });
  }, [searchTerm, moduleFilter, yearFilter, semesterFilter, exams, modules]);

  const totalPages = Math.ceil(filteredExams.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentExams = filteredExams.slice(startIndex, endIndex);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, moduleFilter, yearFilter, semesterFilter]);

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const buttons = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);

    buttons.push(
      <Button key="prev" variant="outline" size="sm" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="gap-1">
        <ChevronLeft className="h-4 w-4" />
        Précédent
      </Button>
    );

    for (let i = start; i <= end; i++) {
      buttons.push(
        <Button key={i} variant={i === currentPage ? "default" : "outline"} size="sm" onClick={() => goToPage(i)} className="min-w-[40px]">
          {i}
        </Button>
      );
    }

    buttons.push(
      <Button key="next" variant="outline" size="sm" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="gap-1">
        Suivant
        <ChevronRight className="h-4 w-4" />
      </Button>
    );

    return <div className="flex items-center gap-2">{buttons}</div>;
  };

  // Get unique modules filtered by selected semester
  const getUniqueModules = () => {
    let filteredModules = modules;
    if (semesterFilter !== "all") {
      filteredModules = modules.filter(m => m.semester === semesterFilter);
    }
    // Get module names that have exams
    const moduleNames = filteredModules.map(m => m.name);
    return Array.from(new Set(exams
      .filter(e => moduleNames.includes(e.moduleName))
      .map((e) => e.moduleName)
      .filter(m => m && m !== "")
    )).sort();
  };
  
  const uniqueModules = getUniqueModules();
  const uniqueYears = Array.from(new Set(exams.map((e) => e.year).filter(y => y && y !== ""))).sort((a, b) => b - a);

  if (loading) {
    return (
      <div className="min-h-screen bg-card flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement des examens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-card">


      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Bulk Delete Toolbar */}
        {selectedItems.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center justify-between"
          >
            <span className="font-medium">{selectedItems.size} élément(s) sélectionné(s)</span>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Supprimer la sélection
            </Button>
          </motion.div>
        )}

        {/* Action Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        >
          <div>
            <h2 className="text-2xl font-bold text-black mb-1">Répertoire des Examens</h2>
            <p className="text-muted-foreground">Total: <span className="font-semibold text-black">{filteredExams.length}</span> examens</p>
          </div>
          <Button
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
            onClick={() => setShowAddExamForm(true)}
          >
            <Plus className="w-5 h-5 mr-2" />
            Créer Examen
          </Button>
        </motion.div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Répertoire des Examens
            </CardTitle>
            <CardDescription>Rechercher et gérer les examens par années</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input type="text" placeholder="Rechercher par nom, module ou année..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <Select value={semesterFilter} onValueChange={(value) => {
                setSemesterFilter(value);
                // Reset module filter when semester changes to ensure valid module is selected
                setModuleFilter("all");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les semestres" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les semestres</SelectItem>
                  {["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10", "EXT"].map((sem) => (
                    <SelectItem key={sem} value={sem}>
                      {sem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les modules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les modules</SelectItem>
                  {uniqueModules.map((module) => (
                    <SelectItem key={module} value={module}>
                      {module}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les années" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les années</SelectItem>
                  {Array.from(new Set(exams.map((e) => e.year).filter(y => y && y !== ""))).sort((a, b) => parseInt(b) - parseInt(a)).map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && <div className="text-sm text-red-600 p-3 bg-red-50 rounded-md">{error}</div>}

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={currentExams.length > 0 && selectedItems.size === currentExams.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Nom de l'Examen</TableHead>
                    <TableHead>Année</TableHead>
                    <TableHead>Image</TableHead>
                    <TableHead>Texte d'aide</TableHead>
                    <TableHead>Questions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentExams.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        Aucun examen trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentExams.map((exam) => (
                      <TableRow key={exam.id}>
                        <TableCell className="w-12">
                          <Checkbox
                            checked={selectedItems.has(exam.id)}
                            onCheckedChange={(checked) => handleSelectItem(exam.id, checked)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{exam.id}</TableCell>
                        <TableCell className="font-medium">{exam.moduleName}</TableCell>
                        <TableCell className="font-medium">{exam.examName}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{exam.year}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="w-16 h-12 rounded-md overflow-hidden bg-muted border">
                            <img src={exam.imageUrl} alt={exam.examName} className="w-full h-full object-cover" />
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={exam.helpText}>
                          {exam.helpText || "—"}
                        </TableCell>
                        <TableCell>{exam.totalQuestions}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => {
                                setViewingExam(exam);
                                setShowViewDialog(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleEditExam(exam)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteExam(exam.id)}
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
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t bg-background/50">
            <div className="text-sm text-muted-foreground">
              Affichage de {filteredExams.length === 0 ? 0 : startIndex + 1} à {Math.min(endIndex, filteredExams.length)} sur {filteredExams.length} résultats
            </div>
            {renderPagination()}
          </CardFooter>
        </Card>
      </div>

      {showCreateForm && <NewExamForm setShowNewExamForm={setShowCreateForm} modules={uniqueModules} years={uniqueYears} />}

      {/* Add/Edit Exam Dialog */}
      <AnimatePresence>
        {showAddExamForm && (
          <Dialog open={showAddExamForm} onOpenChange={setShowAddExamForm}>
            <DialogContent className="bg-card border-border text-black sm:max-w-md max-h-[80vh] overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <DialogHeader>
                  <DialogTitle className="text-black text-xl">
                    {editingExam ? "Modifier l'examen" : "Créer un nouvel examen"}
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Ajouter un examen avec tous les détails nécessaires
                  </DialogDescription>
                </DialogHeader>

                <form className="space-y-4 py-4" onSubmit={(e) => { e.preventDefault(); editingExam ? handleUpdateExam() : handleAddExam(); }}>
                  <div className="space-y-2">
                    <Label className="text-black font-medium">Nom de l'examen *</Label>
                    <Input
                      placeholder="Ex: Examen Final de Biologie"
                      value={formData.examName}
                      onChange={(e) => handleFormChange("examName", e.target.value)}
                      className="bg-background border-gray-300 text-black placeholder:text-muted-foreground focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  {/* Semester filter for module selection */}
                  <div className="space-y-2">
                    <Label className="text-black font-medium">Filtrer par semestre</Label>
                    <Select value={formSemesterFilter} onValueChange={(value) => {
                      setFormSemesterFilter(value);
                      // Reset module selection when semester changes
                      if (formData.moduleName) {
                        const currentModule = modules.find(m => m.name === formData.moduleName);
                        if (currentModule && value !== "all" && currentModule.semester !== value) {
                          handleFormChange("moduleName", "");
                        }
                      }
                    }}>
                      <SelectTrigger className="bg-background border-gray-300 text-black">
                        <SelectValue placeholder="Tous les semestres" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="all" className="text-black">Tous les semestres</SelectItem>
                        <SelectItem value="S1" className="text-black">Semestre 1</SelectItem>
                        <SelectItem value="S2" className="text-black">Semestre 2</SelectItem>
                        <SelectItem value="S3" className="text-black">Semestre 3</SelectItem>
                        <SelectItem value="S4" className="text-black">Semestre 4</SelectItem>
                        <SelectItem value="S5" className="text-black">Semestre 5</SelectItem>
                        <SelectItem value="S6" className="text-black">Semestre 6</SelectItem>
                        <SelectItem value="S7" className="text-black">Semestre 7</SelectItem>
                        <SelectItem value="S8" className="text-black">Semestre 8</SelectItem>
                        <SelectItem value="S9" className="text-black">Semestre 9</SelectItem>
                        <SelectItem value="S10" className="text-black">Semestre 10</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-black font-medium">Module *</Label>
                    <Select value={formData.moduleName} onValueChange={(value) => handleFormChange("moduleName", value)}>
                      <SelectTrigger className="bg-background border-gray-300 text-black">
                        <SelectValue placeholder="Sélectionner un module" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {modules
                          .filter(mod => formSemesterFilter === "all" || mod.semester === formSemesterFilter)
                          .map((mod) => (
                            <SelectItem key={mod._id} value={mod.name} className="text-black">
                              {mod.name} {mod.semester ? `(${mod.semester})` : ""}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {formSemesterFilter !== "all" && (
                      <p className="text-xs text-muted-foreground">
                        {modules.filter(m => m.semester === formSemesterFilter).length} module(s) dans {formSemesterFilter}
                      </p>
                    )}
                  </div>

                  {/* Course Category Select - Optional */}
                  <div className="space-y-2">
                    <Label className="text-black font-medium">Catégorie de cours (optionnel)</Label>
                    <Select 
                      value={formData.courseCategoryId || "none"} 
                      onValueChange={(value) => handleFormChange("courseCategoryId", value === "none" ? "" : value)}
                      disabled={!formData.moduleName}
                    >
                      <SelectTrigger className="bg-background border-gray-300 text-black">
                        <SelectValue placeholder={formData.moduleName ? "Sélectionner une catégorie" : "Sélectionnez d'abord un module"} />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="none" className="text-muted-foreground">
                          Aucune catégorie
                        </SelectItem>
                        {formData.moduleName && (() => {
                          const selectedModule = modules.find(m => m.name === formData.moduleName);
                          if (!selectedModule) return null;
                          
                          const filteredCategories = courseCategories.filter(cat => {
                            const catModuleId = typeof cat.moduleId === 'object' ? cat.moduleId?._id : cat.moduleId;
                            return catModuleId === selectedModule._id;
                          });
                          
                          return filteredCategories.map((cat) => (
                            <SelectItem key={cat._id} value={cat._id} className="text-black">
                              {cat.name}
                            </SelectItem>
                          ));
                        })()}
                      </SelectContent>
                    </Select>
                    {formData.moduleName && (() => {
                      const selectedModule = modules.find(m => m.name === formData.moduleName);
                      const count = selectedModule 
                        ? courseCategories.filter(cat => {
                            const catModuleId = typeof cat.moduleId === 'object' ? cat.moduleId?._id : cat.moduleId;
                            return catModuleId === selectedModule._id;
                          }).length
                        : 0;
                      return count > 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {count} catégorie(s) disponible(s)
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400">
                          Aucune catégorie pour ce module
                        </p>
                      );
                    })()}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-black font-medium">Année *</Label>
                    <Select value={formData.year} onValueChange={(value) => handleFormChange("year", value)}>
                      <SelectTrigger className="bg-background border-gray-300 text-black">
                        <SelectValue placeholder="Sélectionner une année" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                          <SelectItem key={year} value={String(year)} className="text-black">
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-black font-medium">URL de l'image</Label>
                    <Input
                      placeholder="https://..."
                      value={formData.imageUrl}
                      onChange={(e) => handleFormChange("imageUrl", e.target.value)}
                      className="bg-background border-gray-300 text-black placeholder:text-muted-foreground focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-black font-medium">Texte d'aide (description)</Label>
                    <textarea
                      placeholder="Entrez une description ou des informations supplémentaires..."
                      value={formData.helpText}
                      onChange={(e) => handleFormChange("helpText", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-background text-black placeholder:text-muted-foreground focus:border-blue-500 focus:ring-blue-500 min-h-[80px] resize-none"
                    />
                  </div>

                  <DialogFooter className="gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-gray-300 text-black hover:bg-muted hover:text-black"
                      onClick={() => {
                        setShowAddExamForm(false);
                        setEditingExam(null);
                        setFormSemesterFilter("all");
                        setFormData({ examName: "", moduleName: "", year: "", imageUrl: DEFAULT_EXAM_IMAGE, helpText: "" });
                      }}
                    >
                      Annuler
                    </Button>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        type="submit"
                        className={editingExam ? "bg-green-600 hover:bg-green-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}
                      >
                        {editingExam ? "Mettre à jour" : "Créer Examen"}
                      </Button>
                    </motion.div>
                  </DialogFooter>
                </form>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}

        {/* View Dialog */}
        {showViewDialog && viewingExam && (
          <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
            <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Détails de l'Examen</DialogTitle>
                <DialogDescription>
                  Informations complètes de l'examen
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Nom de l'examen</Label>
                  <p className="text-foreground bg-background p-2 rounded border">{viewingExam.examName}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Module</Label>
                  <p className="text-foreground bg-background p-2 rounded border">{viewingExam.moduleName}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Année</Label>
                  <p className="text-foreground bg-background p-2 rounded border">{viewingExam.year}</p>
                </div>
                {viewingExam.imageUrl && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-foreground">Image</Label>
                    <img src={viewingExam.imageUrl} alt={viewingExam.examName} className="w-full h-32 object-cover rounded border" />
                  </div>
                )}
                {viewingExam.helpText && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-foreground">Texte d'aide</Label>
                    <p className="text-foreground bg-background p-2 rounded border">{viewingExam.helpText}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Total Questions</Label>
                  <p className="text-foreground bg-background p-2 rounded border">{viewingExam.totalQuestions}</p>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setShowViewDialog(false)}>
                  Fermer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExamParYears;
