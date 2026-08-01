import { useMemo, useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Filter, Search, Plus, Edit, Trash2, Layers, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/utils";
import { toast } from "sonner";

const CreateCategoriesForCourses = () => {
  const { t } = useTranslation(['admin', 'common']);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    semester: "",
    moduleId: "",
    category: "",
    imageUrl: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [moduleFilter, setModuleFilter] = useState("all");
  const [semesterFilter, setSemesterFilter] = useState("all");
  const itemsPerPage = 8;

  const [categoriesForCourses, setCategoriesForCourses] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const placeholderImage = "https://via.placeholder.com/150x100/111827/FFFFFF?text=Image";
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const { data } = await api.get("/modules");
      setModules(data?.data || []);
    } catch (err) {
      console.error("Error fetching modules:", err);
    }
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/course-categories");

      // Helper to get full image URL
      const getImageUrl = (imageUrl) => {
        if (!imageUrl) return placeholderImage;
        if (imageUrl.startsWith('/uploads')) {
          const backendUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5010';
          return `${backendUrl}${imageUrl}`;
        }
        return imageUrl;
      };

      const list = (data?.data || []).map((c) => ({
        id: c._id,
        moduleId: c.moduleId?._id || c.moduleId || "",
        moduleName: c.moduleId?.name || "",
        moduleSemester: c.moduleId?.semester || "",
        categoryName: c.name || "",
        imageUrl: getImageUrl(c.imageUrl),
        rawImageUrl: c.imageUrl || "",
        examCourseCount: c.examCourseCount || 0,
        description: c.description || "",
        color: c.color || "#3b82f6",
        status: c.status || "active"
      }));
      setCategoriesForCourses(list);
    } catch (err) {
      console.error("Error fetching categories:", err);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const semesterOptions = useMemo(() => {
    const uniqueSemesters = Array.from(new Set(modules.map((mod) => mod.semester).filter(Boolean)));
    return uniqueSemesters.sort((a, b) => {
      const numA = parseInt(String(a).replace("S", ""), 10);
      const numB = parseInt(String(b).replace("S", ""), 10);
      if (Number.isNaN(numA) || Number.isNaN(numB)) return String(a).localeCompare(String(b));
      return numA - numB;
    });
  }, [modules]);

  const filteredFormModules = useMemo(() => {
    if (!formData.semester) return [];
    return modules.filter((mod) => mod.semester === formData.semester);
  }, [modules, formData.semester]);

  const handleCreate = async () => {
    if (!formData.semester || !formData.moduleId || !formData.category) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }

    try {
      if (imageFile) {
        // Use FormData for file upload
        const data = new FormData();
        data.append("name", formData.category);
        data.append("moduleId", formData.moduleId);
        data.append("categoryImage", imageFile);

        await api.post("/course-categories/create-with-image", data, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      } else {
        await api.post("/course-categories", {
          name: formData.category,
          moduleId: formData.moduleId,
          imageUrl: formData.imageUrl || "",
        });
      }
      toast.success("Catégorie créée avec succès");
      setShowCreateForm(false);
      setFormData({ name: "", semester: "", moduleId: "", category: "", imageUrl: "" });
      setImageFile(null);
      setImagePreview(null);
      fetchCategories();
    } catch (err) {
      console.error("Error creating category:", err);
      toast.error(err.response?.data?.message || "Erreur lors de la création");
    }
  };

  const handleEdit = (category) => {
    const selectedModule = modules.find((mod) => mod._id === category.moduleId);
    setFormData({
      name: category.categoryName,
      semester: selectedModule?.semester || category.moduleSemester || "",
      moduleId: category.moduleId,
      category: category.categoryName || "",
      imageUrl: category.rawImageUrl || "",
    });
    // Set image preview for existing image
    if (category.imageUrl && category.imageUrl !== placeholderImage) {
      setImagePreview(category.imageUrl);
    } else {
      setImagePreview(null);
    }
    setImageFile(null);
    setEditingCategory(category);
    setShowCreateForm(true);
  };

  const handleUpdate = async () => {
    if (!formData.semester || !formData.moduleId || !formData.category) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }

    try {
      const data = new FormData();
      data.append("name", formData.category);
      data.append("moduleId", formData.moduleId);
      
      if (imageFile) {
        data.append("categoryImage", imageFile);
      } else if (editingCategory.rawImageUrl) {
        // Preserve existing image path
        data.append("existingImageUrl", editingCategory.rawImageUrl);
      }

      await api.put(`/course-categories/update-with-image/${editingCategory.id}`, data, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success("Catégorie mise à jour avec succès");
      setShowCreateForm(false);
      setEditingCategory(null);
      setFormData({ name: "", semester: "", moduleId: "", category: "", imageUrl: "" });
      setImageFile(null);
      setImagePreview(null);
      fetchCategories();
    } catch (err) {
      console.error("Error updating category:", err);
      toast.error(err.response?.data?.message || "Erreur lors de la mise à jour");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette catégorie ?")) return;

    try {
      await api.delete(`/course-categories/${id}`);
      toast.success("Catégorie supprimée avec succès");
      fetchCategories();
    } catch (err) {
      console.error("Error deleting category:", err);
      toast.error(err.response?.data?.message || "Erreur lors de la suppression");
    }
  };

  const toggleSelectCategory = (categoryId) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedCategories.length === currentRows.length && currentRows.length > 0) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(currentRows.map((cat) => cat.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCategories.length === 0) return;
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedCategories.length} catégorie(s) ?`)) return;

    try {
      setIsBulkDeleting(true);
      const results = await Promise.allSettled(
        selectedCategories.map((id) => api.delete(`/course-categories/${id}`))
      );
      
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = results.filter(r => r.status === 'rejected').length;
      
      if (successCount > 0) {
        toast.success(`${successCount} catégorie(s) supprimée(s) avec succès`);
      }
      if (failCount > 0) {
        toast.warning(`${failCount} catégorie(s) non trouvée(s) ou déjà supprimée(s)`);
      }
      
      setSelectedCategories([]);
      fetchCategories();
    } catch (err) {
      console.error("Error deleting categories:", err);
      toast.error("Erreur lors de la suppression");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return categoriesForCourses.filter((item) => {
      const passesModule =
        moduleFilter === "all" || String(item.moduleId) === moduleFilter;
      
      // Get semester from module or from item directly
      const itemSemester = item.moduleSemester || '';
      const passesSemester =
        semesterFilter === "all" || itemSemester === semesterFilter;
      
      const passesSearch =
        item.moduleName.toLowerCase().includes(term) ||
        item.categoryName.toLowerCase().includes(term) ||
        String(item.id).includes(term);
      return passesModule && passesSemester && passesSearch;
    });
  }, [searchTerm, moduleFilter, semesterFilter, categoriesForCourses]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRows = filtered.slice(startIndex, endIndex);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, moduleFilter, semesterFilter]);

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const buttons = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);

    buttons.push(
      <Button
        key="prev"
        variant="outline"
        size="sm"
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center gap-1"
      >
        <ChevronLeft className="w-4 h-4" />
        Previous
      </Button>
    );

    for (let i = start; i <= end; i++) {
      buttons.push(
        <Button
          key={i}
          variant={i === currentPage ? "default" : "outline"}
          size="sm"
          onClick={() => goToPage(i)}
          className="min-w-[40px]"
        >
          {i}
        </Button>
      );
    }

    buttons.push(
      <Button
        key="next"
        variant="outline"
        size="sm"
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex items-center gap-1"
      >
        Next
        <ChevronRight className="w-4 h-4" />
      </Button>
    );

    return <div className="flex items-center gap-2">{buttons}</div>;
  };

  return (
    <div className="min-h-screen bg-card">
      {/* Gradient Header */}

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-blue-800 mb-2">📋 Information</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>Catégories de Modules</strong> : Gère les modules (Anatomie, Physiologie, etc.) → Page /admin/categoriesOfModules</li>
            <li>• <strong>Catégories de Cours</strong> (cette page) : Gère les sous-catégories dans "Exam par cours" → Apparaît côté utilisateur dans la section "Exam par cours"</li>
          </ul>
        </div>

        {/* Action Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        >
          <div>
            <h2 className="text-2xl font-bold text-black mb-1">Catégories de Cours (Exam par cours)</h2>
            <p className="text-muted-foreground">Total: <span className="font-semibold text-black">{filtered.length}</span> catégories • Ces catégories apparaissent dans "Exam par cours" côté utilisateur</p>
          </div>
          <Button
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus className="w-5 h-5 mr-2" />
            Créer une catégorie
          </Button>
        </motion.div>

        {/* Filter Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="bg-card border-border shadow-md">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-black" />
                <div>
                  <CardTitle className="text-black">Search & Filter</CardTitle>
                  <CardDescription className="text-muted-foreground">Find categories by name, module, or ID</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search by ID, module or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-background border-gray-300 text-black placeholder:text-muted-foreground focus:border-black focus:ring-black"
                  />
                </div>
                <Select value={semesterFilter} onValueChange={setSemesterFilter}>
                  <SelectTrigger className="bg-background border-gray-300 text-black">
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all" className="text-black">All Semesters</SelectItem>
                    {["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10", "EXT"].map((sem) => (
                      <SelectItem key={sem} value={sem} className="text-black">
                        {sem}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={moduleFilter} onValueChange={setModuleFilter}>
                  <SelectTrigger className="bg-background border-gray-300 text-black">
                    <SelectValue placeholder="Select module" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all" className="text-black">All Modules</SelectItem>
                    {modules.map((mod) => (
                      <SelectItem key={mod._id} value={mod._id} className="text-black">
                        {mod.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCategories.length > 0 && (
                <div className="mt-4 flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                  <Button 
                    onClick={handleBulkDelete}
                    disabled={isBulkDeleting}
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                  >
                    {isBulkDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Supprimer ({selectedCategories.length})
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {selectedCategories.length} élément(s) sélectionné(s)
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Data Table Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="bg-card border-border shadow-md overflow-hidden">
            <CardHeader className="pb-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-black text-xl">Liste des catégories</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {filtered.length === 0 ? "Aucune catégorie trouvée" : `Affichage de ${Math.min(currentRows.length, itemsPerPage)} sur ${filtered.length}`}
                  </CardDescription>
                </div>
                <Badge className="bg-gray-200 text-black border border-gray-300">
                  {filtered.length} Total
                </Badge>
              </div>
            </CardHeader>

            {currentRows.length > 0 ? (
              <>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-background">
                          <th className="text-left py-4 px-6 font-semibold text-black w-[50px]">
                            <Checkbox 
                              checked={selectedCategories.length === currentRows.length && currentRows.length > 0}
                              onCheckedChange={toggleSelectAll}
                            />
                          </th>
                          <th className="text-left py-4 px-6 font-semibold text-black">ID</th>
                          <th className="text-left py-4 px-6 font-semibold text-black">Module</th>
                          <th className="text-left py-4 px-6 font-semibold text-black">Catégorie</th>
                          <th className="text-left py-4 px-6 font-semibold text-black">Image</th>
                          <th className="text-left py-4 px-6 font-semibold text-black">Cours</th>
                          <th className="text-left py-4 px-6 font-semibold text-black">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <AnimatePresence>
                          {currentRows.map((row, idx) => (
                            <motion.tr
                              key={row.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.3, delay: idx * 0.05 }}
                              className="border-b border-gray-100 hover:bg-background transition-colors"
                            >
                              <td className="py-4 px-6">
                                <Checkbox 
                                  checked={selectedCategories.includes(row.id)}
                                  onCheckedChange={() => toggleSelectCategory(row.id)}
                                />
                              </td>
                              <td className="py-4 px-6">
                                <Badge className="bg-gray-200 text-black border border-gray-300">
                                  #{row.id.slice(-6)}
                                </Badge>
                              </td>
                              <td className="py-4 px-6 text-black font-medium">{row.moduleName}</td>
                              <td className="py-4 px-6">
                                <Badge className="bg-blue-100 text-blue-700 border border-blue-200">
                                  {row.categoryName}
                                </Badge>
                              </td>
                              <td className="py-4 px-6">
                                <motion.div
                                  whileHover={{ scale: 1.05 }}
                                  className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 border border-gray-300 cursor-pointer"
                                >
                                  <img
                                    src={row.imageUrl}
                                    alt={row.categoryName}
                                    className="w-full h-full object-cover"
                                  />
                                </motion.div>
                              </td>
                              <td className="py-4 px-6">
                                <Badge className="bg-gray-200 text-black border border-gray-300">
                                  {row.examCourseCount}
                                </Badge>
                              </td>
                              <td className="py-4 px-6">
                                <div className="flex gap-2 items-center">
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="p-2 text-blue-600 hover:text-blue-800 hover:bg-muted rounded-lg transition-colors"
                                    onClick={() => handleEdit(row)}
                                  >
                                    <Edit size={18} />
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="p-2 text-red-600 hover:text-red-800 hover:bg-muted rounded-lg transition-colors"
                                    onClick={() => handleDelete(row.id)}
                                  >
                                    <Trash2 size={18} />
                                  </motion.button>
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                </CardContent>

                {/* Pagination Footer */}
                <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-border bg-background p-6">
                  <div className="text-sm text-muted-foreground">
                    Showing <span className="font-semibold text-black">{startIndex + 1}</span> to{" "}
                    <span className="font-semibold text-black">{Math.min(endIndex, filtered.length)}</span> of{" "}
                    <span className="font-semibold text-black">{filtered.length}</span> results
                  </div>
                  {renderPagination()}
                </CardFooter>
              </>
            ) : (
              <CardContent className="py-12">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center"
                >
                  <Layers className="w-12 h-12 text-gray-400 mx-auto mb-4 opacity-50" />
                  <p className="text-foreground text-lg">No categories found</p>
                  <p className="text-muted-foreground text-sm">Try adjusting your search or filters</p>
                </motion.div>
              </CardContent>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Create Category Dialog */}
      <AnimatePresence>
        {showCreateForm && (
          <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
            <DialogContent className="bg-card border-border text-black sm:max-w-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <DialogHeader>
                  <DialogTitle className="text-black text-xl">
                    {editingCategory ? "Modifier la catégorie" : "Créer une catégorie de cours"}
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Cette catégorie apparaîtra dans la section "Exam par cours" côté utilisateur
                  </DialogDescription>
                </DialogHeader>

                <form className="space-y-4 py-4" onSubmit={(e) => { e.preventDefault(); editingCategory ? handleUpdate() : handleCreate(); }}>
                  <div className="space-y-2">
                    <Label className="text-black">Select Semester *</Label>
                    <p className="text-xs text-muted-foreground mb-1">
                      Choisissez d'abord le semestre
                    </p>
                    <Select
                      value={formData.semester}
                      onValueChange={(value) => {
                        handleFormChange("semester", value);
                        handleFormChange("moduleId", "");
                      }}
                    >
                      <SelectTrigger className="bg-background border-gray-300 text-black">
                        <SelectValue placeholder="Choose semester" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {semesterOptions.map((semester) => (
                          <SelectItem key={semester} value={semester} className="text-black">
                            {semester}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-black">Select Module *</Label>
                    <p className="text-xs text-muted-foreground mb-1">
                      Le module auquel cette catégorie de cours sera rattachée
                    </p>
                    <Select value={formData.moduleId} onValueChange={(value) => handleFormChange("moduleId", value)}>
                      <SelectTrigger className="bg-background border-gray-300 text-black" disabled={!formData.semester}>
                        <SelectValue placeholder={formData.semester ? "Choose module" : "Choose semester first"} />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {filteredFormModules.map((mod) => (
                          <SelectItem key={mod._id} value={mod._id} className="text-black">
                            {mod.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-black">Nom de la catégorie *</Label>
                    <p className="text-xs text-muted-foreground mb-1">
                      Cette catégorie apparaîtra dans "Exam par cours" côté utilisateur
                    </p>
                    <Input
                      value={formData.category}
                      onChange={(e) => handleFormChange("category", e.target.value)}
                      placeholder="Ex: Cardiologie, Neurologie, Anatomie..."
                      className="bg-background border-gray-300 text-black"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-black">Image</Label>
                    <div className="space-y-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setImageFile(file);
                            const reader = new FileReader();
                            reader.onloadend = () => setImagePreview(reader.result);
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-background text-black file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer hover:file:bg-blue-700"
                      />
                      {imagePreview && (
                        <div className="relative w-32 h-24 rounded-lg overflow-hidden border border-gray-300">
                          <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => { setImageFile(null); setImagePreview(null); }}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>


                  <DialogFooter className="gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-gray-300 text-black hover:bg-muted hover:text-black"
                      onClick={() => {
                        setShowCreateForm(false);
                        setEditingCategory(null);
                        setFormData({ name: "", semester: "", moduleId: "", category: "", imageUrl: "" });
                      }}
                    >
                      Cancel
                    </Button>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        type="submit"
                        className={editingCategory ? "bg-green-600 hover:bg-green-700 text-white" : "bg-black hover:bg-gray-900 text-white"}
                      >
                        {editingCategory ? "Mettre à jour" : "Create Category"}
                      </Button>
                    </motion.div>
                  </DialogFooter>
                </form>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CreateCategoriesForCourses;
