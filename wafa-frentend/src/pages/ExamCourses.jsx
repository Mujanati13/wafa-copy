import { useMemo, useState, useEffect, useRef } from "react";
import { useTranslation } from 'react-i18next';
import { GraduationCap, Search, Filter, Plus, Edit, Trash2, Eye, ChevronLeft, ChevronRight, Loader2, Upload, X } from "lucide-react";
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
import NewExamCourseForm from "@/components/admin/NewExamCourseForm";
import { api } from "@/lib/utils";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL;
const DEFAULT_COURSE_IMAGE = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSMC9M_cEyx3SqKeJVj_RbrtTxkDXhVP1k_2A&s";

const ExamCourses = () => {
  const { t } = useTranslation(['admin', 'common']);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAddCourseForm, setShowAddCourseForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [viewingCourse, setViewingCourse] = useState(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [moduleFilter, setModuleFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [semesterFilter, setSemesterFilter] = useState("all"); // Semester filter for table
  const [formSemesterFilter, setFormSemesterFilter] = useState("all"); // Semester filter for module selection
  const [useCustomCategory, setUseCustomCategory] = useState(false); // Toggle for custom category input
  const [loadingCategories, setLoadingCategories] = useState(false); // Track loading state for categories
  const [imageFile, setImageFile] = useState(null); // File upload state
  const [imagePreview, setImagePreview] = useState(""); // Image preview URL
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    courseName: "",
    moduleName: "",
    category: "",
    customCategory: "",
    imageUrl: "",
    helpText: "",
  });

  const [examCourses, setExamCourses] = useState([]);
  const [modules, setModules] = useState([]);
  const [courseCategories, setCourseCategories] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set()); // Categories from /course-categories
  const [moduleCategoriesData, setModuleCategoriesData] = useState([]); // Categories filtered by selected module
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const placeholderImage = DEFAULT_COURSE_IMAGE;

  useEffect(() => {
    fetchCourses();
    fetchModules();
    fetchCourseCategories();
  }, []);

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

  const fetchCategoriesForModule = async (moduleId) => {
    if (!moduleId) {
      setModuleCategoriesData([]);
      setLoadingCategories(false);
      return;
    }
    try {
      setLoadingCategories(true);
      // Fetch predefined categories from CourseCategory model for this module
      const { data } = await api.get(`/course-categories`, { params: { moduleId } });
      const categoryNames = (data?.data || []).map(cat => cat.name).filter(Boolean);
      setModuleCategoriesData(categoryNames);
    } catch (err) {
      console.error("Error fetching module categories:", err);
      setModuleCategoriesData([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get("/exam-courses");
      const list = (data?.data || []).map((c) => {
        // Handle image URL - prepend API_URL if it's a relative path
        let imageUrl = c.imageUrl || placeholderImage;
        if (imageUrl && !imageUrl.startsWith("http") && imageUrl !== placeholderImage) {
          imageUrl = `${API_URL?.replace('/api/v1', '')}${imageUrl}`;
        }
        
        return {
          id: c._id,
          moduleName: c.moduleName || c.moduleId?.name || "",
          moduleId: c.moduleId?._id || c.moduleId || "",
          category: c.category || "",
          courseName: c.name || "",
          imageUrl: imageUrl,
          helpText: c.helpText || c.description || "",
          totalQuestions: c.totalQuestions || c.linkedQuestions?.length || 0,
          status: c.status || "active",
        };
      });
      setExamCourses(list);
    } catch (err) {
      console.error("Error fetching courses:", err);
      setError("Erreur lors du chargement des cours");
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return examCourses.filter((course) => {
      const passesModule = moduleFilter === "all" || course.moduleName === moduleFilter;
      const passesCategory = categoryFilter === "all" || course.category === categoryFilter;
      // Check semester filter - find module and compare semester
      const courseModule = modules.find(m => m.name === course.moduleName);
      const passesSemester = semesterFilter === "all" || (courseModule && courseModule.semester === semesterFilter);
      const passesSearch =
        course.courseName.toLowerCase().includes(term) ||
        course.moduleName.toLowerCase().includes(term) ||
        course.category.toLowerCase().includes(term) ||
        String(course.id).includes(term);
      return passesModule && passesCategory && passesSemester && passesSearch;
    });
  }, [searchTerm, moduleFilter, categoryFilter, semesterFilter, examCourses, modules]);

  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCourses = filteredCourses.slice(startIndex, endIndex);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, moduleFilter, categoryFilter, semesterFilter]);

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
        {t('common:previous')}
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
        {t('common:next')}
        <ChevronRight className="h-4 w-4" />
      </Button>
    );

    return <div className="flex items-center gap-2">{buttons}</div>;
  };

  const uniqueModules = Array.from(new Set(examCourses.map((c) => c.moduleName))).filter(Boolean);
  const uniqueCategories = Array.from(new Set(examCourses.map((c) => c.category))).filter(Boolean);
  // Get categories from /course-categories endpoint
  const allCategories = courseCategories.map(cat => cat.name).filter(Boolean);

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Veuillez sélectionner une image valide");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("L'image ne doit pas dépasser 5MB");
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Clear image selection
  const clearImage = () => {
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAddCourse = async () => {
    const categoryToUse = useCustomCategory ? formData.customCategory : formData.category;
    
    // Better validation with specific error messages
    if (!formData.courseName) {
      toast.error("Veuillez entrer le nom du cours");
      return;
    }
    if (!formData.moduleName) {
      toast.error("Veuillez sélectionner un module");
      return;
    }

    try {
      // Find module ID from name
      const selectedModule = modules.find(m => m.name === formData.moduleName);
      if (!selectedModule) {
        toast.error("Module non trouvé");
        return;
      }

      // Use FormData for file upload
      const submitData = new FormData();
      submitData.append("name", formData.courseName);
      submitData.append("moduleId", selectedModule._id);
      submitData.append("category", categoryToUse);
      submitData.append("description", formData.helpText || "");
      
      if (imageFile) {
        submitData.append("courseImage", imageFile);
      }

      await api.post("/exam-courses/create-with-image", submitData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      resetForm();
      toast.success(t('admin:course_added_success'));
      fetchCourses();
    } catch (err) {
      console.error("Error creating course:", err);
      toast.error("Erreur lors de la création du cours");
    }
  };

  const resetForm = () => {
    setShowAddCourseForm(false);
    setEditingCourse(null);
    setFormSemesterFilter("all");
    setUseCustomCategory(false);
    clearImage();
    setFormData({
      courseName: "",
      moduleName: "",
      category: "",
      customCategory: "",
      imageUrl: "",
      helpText: "",
    });
  };

  const handleDeleteCourse = async (courseId) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce cours ?")) return;

    try {
      await api.delete(`/exam-courses/${courseId}`);
      toast.success("Cours supprimé avec succès");
      fetchCourses();
    } catch (err) {
      console.error("Error deleting course:", err);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(new Set(currentCourses.map(c => c.id)));
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
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedItems.size} cours ?`)) return;

    try {
      await Promise.all(
        Array.from(selectedItems).map(id => api.delete(`/exam-courses/${id}`))
      );
      toast.success(`${selectedItems.size} cours supprimé(s) avec succès`);
      setSelectedItems(new Set());
      fetchCourses();
    } catch (error) {
      console.error("Error bulk deleting courses:", error);
      toast.error("Erreur lors de la suppression groupée");
    }
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // When module is changed, fetch categories for that module and reset category selection
    if (field === "moduleName" && value) {
      const selectedModule = modules.find(m => m.name === value);
      if (selectedModule) {
        // Clear previous category selection when module changes
        setFormData((prev) => ({ ...prev, category: "", customCategory: "" }));
        setUseCustomCategory(false);
        fetchCategoriesForModule(selectedModule._id);
      }
    }
  };

  const handleEditCourse = (course) => {
    // Find the module to get its semester for the form filter
    const module = modules.find(m => m.name === course.moduleName);
    if (module && module.semester) {
      setFormSemesterFilter(module.semester);
      // Fetch categories for this module
      fetchCategoriesForModule(module._id);
    }
    
    // Always use select box (no custom toggle needed)
    setUseCustomCategory(false);
    
    setFormData({
      courseName: course.courseName,
      moduleName: course.moduleName,
      category: course.category || "",
      customCategory: "",
      imageUrl: course.imageUrl === placeholderImage ? "" : course.imageUrl,
      helpText: course.helpText || "",
    });
    
    // Set preview for existing image
    if (course.imageUrl && course.imageUrl !== placeholderImage) {
      setImagePreview(course.imageUrl);
    }
    
    setEditingCourse(course);
    setShowAddCourseForm(true);
  };

  const handleUpdateCourse = async () => {
    const categoryToUse = useCustomCategory ? formData.customCategory : formData.category;
    
    // Better validation with specific error messages
    if (!formData.courseName) {
      toast.error("Veuillez entrer le nom du cours");
      return;
    }
    if (!formData.moduleName) {
      toast.error("Veuillez sélectionner un module");
      return;
    }

    try {
      const selectedModule = modules.find(m => m.name === formData.moduleName);
      if (!selectedModule) {
        toast.error("Module non trouvé");
        return;
      }

      // Use FormData for file upload
      const submitData = new FormData();
      submitData.append("name", formData.courseName);
      submitData.append("moduleId", selectedModule._id);
      submitData.append("category", categoryToUse);
      submitData.append("description", formData.helpText || "");
      
      if (imageFile) {
        submitData.append("courseImage", imageFile);
      } else if (editingCourse.imageUrl && editingCourse.imageUrl !== placeholderImage) {
        // Preserve existing image URL if no new file is uploaded
        // Extract relative path if it's a full URL
        let existingUrl = editingCourse.imageUrl;
        if (existingUrl.includes('/uploads/')) {
          existingUrl = existingUrl.substring(existingUrl.indexOf('/uploads/'));
        }
        submitData.append("existingImageUrl", existingUrl);
      }

      await api.put(`/exam-courses/update-with-image/${editingCourse.id}`, submitData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      resetForm();
      toast.success("Cours mis à jour avec succès");
      fetchCourses();
    } catch (err) {
      console.error("Error updating course:", err);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-card flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
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
            className="bg-purple-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center justify-between"
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
            <h2 className="text-2xl font-bold text-black mb-1">{t('admin:course_directory')}</h2>
            <p className="text-muted-foreground">{t('admin:total')}: <span className="font-semibold text-black">{filteredCourses.length}</span> {t('admin:courses')}</p>
          </div>
          <Button
            size="lg"
            className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg"
            onClick={() => setShowAddCourseForm(true)}
          >
            <Plus className="w-5 h-5 mr-2" />
            {t('admin:create_course')}
          </Button>
        </motion.div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              {t('admin:course_directory')}
            </CardTitle>
            <CardDescription>{t('admin:search_manage_exam_courses')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input type="text" placeholder={t('admin:search_by_name_module_category')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <Select value={semesterFilter} onValueChange={setSemesterFilter}>
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
                  <SelectValue placeholder={t('admin:all_modules')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('admin:all_modules')}</SelectItem>
                  {uniqueModules.map((module) => (
                    <SelectItem key={module} value={module}>
                      {module}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les catégories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les catégories</SelectItem>
                  {uniqueCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>                    <TableHead className="w-12">
                      <Checkbox
                        checked={currentCourses.length > 0 && selectedItems.size === currentCourses.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>                    <TableHead>ID</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Nom du Cours</TableHead>
                    <TableHead>Image</TableHead>
                    <TableHead>Aide</TableHead>
                    <TableHead>Questions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentCourses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        Aucun cours trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentCourses.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell className="w-12">
                          <Checkbox
                            checked={selectedItems.has(course.id)}
                            onCheckedChange={(checked) => handleSelectItem(course.id, checked)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{course.id}</TableCell>
                        <TableCell className="font-medium">{course.moduleName}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{course.category}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{course.courseName}</TableCell>
                        <TableCell>
                          <div className="w-16 h-12 rounded-md overflow-hidden bg-muted border">
                            <img src={course.imageUrl} alt={course.courseName} className="w-full h-full object-cover" />
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={course.helpText}>
                          {course.helpText}
                        </TableCell>
                        <TableCell>{course.totalQuestions}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => {
                                setViewingCourse(course);
                                setShowViewDialog(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleEditCourse(course)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteCourse(course.id)}
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
              Affichage de {filteredCourses.length === 0 ? 0 : startIndex + 1} à {Math.min(endIndex, filteredCourses.length)} sur {filteredCourses.length} résultats
            </div>
            {renderPagination()}
          </CardFooter>
        </Card>
      </div>

      {showCreateForm && <NewExamCourseForm setShowNewExamCourseForm={setShowCreateForm} modules={uniqueModules} categories={allCategories} />}

      {/* Add/Edit Course Dialog */}
      <AnimatePresence>
        {showAddCourseForm && (
          <Dialog open={showAddCourseForm} onOpenChange={(open) => { if (!open) resetForm(); }}>
            <DialogContent className="bg-card border-border text-black sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <DialogHeader>
                  <DialogTitle className="text-black text-xl">
                    {editingCourse ? "Modifier le cours" : "Créer un nouveau cours"}
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Ajouter un cours avec tous les détails nécessaires
                  </DialogDescription>
                </DialogHeader>

                <form className="space-y-4 py-4" onSubmit={(e) => { e.preventDefault(); editingCourse ? handleUpdateCourse() : handleAddCourse(); }}>
                  <div className="space-y-2">
                    <Label className="text-black font-medium">Nom du cours *</Label>
                    <Input
                      placeholder="Ex: Système Cardiovasculaire - Anatomie 1"
                      value={formData.courseName}
                      onChange={(e) => handleFormChange("courseName", e.target.value)}
                      className="bg-background border-gray-300 text-black placeholder:text-muted-foreground focus:border-purple-500 focus:ring-purple-500"
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

                  {/* Category selection with select box only */}
                  <div className="space-y-2">
                    <Label className="text-black font-medium">Catégorie</Label>
                    
                    {!formData.moduleName && (
                      <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                        Veuillez d'abord sélectionner un module pour voir les catégories disponibles
                      </p>
                    )}
                    
                    {formData.moduleName && loadingCategories && (
                      <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                        Chargement des catégories...
                      </p>
                    )}
                    
                    {formData.moduleName && !loadingCategories && moduleCategoriesData.length > 0 && (
                      <>
                        <Select value={formData.category} onValueChange={(value) => handleFormChange("category", value)}>
                          <SelectTrigger className="bg-background border-gray-300 text-black">
                            <SelectValue placeholder="Sélectionner une catégorie (optionnel)" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            {moduleCategoriesData.map((cat) => (
                              <SelectItem key={cat} value={cat} className="text-black">
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {moduleCategoriesData.length} catégorie(s) disponible(s)
                        </p>
                      </>
                    )}
                    
                    {formData.moduleName && !loadingCategories && moduleCategoriesData.length === 0 && (
                      <Input
                        placeholder="Aucune catégorie existante - entrez une nouvelle ou laissez vide"
                        value={formData.customCategory}
                        onChange={(e) => handleFormChange("customCategory", e.target.value)}
                        className="bg-background border-gray-300 text-black placeholder:text-muted-foreground focus:border-purple-500 focus:ring-purple-500"
                      />
                    )}
                  </div>

                  {/* Image upload section */}
                  <div className="space-y-2">
                    <Label className="text-black font-medium">Image du cours</Label>
                    <div className="space-y-3">
                      {/* Image preview */}
                      {imagePreview && (
                        <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border">
                          <img 
                            src={imagePreview} 
                            alt="Aperçu" 
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={clearImage}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                      
                      {/* Upload button */}
                      <div className="flex items-center gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          {imagePreview ? "Changer l'image" : "Télécharger une image"}
                        </Button>
                        {imageFile && (
                          <span className="text-xs text-muted-foreground">{imageFile.name}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">Formats acceptés: JPG, PNG, GIF. Max 5MB.</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-black font-medium">Texte d'aide (description)</Label>
                    <textarea
                      placeholder="Entrez une description ou des informations supplémentaires..."
                      value={formData.helpText}
                      onChange={(e) => handleFormChange("helpText", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-background text-black placeholder:text-muted-foreground focus:border-purple-500 focus:ring-purple-500 min-h-[80px] resize-none"
                    />
                  </div>

                  <DialogFooter className="gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-gray-300 text-black hover:bg-muted hover:text-black"
                      onClick={resetForm}
                    >
                      Annuler
                    </Button>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        type="submit"
                        className={editingCourse ? "bg-green-600 hover:bg-green-700 text-white" : "bg-purple-600 hover:bg-purple-700 text-white"}
                      >
                        {editingCourse ? "Mettre à jour" : "Créer Cours"}
                      </Button>
                    </motion.div>
                  </DialogFooter>
                </form>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}

        {/* View Dialog */}
        {showViewDialog && viewingCourse && (
          <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
            <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Détails du Cours</DialogTitle>
                <DialogDescription>Informations complètes du cours</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Nom du cours</Label>
                  <p className="text-foreground bg-background p-2 rounded border">{viewingCourse.courseName}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Module</Label>
                  <p className="text-foreground bg-background p-2 rounded border">{viewingCourse.moduleName}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Catégorie</Label>
                  <p className="text-foreground bg-background p-2 rounded border">{viewingCourse.category}</p>
                </div>
                {viewingCourse.imageUrl && viewingCourse.imageUrl !== placeholderImage && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-foreground">Image</Label>
                    <img src={viewingCourse.imageUrl} alt={viewingCourse.courseName} className="w-full h-32 object-cover rounded border" />
                  </div>
                )}
                {viewingCourse.helpText && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-foreground">Texte d'aide</Label>
                    <p className="text-foreground bg-background p-2 rounded border">{viewingCourse.helpText}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Total Questions</Label>
                  <p className="text-foreground bg-background p-2 rounded border">{viewingCourse.totalQuestions}</p>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setShowViewDialog(false)}>Fermer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExamCourses;
