import { useEffect, useState, useRef, useMemo } from "react";
import { useTranslation } from 'react-i18next';
import { FileQuestion, Loader2, ChevronLeft, ChevronRight, CheckCircle2, Trash, MoreVertical, Eye, Edit, ImageIcon, AlertCircle, BookOpen, Plus, Upload, X, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatCard } from "@/components/shared";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { api } from "@/lib/utils";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const Explications = () => {
  const { t } = useTranslation(['admin', 'common']);
  const API_URL = import.meta.env.VITE_API_URL;
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [explanations, setExplanations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedItems, setSelectedItems] = useState(new Set());

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [examTypeFilter, setExamTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [explanationTypeFilter, setExplanationTypeFilter] = useState("all");

  // Popup state for question viewing
  const [questionPopup, setQuestionPopup] = useState({ open: false, text: '' });

  // Action dialog states
  const [selectedExplanation, setSelectedExplanation] = useState(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Add/Edit form states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [modules, setModules] = useState([]);
  const [exams, setExams] = useState([]);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    moduleId: "",
    examId: "",
    questionNumbers: "",
    title: "",
    contentText: "",
  });
  const [editFormData, setEditFormData] = useState({
    title: "",
    contentText: "",
    status: "pending",
  });
  const [imageFiles, setImageFiles] = useState([]);
  const [pdfFile, setPdfFile] = useState(null);
  const [imagePreviews, setImagePreviews] = useState([]);
  const imageInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  const openQuestionPopup = (questionText) => {
    setQuestionPopup({ open: true, text: questionText });
  };

  // Fetch modules
  const fetchModules = async () => {
    try {
      const { data } = await api.get("/modules");
      setModules(data?.data || []);
    } catch (e) {
      console.error("Error fetching modules:", e);
    }
  };

  // Fetch exams for a module
  const fetchExamsForModule = async (moduleId) => {
    if (!moduleId) {
      setExams([]);
      return;
    }
    try {
      const [examsRes, qcmRes, coursesRes] = await Promise.all([
        api.get("/exams/all"),
        api.get("/qcm-banque/all"),
        api.get(`/exam-courses?moduleId=${moduleId}`)
      ]);
      
      const moduleExams = (examsRes.data?.data || []).filter(e => 
        (e.moduleId?._id || e.moduleId) === moduleId
      );
      const moduleQcm = (qcmRes.data?.data || []).filter(q => 
        (q.moduleId?._id || q.moduleId) === moduleId
      );
      const moduleCourses = coursesRes.data?.data || [];
      
      const allExams = [
        ...moduleExams.map(e => ({ ...e, type: 'exam', label: `${e.name} (${e.year || 'N/A'})` })),
        ...moduleQcm.map(q => ({ ...q, type: 'qcm', label: `QCM: ${q.name}` })),
        ...moduleCourses.map(c => ({ ...c, type: 'course', label: `Cours: ${c.name}` }))
      ];
      
      setExams(allExams);
    } catch (e) {
      console.error("Error fetching exams:", e);
      setExams([]);
    }
  };

  // Fetch explanations
  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await api.get("/explanations");
      const list = Array.isArray(data?.data) ? data.data : [];
      const mapped = list.map((item) => ({
        id: item?._id,
        username: item?.userId?.email || "—",
        name: item?.userId?.name || "—",
        question: item?.questionId?.text || "—",
        questionNumber: item?.questionNumber || null,
        explicationTitle: item?.title || "—",
        date: item?.createdAt
          ? new Date(item.createdAt).toISOString().slice(0, 10)
          : "—",
        // Support both legacy imageUrl and new imageUrls array
        images: item?.imageUrls?.length > 0
          ? item.imageUrls
          : (item?.imageUrl ? [item.imageUrl] : []),
        pdfUrl: item?.pdfUrl || null,
        text: item?.contentText || "",
        status: item?.status || "pending",
        // New module and exam fields
        moduleName: item?.moduleName || "—",
        moduleCategory: item?.moduleCategory || "—",
        examName: item?.examName || "—",
        examYear: item?.examYear || "—",
        courseCategory: item?.courseCategory || "—",
        courseName: item?.courseName || "—",
        numberOfQuestions: item?.numberOfQuestions || "—",
        isAiGenerated: item?.isAiGenerated || false,
        explanationType: item?.isAiGenerated ? 'ai' : 'human',
      }));
      setExplanations(mapped);
    } catch (e) {
      setError(t('admin:failed_load_explanations'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchModules();
  }, []);

  // Handle image file selection
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length + imageFiles.length > 5) {
      toast.error("Maximum 5 images autorisées");
      return;
    }
    
    const validFiles = files.filter(f => f.type.startsWith("image/"));
    setImageFiles(prev => [...prev, ...validFiles]);
    
    // Create previews
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove image
  const removeImage = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Handle PDF file selection
  const handlePdfSelect = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
    } else {
      toast.error("Veuillez sélectionner un fichier PDF valide");
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      moduleId: "",
      examId: "",
      questionNumbers: "",
      title: "",
      contentText: "",
    });
    setImageFiles([]);
    setPdfFile(null);
    setImagePreviews([]);
    setExams([]);
  };

  // Handle add form submit
  const handleAddSubmit = async () => {
    if (!formData.moduleId || !formData.examId || !formData.questionNumbers) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    try {
      setFormLoading(true);
      const submitData = new FormData();
      submitData.append("moduleId", formData.moduleId);
      submitData.append("examId", formData.examId);
      submitData.append("questionNumbers", formData.questionNumbers);
      submitData.append("title", formData.title || "Explication admin");
      submitData.append("contentText", formData.contentText || "");

      // Add images
      imageFiles.forEach(file => {
        submitData.append("images", file);
      });

      // Add PDF
      if (pdfFile) {
        submitData.append("pdf", pdfFile);
      }

      // Note: Don't set Content-Type for FormData - axios will set it automatically with boundary
      const response = await api.post("/explanations/admin-create", submitData);

      toast.success(response.data?.message || "Explication(s) créée(s) avec succès");
      setShowAddDialog(false);
      resetForm();
      fetchData();
    } catch (e) {
      console.error("Error creating explanation:", e);
      toast.error(e.response?.data?.message || "Erreur lors de la création");
    } finally {
      setFormLoading(false);
    }
  };

  // Handle edit form submit
  const handleEditSubmit = async () => {
    if (!selectedExplanation) return;

    try {
      setFormLoading(true);
      await api.put(`/explanations/${selectedExplanation.id}`, {
        title: editFormData.title,
        contentText: editFormData.contentText,
        status: editFormData.status,
      });

      toast.success("Explication mise à jour avec succès");
      setShowEditDialog(false);
      setSelectedExplanation(null);
      fetchData();
    } catch (e) {
      console.error("Error updating explanation:", e);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setFormLoading(false);
    }
  };

  // Open edit dialog
  const handleEditClick = (explanation) => {
    setSelectedExplanation(explanation);
    setEditFormData({
      title: explanation.explicationTitle || "",
      contentText: explanation.text || "",
      status: explanation.status || "pending",
    });
    setShowEditDialog(true);
  };

  // Handler functions
  const handleViewDetails = (explanation) => {
    setSelectedExplanation(explanation);
    setShowViewDialog(true);
  };

  const handleApprove = async (explanation) => {
    setActionLoading(true);
    try {
      await api.patch(`/explanations/${explanation.id}/status`, { status: 'approved' });
      toast.success("Explication approuvée avec succès");
      fetchData(); // Refresh list
    } catch (error) {
      toast.error("Erreur lors de l'approbation");
      console.error("Approve error:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteClick = (explanation) => {
    setSelectedExplanation(explanation);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedExplanation) return;
    setActionLoading(true);
    try {
      await api.delete(`/explanations/${selectedExplanation.id}`);
      toast.success("Explication supprimée avec succès");
      setShowDeleteDialog(false);
      setSelectedExplanation(null);
      fetchData(); // Refresh list
    } catch (error) {
      toast.error("Erreur lors de la suppression");
      console.error("Delete error:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(new Set(currentReports.map(r => r.id)));
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
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedItems.size} explication(s) ?`)) return;

    setActionLoading(true);
    try {
      await Promise.all(
        Array.from(selectedItems).map(id => api.delete(`/explanations/${id}`))
      );
      toast.success(`${selectedItems.size} explication(s) supprimée(s) avec succès`);
      setSelectedItems(new Set());
      fetchData();
    } catch (error) {
      console.error("Error bulk deleting explanations:", error);
      toast.error("Erreur lors de la suppression groupée");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const renderPaginationButtons = () => {
    const buttons = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Previous button
    buttons.push(
      <Button
        key="prev"
        variant="outline"
        size="sm"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center gap-1"
      >
        <span className="sr-only">Previous</span>
        &#8592;
      </Button>
    );

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <Button
          key={i}
          variant={currentPage === i ? "default" : "outline"}
          size="sm"
          onClick={() => handlePageChange(i)}
          className="min-w-[40px]"
        >
          {i}
        </Button>
      );
    }

    // Next button
    buttons.push(
      <Button
        key="next"
        variant="outline"
        size="sm"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex items-center gap-1"
      >
        <span className="sr-only">Next</span>
        &#8594;
      </Button>
    );

    return buttons;
  };

  // Get unique modules for filter
  const uniqueModules = useMemo(() => {
    const modules = explanations.map(e => e.moduleName).filter(m => m && m !== "—");
    return [...new Set(modules)].sort();
  }, [explanations]);

  // Get unique exam types for filter
  const uniqueExamTypes = useMemo(() => {
    const types = explanations.map(e => e.moduleCategory).filter(t => t && t !== "—");
    return [...new Set(types)];
  }, [explanations]);

  // Get unique users for filter
  const uniqueUsers = useMemo(() => {
    const users = explanations.map(e => ({ name: e.name, email: e.username })).filter(u => u.name && u.name !== "—");
    const uniqueMap = new Map();
    users.forEach(u => uniqueMap.set(u.email, u));
    return Array.from(uniqueMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [explanations]);

  // Filter explanations based on search and filters
  const filteredExplanations = useMemo(() => {
    return explanations.filter(exp => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          exp.name?.toLowerCase().includes(query) ||
          exp.username?.toLowerCase().includes(query) ||
          exp.moduleName?.toLowerCase().includes(query) ||
          exp.examName?.toLowerCase().includes(query) ||
          exp.explicationTitle?.toLowerCase().includes(query) ||
          exp.question?.toLowerCase().includes(query) ||
          (exp.questionNumber && exp.questionNumber.toString().includes(query));
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== "all" && exp.status !== statusFilter) {
        return false;
      }

      // Module filter
      if (moduleFilter !== "all" && exp.moduleName !== moduleFilter) {
        return false;
      }

      // Exam type filter
      if (examTypeFilter !== "all" && exp.moduleCategory !== examTypeFilter) {
        return false;
      }

      // User filter
      if (userFilter !== "all" && exp.username !== userFilter) {
        return false;
      }

      // Explanation type filter
      if (explanationTypeFilter !== "all" && exp.explanationType !== explanationTypeFilter) {
        return false;
      }

      // Date range filter
      if (dateFrom && exp.date < dateFrom) {
        return false;
      }
      if (dateTo && exp.date > dateTo) {
        return false;
      }

      return true;
    }).sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
  }, [explanations, searchQuery, statusFilter, moduleFilter, examTypeFilter, userFilter, explanationTypeFilter, dateFrom, dateTo]);

  // Calculate pagination using filtered data
  const totalPages = Math.max(1, Math.ceil(filteredExplanations.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentReports = filteredExplanations.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, moduleFilter, examTypeFilter, userFilter, dateFrom, dateTo]);

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setModuleFilter("all");
    setExamTypeFilter("all");
    setUserFilter("all");
    setExplanationTypeFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Explications Management</h1>
          <p className="text-muted-foreground">Manage user-submitted explanation questions and verify content</p>
        </div>
        <Button 
          className="gap-2" 
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="h-4 w-4" />
          Ajouter une Explication
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0 }}
        >
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Explanations</p>
                  <p className="text-3xl font-bold text-blue-900 mt-2">{explanations.length}</p>
                </div>
                <div className="p-3 bg-blue-200 rounded-lg">
                  <FileQuestion className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Approved</p>
                  <p className="text-3xl font-bold text-green-900 mt-2">
                    {explanations.filter(e => e.status === 'approved').length}
                  </p>
                </div>
                <div className="p-3 bg-green-200 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-600">Pending Review</p>
                  <p className="text-3xl font-bold text-amber-900 mt-2">
                    {explanations.filter(e => e.status === 'pending').length}
                  </p>
                </div>
                <div className="p-3 bg-amber-200 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

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
            disabled={actionLoading}
            className="gap-2"
          >
            <Trash className="h-4 w-4" />
            Supprimer la sélection
          </Button>
        </motion.div>
      )}

      {/* Main Table Card */}
      <Card className="shadow-lg border-border">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-border">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle>All Explanations</CardTitle>
              <CardDescription>View and manage all user-submitted explanations</CardDescription>
            </div>
            
            {/* Filters Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('filters-section').classList.toggle('hidden')}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtres
            </Button>
          </div>
          
          {/* Expanded Filters Section */}
          <div id="filters-section" className="pt-4 border-t border-border space-y-4">
            {/* Row 1: Search and Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search Input */}
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Rechercher par nom, email, module, question..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full"
                />
              </div>
              
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="approved">Approuvé</SelectItem>
                  <SelectItem value="rejected">Rejeté</SelectItem>
                </SelectContent>
              </Select>

              {/* Exam Type Filter */}
              <Select value={examTypeFilter} onValueChange={setExamTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Type d'examen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="Exam par years">Exam par years</SelectItem>
                  <SelectItem value="Exam par courses">Exam par courses</SelectItem>
                  <SelectItem value="QCM banque">QCM banque</SelectItem>
                </SelectContent>
              </Select>

              {/* Explanation Type Filter */}
              <Select value={explanationTypeFilter} onValueChange={setExplanationTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Type d'explication" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="human">Explication Humaine</SelectItem>
                  <SelectItem value="ai">Explication IA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Row 2: Module, User, Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Module Filter */}
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les modules</SelectItem>
                  {uniqueModules.map(mod => (
                    <SelectItem key={mod} value={mod}>{mod}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* User Filter */}
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Utilisateur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les utilisateurs</SelectItem>
                  {uniqueUsers.map(user => (
                    <SelectItem key={user.email} value={user.email}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date From */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Date début</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Date To */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Date fin</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            {/* Active Filters & Reset */}
            <div className="flex flex-wrap items-center gap-2">
              {(searchQuery || statusFilter !== "all" || moduleFilter !== "all" || examTypeFilter !== "all" || userFilter !== "all" || explanationTypeFilter !== "all" || dateFrom || dateTo) && (
                <>
                  <span className="text-sm text-muted-foreground">Filtres actifs:</span>
                  {searchQuery && (
                    <Badge variant="secondary" className="gap-1">
                      Recherche: {searchQuery}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchQuery("")} />
                    </Badge>
                  )}
                  {statusFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Statut: {statusFilter}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setStatusFilter("all")} />
                    </Badge>
                  )}
                  {moduleFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Module: {moduleFilter}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setModuleFilter("all")} />
                    </Badge>
                  )}
                  {examTypeFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Type: {examTypeFilter}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setExamTypeFilter("all")} />
                    </Badge>
                  )}
                  {explanationTypeFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Explication: {explanationTypeFilter === 'ai' ? 'IA' : 'Humaine'}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setExplanationTypeFilter("all")} />
                    </Badge>
                  )}
                  {userFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Utilisateur: {uniqueUsers.find(u => u.email === userFilter)?.name || userFilter}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setUserFilter("all")} />
                    </Badge>
                  )}
                  {dateFrom && (
                    <Badge variant="secondary" className="gap-1">
                      Depuis: {dateFrom}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setDateFrom("")} />
                    </Badge>
                  )}
                  {dateTo && (
                    <Badge variant="secondary" className="gap-1">
                      Jusqu'à: {dateTo}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setDateTo("")} />
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm" onClick={resetFilters} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                    Réinitialiser tout
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-3" />
                <p className="text-muted-foreground">Loading explanations...</p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">Error loading data</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && filteredExplanations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <FileQuestion className="h-12 w-12 text-slate-300 mb-3" />
              <p className="text-muted-foreground font-medium">
                {explanations.length === 0 ? "No explanations found" : "Aucun résultat pour cette recherche"}
              </p>
              {explanations.length > 0 && (
                <Button 
                  variant="link" 
                  onClick={resetFilters}
                  className="mt-2"
                >
                  Réinitialiser les filtres
                </Button>
              )}
            </div>
          )}

          {!loading && !error && filteredExplanations.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-background hover:bg-background border-border">
                      <TableHead className="w-12 font-semibold text-foreground">
                        <Checkbox
                          checked={currentReports.length > 0 && selectedItems.size === currentReports.length}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="font-semibold text-foreground">User</TableHead>
                      <TableHead className="font-semibold text-foreground">Module</TableHead>
                      <TableHead className="font-semibold text-foreground">Type d'Examen</TableHead>
                      <TableHead className="font-semibold text-foreground">Examen / Cours</TableHead>
                      <TableHead className="font-semibold text-foreground">N° Question</TableHead>
                      <TableHead className="font-semibold text-foreground">Question</TableHead>
                      <TableHead className="font-semibold text-foreground">Contenu</TableHead>
                      <TableHead className="font-semibold text-foreground">Media</TableHead>
                      <TableHead className="font-semibold text-foreground">Status</TableHead>
                      <TableHead className="font-semibold text-foreground">Date</TableHead>
                      <TableHead className="text-right font-semibold text-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentReports.map((report, idx) => (
                      <motion.tr
                        key={report.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: idx * 0.05 }}
                        className="border-b border-border hover:bg-background/50 transition-colors"
                      >
                        <TableCell className="w-12">
                          <Checkbox
                            checked={selectedItems.has(report.id)}
                            onCheckedChange={(checked) => handleSelectItem(report.id, checked)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex flex-col">
                            <p className="font-medium text-foreground">{report.name}</p>
                            <p className="text-xs text-muted-foreground">{report.username}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-foreground">{report.moduleName}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            report.moduleCategory === "Exam par years" ? "default" :
                              report.moduleCategory === "Exam par courses" ? "secondary" :
                                report.moduleCategory === "QCM banque" ? "outline" :
                                  "secondary"
                          } className="whitespace-nowrap">
                            {report.moduleCategory}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {report.moduleCategory === "Exam par years" && (
                            <div className="text-sm">
                              <span className="font-medium">{report.examName}</span>
                              {report.examYear && report.examYear !== "—" && (
                                <span className="text-muted-foreground ml-1">({report.examYear})</span>
                              )}
                            </div>
                          )}
                          {report.moduleCategory === "Exam par courses" && (
                            <div className="text-sm">
                              {report.courseCategory && report.courseCategory !== "—" && (
                                <span className="text-muted-foreground">{report.courseCategory} → </span>
                              )}
                              <span className="font-medium">{report.courseName || report.examName}</span>
                            </div>
                          )}
                          {report.moduleCategory === "QCM banque" && (
                            <div className="text-sm">
                              <span className="font-medium">{report.examName}</span>
                            </div>
                          )}
                          {report.moduleCategory === "—" && (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {report.questionNumber ? (
                            <Badge className="bg-indigo-100 text-indigo-700 font-bold">
                              Q{report.questionNumber}
                            </Badge>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="cursor-pointer bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors"
                            onClick={() => openQuestionPopup(report.question)}
                          >
                            Voir la question
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {report.text ? (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-foreground truncate max-w-[200px]" title={report.explicationTitle}>
                                {report.explicationTitle !== "—" ? report.explicationTitle : "Explication"}
                              </p>
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]" title={report.text}>
                                {report.text.length > 50 ? report.text.substring(0, 50) + "..." : report.text}
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-sm">Pas de texte</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 flex-wrap">
                            {report.images?.length > 0 && (
                              <Badge 
                                className="bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer"
                                onClick={() => handleViewDetails(report)}
                              >
                                <ImageIcon className="h-3 w-3 mr-1" />
                                {report.images.length} img
                              </Badge>
                            )}
                            {report.pdfUrl && (
                              <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                                PDF
                              </Badge>
                            )}
                            {!report.images?.length && !report.pdfUrl && !report.text && (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "capitalize",
                            report.status === 'approved' && "bg-green-100 text-green-700",
                            report.status === 'pending' && "bg-yellow-100 text-yellow-700",
                            report.status === 'rejected' && "bg-red-100 text-red-700"
                          )}>
                            {report.status === 'approved' ? 'Approuvé' : 
                             report.status === 'pending' ? 'En attente' : 
                             report.status === 'rejected' ? 'Rejeté' : report.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{report.date}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="cursor-pointer gap-2"
                                onClick={() => handleViewDetails(report)}
                              >
                                <Eye className="h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer gap-2"
                                onClick={() => handleEditClick(report)}
                              >
                                <Edit className="h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="cursor-pointer gap-2 text-green-600 focus:text-green-700 focus:bg-green-50"
                                onClick={() => handleApprove(report)}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer gap-2 text-red-600 focus:text-red-700 focus:bg-red-50"
                                onClick={() => handleDeleteClick(report)}
                              >
                                <Trash className="h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Showing <span className="font-semibold">{startIndex + 1}</span> to{" "}
                    <span className="font-semibold">{Math.min(endIndex, filteredExplanations.length)}</span> of{" "}
                    <span className="font-semibold">{filteredExplanations.length}</span> results
                    {filteredExplanations.length !== explanations.length && (
                      <span className="text-slate-400 ml-1">
                        (filtered from {explanations.length})
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-2">
                    {renderPaginationButtons()}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Question Popup Dialog */}
      <Dialog open={questionPopup.open} onOpenChange={(open) => setQuestionPopup({ ...questionPopup, open })}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <BookOpen className="h-5 w-5 text-blue-600" />
              Question
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-6">
                <p className="text-base leading-relaxed text-foreground whitespace-pre-wrap break-words">
                  {questionPopup.text || '—'}
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setQuestionPopup({ open: false, text: '' })}
            >
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Détails de l'explication
            </DialogTitle>
          </DialogHeader>
          {selectedExplanation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Utilisateur</p>
                  <p className="font-medium">{selectedExplanation.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedExplanation.username}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Module</p>
                  <p className="font-medium">{selectedExplanation.moduleName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">N° Question</p>
                  <p className="font-medium">
                    {selectedExplanation.questionNumber ? (
                      <Badge className="bg-indigo-100 text-indigo-700 font-bold">
                        Q{selectedExplanation.questionNumber}
                      </Badge>
                    ) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{selectedExplanation.date}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Statut</p>
                  <Badge className={cn(
                    selectedExplanation.status === 'approved' ? 'bg-green-100 text-green-700' : 
                    selectedExplanation.status === 'rejected' ? 'bg-red-100 text-red-700' : 
                    'bg-yellow-100 text-yellow-700'
                  )}>
                    {selectedExplanation.status === 'approved' ? 'Approuvé' : 
                     selectedExplanation.status === 'pending' ? 'En attente' : 
                     selectedExplanation.status === 'rejected' ? 'Rejeté' : selectedExplanation.status}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Question</p>
                <Card className="mt-1 bg-blue-50 border-blue-200">
                  <CardContent className="p-3">
                    <p className="text-sm whitespace-pre-wrap">{selectedExplanation.question}</p>
                  </CardContent>
                </Card>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Titre</p>
                <p className="font-medium mt-1">{selectedExplanation.explicationTitle}</p>
              </div>
              {selectedExplanation.text ? (
                <div>
                  <p className="text-sm text-muted-foreground">Contenu de l'explication</p>
                  <Card className="mt-1 bg-green-50 border-green-200">
                    <CardContent className="p-3">
                      <p className="text-sm whitespace-pre-wrap">{selectedExplanation.text}</p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground">Contenu</p>
                  <p className="text-sm text-slate-400 mt-1 italic">Aucun texte fourni</p>
                </div>
              )}
              {/* Display Images */}
              {selectedExplanation.images?.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Images ({selectedExplanation.images.length})</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedExplanation.images.map((imgUrl, idx) => {
                      const fullImgUrl = imgUrl.startsWith('http') ? imgUrl : `${import.meta.env.VITE_API_URL?.replace('/api/v1', '') || ''}${imgUrl}`;
                      return (
                      <a
                        key={idx}
                        href={fullImgUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block aspect-video overflow-hidden rounded-lg border border-border hover:border-blue-400 transition-colors"
                      >
                        <img
                          src={fullImgUrl}
                          alt={`Image ${idx + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = '<div class="flex items-center justify-center h-full bg-muted text-gray-400 text-xs">Image non disponible</div>';
                          }}
                        />
                      </a>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Display PDF */}
              {selectedExplanation.pdfUrl && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Document PDF</p>
                  <a
                    href={selectedExplanation.pdfUrl.startsWith('http') ? selectedExplanation.pdfUrl : `${import.meta.env.VITE_API_URL?.replace('/api/v1', '') || ''}${selectedExplanation.pdfUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                    Voir le PDF
                  </a>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash className="h-5 w-5" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer cette explication de <strong>{selectedExplanation?.name}</strong> ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={actionLoading}>
              {actionLoading ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Explanation Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowAddDialog(open); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-green-600" />
              Ajouter une Explication
            </DialogTitle>
            <DialogDescription>
              Créer une explication pour une ou plusieurs questions d'un examen
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Module *</Label>
                <Select
                  value={formData.moduleId}
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, moduleId: value, examId: "" }));
                    fetchExamsForModule(value);
                  }}
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
                <Label>Examen / QCM *</Label>
                <Select
                  value={formData.examId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, examId: value }))}
                  disabled={!formData.moduleId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un examen" />
                  </SelectTrigger>
                  <SelectContent>
                    {exams.map(exam => (
                      <SelectItem key={exam._id} value={exam._id}>
                        {exam.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Numéros de Questions *</Label>
              <Input
                placeholder="Ex: 1-5, 7, 10-15"
                value={formData.questionNumbers}
                onChange={(e) => setFormData(prev => ({ ...prev, questionNumbers: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Utilisez des virgules et des tirets pour spécifier plusieurs questions (ex: 1-5, 7, 10)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Titre</Label>
              <Input
                placeholder="Titre de l'explication"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Contenu de l'explication</Label>
              <Textarea
                placeholder="Écrivez l'explication ici..."
                value={formData.contentText}
                onChange={(e) => setFormData(prev => ({ ...prev, contentText: e.target.value }))}
                rows={4}
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Images (max 5)</Label>
              <div className="space-y-3">
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {imagePreviews.map((preview, idx) => (
                      <div key={idx} className="relative">
                        <img src={preview} alt={`Preview ${idx + 1}`} className="w-full h-20 object-cover rounded border" />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={imageFiles.length >= 5}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Ajouter des images
                </Button>
              </div>
            </div>

            {/* PDF Upload */}
            <div className="space-y-2">
              <Label>Document PDF</Label>
              <div className="flex items-center gap-3">
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => pdfInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {pdfFile ? "Changer le PDF" : "Ajouter un PDF"}
                </Button>
                {pdfFile && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{pdfFile.name}</span>
                    <button
                      type="button"
                      onClick={() => setPdfFile(null)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setShowAddDialog(false); }}>
              Annuler
            </Button>
            <Button onClick={handleAddSubmit} disabled={formLoading}>
              {formLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                "Créer l'explication"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Explanation Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-600" />
              Modifier l'Explication
            </DialogTitle>
            <DialogDescription>
              Modifier le titre, le contenu et le statut de l'explication
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input
                placeholder="Titre de l'explication"
                value={editFormData.title}
                onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Contenu</Label>
              <Textarea
                placeholder="Contenu de l'explication..."
                value={editFormData.contentText}
                onChange={(e) => setEditFormData(prev => ({ ...prev, contentText: e.target.value }))}
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label>Statut</Label>
              <Select
                value={editFormData.status}
                onValueChange={(value) => setEditFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="approved">Approuvé</SelectItem>
                  <SelectItem value="rejected">Rejeté</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleEditSubmit} disabled={formLoading}>
              {formLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Mise à jour...
                </>
              ) : (
                "Enregistrer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Explications;
