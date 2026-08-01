import { useMemo, useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { BookOpen, Search, Filter, Plus, Edit, Trash2, ChevronLeft, ChevronRight, Loader2, Image, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared";
import { toast } from "sonner";
import NewModuleForm from "@/components/admin/NewModuleForm";
import EditModuleForm from "@/components/admin/EditModuleForm";
import { api } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

const Module = () => {
  const { t } = useTranslation(['admin', 'common']);
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewModuleForm, setShowNewModuleForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [semesterFilter, setSemesterFilter] = useState("all");

  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);
  
  // Multi-selection state
  const [selectedModules, setSelectedModules] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchModules();
  }, [showNewModuleForm, showEditForm]);

  const fetchModules = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get("/modules");

      const placeholderImage =
        "http://www.univ-mosta.dz/medecine/wp-content/uploads/sites/4/2021/12/telechargement-1-1.jpg";

      // Helper to get full image URL
      const getImageUrl = (imageUrl) => {
        if (!imageUrl) return placeholderImage;
        // If it's a relative path (local upload), prepend backend URL
        if (imageUrl.startsWith('/uploads')) {
          const backendUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5010';
          return `${backendUrl}${imageUrl}`;
        }
        // Otherwise return as-is (external URL)
        return imageUrl;
      };

      const list = (data?.data || []).map((m) => ({
        id: m?._id,
        semester: m?.semester || "",
        name: m?.name || "",
        imageUrl: getImageUrl(m?.imageUrl),
        rawImageUrl: m?.imageUrl || "",
        totalQuestions: m.totalQuestions,
        infoText: m?.infoText || "",
        helpText: m?.infoText || "",
        color: m?.color || "#6366f1",
        contentType: m?.contentType || "url",
        textContent: m?.textContent || "",
        helpContent: m?.helpContent || "",
        helpImage: m?.helpImage || "",
        helpPdf: m?.helpPdf || "",
        difficulty: m?.difficulty || "QE",
        availableInAllSemesters: m?.availableInAllSemesters || false
      }));
      setModules(list);
    } catch (e) {
      console.error("Error fetching modules:", e);
      setError(t('admin:failed_load_modules'));
      toast.error(t('common:error_loading'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditModule = (module) => {
    setSelectedModule(module);
    setShowEditForm(true);
  };

  const handleModuleUpdated = () => {
    setShowEditForm(false);
    setSelectedModule(null);
  };

  const handleDeleteModule = async (id) => {
    if (!confirm(t('admin:confirm_delete_module'))) return;

    try {
      await api.delete(`/modules/${id}`);
      toast.success(t('admin:module_deleted'));
      fetchModules();
    } catch (error) {
      console.error("Error deleting module:", error);
      toast.error(t('admin:failed_delete'));
    }
  };

  // Multi-selection handlers
  const toggleSelectModule = (moduleId) => {
    setSelectedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedModules.length === currentModules.length) {
      setSelectedModules([]);
    } else {
      setSelectedModules(currentModules.map(m => m.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedModules.length === 0) {
      toast.warning('Veuillez sélectionner au moins un module');
      return;
    }

    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedModules.length} module(s) ?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const results = await Promise.allSettled(
        selectedModules.map(id => api.delete(`/modules/${id}`))
      );
      
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = results.filter(r => r.status === 'rejected').length;
      
      if (successCount > 0) {
        toast.success(`${successCount} module(s) supprimé(s) avec succès`);
      }
      if (failCount > 0) {
        toast.warning(`${failCount} module(s) non trouvé(s) ou déjà supprimé(s)`);
      }
      
      setSelectedModules([]);
      fetchModules();
    } catch (error) {
      console.error("Error bulk deleting modules:", error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredModules = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return modules.filter((m) => {
      // Modules available in all semesters pass semester filter
      const passesSemester =
        semesterFilter === "all" || 
        m.availableInAllSemesters || 
        m.semester === semesterFilter;
      const passesSearch =
        m.name.toLowerCase().includes(term) ||
        (m.semester && m.semester.toLowerCase().includes(term)) ||
        String(m.id).includes(term);
      return passesSemester && passesSearch;
    });
  }, [searchTerm, semesterFilter, modules]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, semesterFilter]);

  const totalPages = Math.ceil(filteredModules.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentModules = filteredModules.slice(startIndex, endIndex);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
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
            <h2 className="text-2xl font-bold text-foreground">{t('admin:modules')}</h2>
            <p className="text-muted-foreground">{t('admin:manage_modules_by_semester')}</p>
          </div>

          <div className="flex items-center gap-2">
            {selectedModules.length > 0 && (
              <Button 
                onClick={handleBulkDelete}
                disabled={isDeleting}
                variant="destructive"
                className="gap-2"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Supprimer ({selectedModules.length})
              </Button>
            )}
            <Button onClick={() => setShowNewModuleForm(true)} className="bg-blue-600 hover:bg-blue-700 gap-2">
              <Plus className="h-4 w-4" />
              {t('admin:add_module')}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {t('admin:module_directory')}
            </CardTitle>
            <CardDescription>{t('admin:search_manage_modules')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder={t('admin:search_by_name_semester_id')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={semesterFilter} onValueChange={setSemesterFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('admin:all_semesters')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('admin:all_semesters')}</SelectItem>
                  {Array.from({ length: 10 }, (_, i) => `S${i + 1}`)
                    .reverse()
                    .map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="text-sm text-red-600 p-3 bg-red-50 rounded-md">
                {error}
              </div>
            )}

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox 
                        checked={selectedModules.length === currentModules.length && currentModules.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>{t('admin:semester')}</TableHead>
                    <TableHead>{t('admin:module')}</TableHead>
                    <TableHead>{t('admin:image')}</TableHead>
                    <TableHead className="w-[100px]">color</TableHead>
                    <TableHead>Difficulté</TableHead>
                    <TableHead>{t('admin:questions')}</TableHead>
                    <TableHead>Texte d'aide</TableHead>
                    <TableHead className="text-right">{t('common:actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentModules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                        {t('admin:no_modules_found')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentModules.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedModules.includes(m.id)}
                            onCheckedChange={() => toggleSelectModule(m.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{m.id.slice(-6)}</TableCell>
                        <TableCell>
                          {m.availableInAllSemesters ? (
                            <Badge className="bg-purple-100 text-purple-700 border-purple-200">📚 Tous les semestres</Badge>
                          ) : (
                            <Badge variant="secondary">{m.semester}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell>
                          <div className="w-12 h-12 rounded-md overflow-hidden bg-muted border relative group">
                            <img
                              src={m.imageUrl}
                              alt={m.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div
                            className="w-6 h-6 rounded-full border border-border shadow-sm"
                            style={{ backgroundColor: m.color }}
                            title={m.color}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            m.difficulty === "easy" ? "bg-green-100 text-green-700" :
                              m.difficulty === "hard" ? "bg-red-100 text-red-700" :
                                m.difficulty === "QE" ? "bg-orange-100 text-orange-700" :
                                  "bg-amber-100 text-amber-700"
                          }>
                            {m.difficulty === "easy" ? "Facile" :
                              m.difficulty === "hard" ? "Difficile" :
                                m.difficulty === "QE" ? "QE" : "Moyen"}
                          </Badge>
                        </TableCell>
                        <TableCell className="pl-6">{m.totalQuestions}</TableCell>
                        <TableCell>
                          {m.contentType === 'text' && m.textContent ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1.5 font-normal">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                              Text
                            </Badge>
                          ) : m.helpText ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1.5 font-normal">
                              <Image className="w-3 h-3" />
                              1 Image
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditModule(m)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteModule(m.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
              {t('admin:showing_results', {
                start: filteredModules.length === 0 ? 0 : startIndex + 1,
                end: Math.min(endIndex, filteredModules.length),
                total: filteredModules.length
              })}
            </div>
            {renderPagination()}
          </CardFooter>
        </Card>
      </div>

      {showNewModuleForm && (
        <NewModuleForm setShowNewModuleForm={setShowNewModuleForm} />
      )}

      {showEditForm && selectedModule && (
        <EditModuleForm
          module={selectedModule}
          setShowEditForm={setShowEditForm}
          onModuleUpdated={handleModuleUpdated}
        />
      )}
    </div>
  );
};

export default Module;
