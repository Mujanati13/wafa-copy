import { useMemo, useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Folders, Search, Filter, Plus, Edit, Trash2, ChevronLeft, ChevronRight, Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PageHeader, StatCard } from "@/components/shared";
import { toast } from "sonner";
import { api } from "@/lib/utils";
import NewCategoryForm from "@/components/admin/NewCategoryForm";
import { Checkbox } from "@/components/ui/checkbox";

// 3 default categories
const DEFAULT_CATEGORIES = [
  { value: "Exam par years", label: "Exam par years", color: "bg-blue-100 text-blue-700" },
  { value: "Exam par courses", label: "Exam par courses", color: "bg-purple-100 text-purple-700" },
  { value: "QCM banque", label: "QCM banque", color: "bg-green-100 text-green-700" },
];

const CategoriesOfModules = () => {
  const { t } = useTranslation(['admin', 'common']);
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterModule, setFilterModule] = useState("all");
  const [filterSemester, setFilterSemester] = useState("all"); // Semester filter for table
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", semester: "", category: "" });
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingModule, setDeletingModule] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Multi-selection state
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const itemsPerPage = 10;

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/modules");
      setModules(data?.data || []);
    } catch (e) {
      toast.error("Erreur lors du chargement des modules");
    } finally {
      setLoading(false);
    }
  };

  // Transform modules to show each module with all 3 default categories
  const modulesWithCategories = useMemo(() => {
    const result = [];
    modules.forEach((m) => {
      DEFAULT_CATEGORIES.forEach((cat) => {
        result.push({
          ...m,
          displayCategory: cat.value,
          categoryColor: cat.color,
          uniqueKey: `${m._id}-${cat.value}`
        });
      });
    });
    return result;
  }, [modules]);

  const filteredModules = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return modulesWithCategories.filter((m) => {
      const passesCategory = filterCategory === "all" || m.displayCategory === filterCategory;
      const passesModule = filterModule === "all" || m._id === filterModule;
      const passesSemester = filterSemester === "all" || m.semester === filterSemester;
      const passesSearch =
        m.name?.toLowerCase().includes(term) ||
        m.semester?.toLowerCase().includes(term);
      return passesCategory && passesModule && passesSemester && passesSearch;
    });
  }, [searchTerm, filterCategory, filterModule, filterSemester, modulesWithCategories]);

  const totalPages = Math.ceil(filteredModules.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentModules = filteredModules.slice(startIndex, endIndex);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterModule, filterSemester]);

  // Stats
  const categoryStats = DEFAULT_CATEGORIES.map(cat => ({
    ...cat,
    count: modules.filter(m => m.category === cat.value).length
  }));

  // Update module category
  const handleUpdateCategory = async (moduleId, newCategory) => {
    try {
      await api.put(`/modules/${moduleId}`, { category: newCategory });
      toast.success("Catégorie mise à jour avec succès");
      fetchModules();
    } catch (err) {
      console.error("Error updating category:", err);
      toast.error("Erreur lors de la mise à jour de la catégorie");
    }
  };

  // Open edit dialog
  const handleEdit = (module) => {
    setEditingModule(module);
    setEditForm({
      name: module.name || "",
      semester: module.semester || "",
      category: module.category || "Exam par years"
    });
    setEditDialogOpen(true);
  };

  // Save edit
  const handleSaveEdit = async () => {
    if (!editingModule) return;

    try {
      setSaving(true);
      await api.put(`/modules/${editingModule._id}`, editForm);
      toast.success("Module mis à jour avec succès");
      setEditDialogOpen(false);
      setEditingModule(null);
      fetchModules();
    } catch (err) {
      console.error("Error updating module:", err);
      toast.error("Erreur lors de la mise à jour du module");
    } finally {
      setSaving(false);
    }
  };

  // Open delete confirmation
  const handleDeleteClick = (module) => {
    setDeletingModule(module);
    setDeleteDialogOpen(true);
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!deletingModule) return;

    try {
      setDeleting(true);
      await api.delete(`/modules/${deletingModule._id}`);
      toast.success("Module supprimé avec succès");
      setDeleteDialogOpen(false);
      setDeletingModule(null);
      fetchModules();
    } catch (err) {
      console.error("Error deleting module:", err);
      toast.error("Erreur lors de la suppression du module");
    } finally {
      setDeleting(false);
    }
  };

  // Multi-selection handlers
  const toggleSelectCategory = (moduleId) => {
    setSelectedCategories(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedCategories.length === currentModules.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(currentModules.map(m => m._id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCategories.length === 0) {
      toast.warning('Veuillez sélectionner au moins une catégorie');
      return;
    }

    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedCategories.length} catégorie(s) ?`)) {
      return;
    }

    setIsBulkDeleting(true);
    try {
      const results = await Promise.allSettled(
        selectedCategories.map(id => api.delete(`/modules/${id}`))
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
      fetchModules();
    } catch (error) {
      console.error("Error bulk deleting categories:", error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsBulkDeleting(false);
    }
  };

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
        className="gap-1"
      >
        <ChevronLeft className="h-4 w-4" />
        {t('common:previous')}
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
        className="gap-1"
      >
        {t('common:next')}
        <ChevronRight className="h-4 w-4" />
      </Button>
    );

    return <div className="flex items-center gap-2">{buttons}</div>;
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Catégories de Modules</h2>
            <p className="text-muted-foreground">Gérez les catégories et cours de chaque module</p>
          </div>

          <Button onClick={() => setShowNewCategoryForm(true)} className="bg-blue-600 hover:bg-blue-700 gap-2">
            <Plus className="h-4 w-4" />
            Ajouter un Module
          </Button>
        </div>

        {/* Category Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {categoryStats.map((cat) => (
            <Card key={cat.value} className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{cat.label}</p>
                    <p className="text-2xl font-bold">{cat.count}</p>
                  </div>
                  <Badge className={cat.color}>{cat.label.split(' ')[0]}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Folders className="h-5 w-5" />
              Liste des Modules par Catégorie
            </CardTitle>
            <CardDescription>Modules organisés par les 3 catégories principales</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Rechercher par nom, semestre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterSemester} onValueChange={setFilterSemester}>
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
              <Select value={filterModule} onValueChange={setFilterModule}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les modules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les modules</SelectItem>
                  {modules.map((m) => (
                    <SelectItem key={m._id} value={m._id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les catégories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les catégories</SelectItem>
                  {DEFAULT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCategories.length > 0 && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
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

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox 
                        checked={selectedCategories.length === currentModules.length && currentModules.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Semestre</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead className="text-right">{t('common:actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentModules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        Aucun module trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentModules.map((m) => (
                      <TableRow key={m.uniqueKey}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedCategories.includes(m._id)}
                            onCheckedChange={() => toggleSelectCategory(m._id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                              style={{ backgroundColor: m.color || "#6366f1" }}
                            >
                              {m.name?.charAt(0) || "M"}
                            </div>
                            <span className="font-medium">{m.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {m.availableInAllSemesters ? (
                            <Badge className="bg-purple-100 text-purple-700 border-purple-200">📚 Tous</Badge>
                          ) : (
                            <Badge variant="outline">{m.semester}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={m.categoryColor || "bg-muted text-foreground"}>
                            {m.displayCategory}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => handleEdit(m)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteClick(m)}
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
              Affichage {filteredModules.length === 0 ? 0 : startIndex + 1} à {Math.min(endIndex, filteredModules.length)} sur {filteredModules.length} résultats
            </div>
            {renderPagination()}
          </CardFooter>
        </Card>
      </div>

      {showNewCategoryForm && (
        <NewCategoryForm
          setShowNewCategoryForm={setShowNewCategoryForm}
          onModuleCreated={fetchModules}
        />
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifier le Module</DialogTitle>
            <DialogDescription>
              Modifiez les informations du module
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nom du Module</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Nom du module"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-semester">Semestre</Label>
              <Select
                value={editForm.semester}
                onValueChange={(value) => setEditForm({ ...editForm, semester: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un semestre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="S1">S1</SelectItem>
                  <SelectItem value="S2">S2</SelectItem>
                  <SelectItem value="S3">S3</SelectItem>
                  <SelectItem value="S4">S4</SelectItem>
                  <SelectItem value="S5">S5</SelectItem>
                  <SelectItem value="S6">S6</SelectItem>
                  <SelectItem value="S7">S7</SelectItem>
                  <SelectItem value="S8">S8</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Catégorie</Label>
              <Select
                value={editForm.category}
                onValueChange={(value) => setEditForm({ ...editForm, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                "Enregistrer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le module</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le module "{deletingModule?.name}" ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                "Supprimer"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CategoriesOfModules;
