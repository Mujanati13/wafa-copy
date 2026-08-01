import { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { FileQuestion, Trash2, Check, AlertCircle, FilePenLine, Loader2, Eye, X, BookOpen, Calendar, Hash, Layers, ChevronDown, Search, Filter, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PageHeader, StatCard } from "@/components/shared";
import { toast } from "sonner";
import { api } from "@/lib/utils";
import { motion } from "framer-motion";

const ReportQuestionsAdmin = () => {
  const { t } = useTranslation(['admin', 'common']);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedItems, setSelectedItems] = useState(new Set());

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");

  // Dialog states
  const [selectedReport, setSelectedReport] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Popup states for Question and Details
  const [questionPopup, setQuestionPopup] = useState({ open: false, text: '' });
  const [detailsPopup, setDetailsPopup] = useState({ open: false, text: '' });
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const openQuestionPopup = (questionText) => {
    setQuestionPopup({ open: true, text: questionText });
  };

  const openDetailsPopup = (detailsText) => {
    setDetailsPopup({ open: true, text: detailsText || 'Aucun détail fourni' });
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/report-questions/all");
      console.log("Full response:", response);
      console.log("Response data:", response.data);

      const list = (response.data?.data || []).map((r) => ({
        id: r?._id,
        name: r?.username || r?.userId?.username || "—",
        username: r?.username || r?.userId?.username || "—",
        userEmail: r?.userEmail || r?.userId?.email || "—",
        question: r?.questionTitle || r?.questionId?.text || "—",
        text: r?.details || "",
        date: (r?.createdAt || r?.updatedAt || "").slice(0, 10),
        status: r?.status || "pending",
        // Question reference data
        moduleName: r?.moduleName || "—",
        moduleCategory: r?.moduleCategory || "—",
        examName: r?.examName || "—",
        examYear: r?.examYear || "—",
        sessionLabel: r?.questionSessionLabel || "—",
        questionId: r?.questionId?._id || r?.questionId,
        // Course specific fields
        courseCategory: r?.courseCategory || "—",
        courseName: r?.courseName || "—",
        // Number of questions
        questionNumber: r?.questionNumber || "—",
        numberOfQuestions: r?.numberOfQuestions || "—",
      }));
      console.log("Processed list:", list);
      setReports(list);
    } catch (e) {
      console.error("Error fetching reports:", e);
      console.error("Error response:", e.response);
      setError(t('admin:failed_load_reports'));
      toast.error(t('common:error_loading'));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.patch(`/report-questions/${id}/approve`);
      toast.success(t('admin:report_approved'));
      fetchReports();
    } catch (error) {
      console.error("Error approving report:", error);
      toast.error(t('admin:failed_approval'));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('admin:confirm_delete_report'))) return;

    try {
      await api.delete(`/report-questions/${id}`);
      toast.success(t('admin:report_deleted'));
      fetchReports();
    } catch (error) {
      console.error("Error deleting report:", error);
      toast.error(t('admin:failed_delete'));
    }
  };

  const handleReject = async (id) => {
    try {
      await api.patch(`/report-questions/${id}/reject`);
      toast.success("Rapport rejeté");
      fetchReports();
    } catch (error) {
      console.error("Error rejecting report:", error);
      toast.error("Échec du rejet");
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
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedItems.size} rapport(s) ?`)) return;

    try {
      await Promise.all(
        Array.from(selectedItems).map(id => api.delete(`/report-questions/${id}`))
      );
      toast.success(`${selectedItems.size} rapport(s) supprimé(s) avec succès`);
      setSelectedItems(new Set());
      fetchReports();
    } catch (error) {
      console.error("Error bulk deleting reports:", error);
      toast.error("Erreur lors de la suppression groupée");
    }
  };

  const handleViewDetails = (report) => {
    setSelectedReport(report);
    setDetailsOpen(true);
  };

  const handleEditQuestion = async (questionId) => {
    try {
      const response = await api.get(`/questions/all/${questionId}`);
      setEditingQuestion(response.data?.data || response.data);
      setShowEditDialog(true);
    } catch (err) {
      console.error("Error fetching question:", err);
      toast.error("Erreur lors du chargement de la question");
    }
  };

  // Get unique values for filters
  const uniqueModules = [...new Set(reports.map(r => r.moduleName).filter(m => m && m !== "—"))].sort();
  const uniqueUsers = [...new Set(reports.map(r => r.username).filter(u => u && u !== "—"))].sort();

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm("");
    setDateFrom("");
    setDateTo("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setModuleFilter("all");
    setUserFilter("all");
  };

  // Check if any filter is active
  const hasActiveFilters = searchTerm || dateFrom || dateTo || statusFilter !== "all" || categoryFilter !== "all" || moduleFilter !== "all" || userFilter !== "all";

  // Filter reports based on search, date, status, category, module, and user
  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.question?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.moduleName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.examName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.text?.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesDate = true;
    if (dateFrom) {
      matchesDate = matchesDate && report.date >= dateFrom;
    }
    if (dateTo) {
      matchesDate = matchesDate && report.date <= dateTo;
    }

    const matchesStatus = statusFilter === "all" || report.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || report.moduleCategory === categoryFilter;
    const matchesModule = moduleFilter === "all" || report.moduleName === moduleFilter;
    const matchesUser = userFilter === "all" || report.username === userFilter;

    return matchesSearch && matchesDate && matchesStatus && matchesCategory && matchesModule && matchesUser;
  }).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  // Pagination calculations
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentReports = filteredReports.slice(startIndex, endIndex);

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

    buttons.push(
      <Button
        key="prev"
        variant="outline"
        size="sm"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        &#8592;
      </Button>
    );

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

    buttons.push(
      <Button
        key="next"
        variant="outline"
        size="sm"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        &#8594;
      </Button>
    );

    return buttons;
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
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Gestion des Rapports"
          description="Gérer les questions signalées par les utilisateurs"
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            title="Total Rapports"
            value={reports.length}
            icon={<FileQuestion className="w-6 h-6" />}
            variant="blue"
          />
          <StatCard
            title="En Attente"
            value={reports.filter(r => r.status === "pending").length}
            icon={<AlertCircle className="w-6 h-6" />}
            variant="orange"
          />
          <StatCard
            title="Résolus"
            value={reports.filter(r => r.status === "resolved").length}
            icon={<Check className="w-6 h-6" />}
            variant="green"
          />
          <StatCard
            title="Rejetés"
            value={reports.filter(r => r.status === "rejected").length}
            icon={<X className="w-6 h-6" />}
            variant="red"
          />
        </div>

        {/* Filters */}
        <Card className="shadow-lg border-border">
          <CardContent className="p-4">
            <div className="space-y-4">
              {/* Row 1: Search */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Rechercher par utilisateur, question, module, examen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-full"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={fetchReports}
                  title="Rafraîchir"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              {/* Row 2: Main Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Status Filter */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Statut</Label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card text-sm"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="pending">En attente</option>
                    <option value="resolved">Résolus</option>
                    <option value="rejected">Rejetés</option>
                  </select>
                </div>

                {/* Category Filter */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Type d'Examen</Label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card text-sm"
                  >
                    <option value="all">Tous les types</option>
                    <option value="Exam par years">Exam par years</option>
                    <option value="Exam par courses">Exam par courses</option>
                    <option value="QCM banque">QCM banque</option>
                    <option value="Résumé et cours">Résumé et cours</option>
                  </select>
                </div>

                {/* Module Filter */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Module</Label>
                  <select
                    value={moduleFilter}
                    onChange={(e) => setModuleFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card text-sm"
                  >
                    <option value="all">Tous les modules</option>
                    {uniqueModules.map(mod => (
                      <option key={mod} value={mod}>{mod}</option>
                    ))}
                  </select>
                </div>

                {/* User Filter */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Utilisateur</Label>
                  <select
                    value={userFilter}
                    onChange={(e) => setUserFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card text-sm"
                  >
                    <option value="all">Tous les utilisateurs</option>
                    {uniqueUsers.map(user => (
                      <option key={user} value={user}>{user}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Date Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Date début</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Date fin</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="lg:col-span-2 flex items-end">
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      onClick={resetFilters}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-2"
                    >
                      <X className="h-4 w-4" />
                      Réinitialiser les filtres
                    </Button>
                  )}
                </div>
              </div>

              {/* Active Filters Display */}
              {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                  <span className="text-sm text-muted-foreground">Filtres actifs:</span>
                  {searchTerm && (
                    <Badge variant="secondary" className="gap-1">
                      Recherche: {searchTerm.length > 15 ? searchTerm.substring(0, 15) + '...' : searchTerm}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchTerm("")} />
                    </Badge>
                  )}
                  {statusFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Statut: {statusFilter === 'pending' ? 'En attente' : statusFilter === 'resolved' ? 'Résolu' : 'Rejeté'}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setStatusFilter("all")} />
                    </Badge>
                  )}
                  {categoryFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Type: {categoryFilter}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setCategoryFilter("all")} />
                    </Badge>
                  )}
                  {moduleFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Module: {moduleFilter}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setModuleFilter("all")} />
                    </Badge>
                  )}
                  {userFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Utilisateur: {userFilter}
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
                </div>
              )}
            </div>
          </CardContent>
        </Card>

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

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={currentReports.length > 0 && selectedItems.size === currentReports.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Type d'Examen</TableHead>
                    <TableHead>Examen / Cours</TableHead>
                    <TableHead>N° Question</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead>Détails</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentReports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                        Aucun rapport trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentReports.map((report) => (
                      <TableRow
                        key={report.id}
                        className="cursor-pointer hover:bg-background transition-colors"
                      >
                        <TableCell className="w-12">
                          <Checkbox
                            checked={selectedItems.has(report.id)}
                            onCheckedChange={(checked) => handleSelectItem(report.id, checked)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewDetails(report)}
                              className="text-slate-400 hover:text-muted-foreground transition-colors"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                            {report.username}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-foreground">{report.moduleName || "—"}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            report.moduleCategory === "Exam par years" ? "default" :
                              report.moduleCategory === "Exam par courses" ? "secondary" :
                                report.moduleCategory === "QCM banque" ? "outline" :
                                  "secondary"
                          } className="whitespace-nowrap">
                            {report.moduleCategory || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {report.moduleCategory === "Exam par years" && (
                            <div className="text-sm">
                              <span className="font-medium">{report.examName || "—"}</span>
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
                              <span className="font-medium">{report.courseName || report.examName || "—"}</span>
                            </div>
                          )}
                          {report.moduleCategory === "QCM banque" && (
                            <div className="text-sm">
                              <span className="font-medium">{report.examName || "—"}</span>
                            </div>
                          )}
                          {!report.moduleCategory && (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium text-muted-foreground">
                            {report.questionNumber || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <Badge
                            variant="outline"
                            className="cursor-pointer bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors"
                            onClick={() => openQuestionPopup(report.question)}
                          >
                            Voir la question
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <Badge
                            variant="outline"
                            className="cursor-pointer bg-green-50 text-green-700 border-green-200 hover:bg-green-100 transition-colors"
                            onClick={() => openDetailsPopup(report.text)}
                          >
                            Voir les détails
                          </Badge>
                        </TableCell>
                        <TableCell>{report.date || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={
                            report.status === "resolved" ? "success" :
                              report.status === "rejected" ? "destructive" :
                                "secondary"
                          }>
                            {report.status === "resolved" ? "Résolu" :
                              report.status === "rejected" ? "Rejeté" :
                                "En attente"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewDetails(report)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="Voir les détails"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {report.status === "pending" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleApprove(report.id)}
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  title="Approuver"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleReject(report.id)}
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
                              onClick={() => handleEditQuestion(report.questionId)}
                              className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                              title="Modifier la question"
                            >
                              <FilePenLine className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(report.id)}
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

            {filteredReports.length > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t bg-background/50 px-6 py-4">
                <div className="text-sm text-muted-foreground">
                  Affichage de {startIndex + 1} à {Math.min(endIndex, filteredReports.length)} sur {filteredReports.length} résultats
                </div>
                <div className="flex items-center gap-2">
                  {renderPaginationButtons()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="w-[700px] max-w-7xl max-h-[95vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <FileQuestion className="h-6 w-6 text-blue-600" />
              Détails du Rapport
            </DialogTitle>
            <DialogDescription className="text-lg">
              Informations complètes sur le rapport de question
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-6 mt-6">
              {/* User & Status Header Card */}
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">Signalé par:</span>
                        <span className="font-bold text-foreground">{selectedReport.username}</span>
                      </div>
                      {selectedReport.userEmail && selectedReport.userEmail !== "—" && (
                        <div className="text-sm text-muted-foreground">{selectedReport.userEmail}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        {selectedReport.date}
                      </div>
                      <Badge variant={
                        selectedReport.status === "resolved" ? "success" :
                          selectedReport.status === "rejected" ? "destructive" :
                            "secondary"
                      } className="text-sm px-3 py-1">
                        {selectedReport.status === "resolved" ? "Résolu" :
                          selectedReport.status === "rejected" ? "Rejeté" :
                            "En attente"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Context Information */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-indigo-600" />
                  Contexte de la Question
                </h3>

                {/* Layout 1: Exam Par Years */}
                {selectedReport.moduleCategory === "Exam par years" && (
                  <Card>
                    <CardContent className="p-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Module</label>
                          <div className="text-base font-semibold text-foreground bg-indigo-50 border-2 border-indigo-200 rounded-lg px-4 py-3">
                            {selectedReport.moduleName || "—"}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Type d'Examen</label>
                          <div className="text-base font-semibold text-foreground bg-indigo-50 border-2 border-indigo-200 rounded-lg px-4 py-3">
                            Exam par years
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Nom de l'Examen</label>
                          <div className="text-base font-semibold text-foreground bg-indigo-50 border-2 border-indigo-200 rounded-lg px-4 py-3">
                            {selectedReport.examName || "—"}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Nb Questions</label>
                          <div className="text-base font-bold text-indigo-700 bg-indigo-100 border-2 border-indigo-300 rounded-lg px-4 py-3 text-center">
                            {selectedReport.numberOfQuestions || "—"}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Layout 2: QCM banque */}
                {selectedReport.moduleCategory === "QCM banque" && (
                  <Card>
                    <CardContent className="p-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-teal-600 uppercase tracking-wide">Module</label>
                          <div className="text-base font-semibold text-foreground bg-teal-50 border-2 border-teal-200 rounded-lg px-4 py-3">
                            {selectedReport.moduleName || "—"}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-teal-600 uppercase tracking-wide">Type d'Examen</label>
                          <div className="text-base font-semibold text-foreground bg-teal-50 border-2 border-teal-200 rounded-lg px-4 py-3">
                            QCM banque
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-teal-600 uppercase tracking-wide">Nom du QCM</label>
                          <div className="text-base font-semibold text-foreground bg-teal-50 border-2 border-teal-200 rounded-lg px-4 py-3">
                            {selectedReport.examName || "—"}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-teal-600 uppercase tracking-wide">Nb Questions</label>
                          <div className="text-base font-bold text-teal-700 bg-teal-100 border-2 border-teal-300 rounded-lg px-4 py-3 text-center">
                            {selectedReport.numberOfQuestions || "—"}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Layout 3: Exam Par Courses */}
                {selectedReport.moduleCategory === "Exam par courses" && (
                  <Card>
                    <CardContent className="p-5">
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Module</label>
                            <div className="text-base font-semibold text-foreground bg-purple-50 border-2 border-purple-200 rounded-lg px-4 py-3">
                              {selectedReport.moduleName || "—"}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Type d'Examen</label>
                            <div className="text-base font-semibold text-foreground bg-purple-50 border-2 border-purple-200 rounded-lg px-4 py-3">
                              Exam par courses
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Catégorie</label>
                            <div className="text-base font-semibold text-foreground bg-purple-50 border-2 border-purple-200 rounded-lg px-4 py-3">
                              {selectedReport.courseCategory || "—"}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Nom du Cours</label>
                            <div className="text-base font-semibold text-foreground bg-purple-50 border-2 border-purple-200 rounded-lg px-4 py-3">
                              {selectedReport.courseName || selectedReport.examName || "—"}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Année</label>
                            <div className="text-base font-semibold text-foreground bg-purple-50 border-2 border-purple-200 rounded-lg px-4 py-3">
                              {selectedReport.examYear || "—"}
                            </div>
                          </div>
                          <div className="sm:col-span-2 lg:col-span-2"></div>
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Nb Questions</label>
                            <div className="text-base font-bold text-purple-700 bg-purple-100 border-2 border-purple-300 rounded-lg px-4 py-3 text-center">
                              {selectedReport.numberOfQuestions || "—"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Layout 4: Default for Résumé et cours or other types */}
                {(!selectedReport.moduleCategory ||
                  (selectedReport.moduleCategory !== "Exam par years" &&
                    selectedReport.moduleCategory !== "Exam par courses" &&
                    selectedReport.moduleCategory !== "QCM banque")) && (
                    <Card>
                      <CardContent className="p-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Module</label>
                            <div className="text-base font-semibold text-foreground bg-blue-50 border-2 border-blue-200 rounded-lg px-4 py-3">
                              {selectedReport.moduleName || "—"}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Type</label>
                            <div className="text-base font-semibold text-foreground bg-blue-50 border-2 border-blue-200 rounded-lg px-4 py-3">
                              {selectedReport.moduleCategory || "—"}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Nom</label>
                            <div className="text-base font-semibold text-foreground bg-blue-50 border-2 border-blue-200 rounded-lg px-4 py-3">
                              {selectedReport.examName || selectedReport.courseName || "—"}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
              </div>

              {/* Additional Info - Session & Year */}
              {(selectedReport.sessionLabel && selectedReport.sessionLabel !== "—") && (
                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Hash className="h-5 w-5 text-amber-600" />
                        <span className="text-sm font-medium text-muted-foreground">Session:</span>
                        <span className="font-bold text-amber-900">{selectedReport.sessionLabel}</span>
                      </div>
                      {selectedReport.examYear && selectedReport.examYear !== "—" && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-amber-600" />
                          <span className="text-sm font-medium text-muted-foreground">Année:</span>
                          <span className="font-bold text-amber-900">{selectedReport.examYear}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Question & Report Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    Question Signalée
                  </h3>
                  <Card>
                    <CardContent className="p-5">
                      <p className="text-base leading-relaxed text-foreground">{selectedReport.question}</p>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-green-600" />
                    Explications
                  </h3>
                  <Card>
                    <CardContent className="p-5">
                      <p className="text-base leading-relaxed text-foreground min-h-32 max-h-60 overflow-y-auto bg-green-50 rounded-lg p-4 border border-green-100">
                        {selectedReport.explanation || <span className="italic text-slate-400">Aucune explication fournie</span>}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    Détails du Signalement
                  </h3>
                  <Card>
                    <CardContent className="p-5">
                      <p className="text-base leading-relaxed text-foreground min-h-40 max-h-80 overflow-y-auto bg-background rounded-lg p-4 border border-orange-100">
                        {selectedReport.text || <span className="italic text-slate-400">Aucun détail fourni</span>}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
                {selectedReport.status === "pending" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleReject(selectedReport.id);
                        setDetailsOpen(false);
                      }}
                      className="text-orange-600 border-orange-300 hover:bg-orange-50 hover:border-orange-400"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Rejeter
                    </Button>
                    <Button
                      onClick={() => {
                        handleApprove(selectedReport.id);
                        setDetailsOpen(false);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Approuver
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  onClick={() => handleEditQuestion(selectedReport.questionId)}
                  className="text-purple-600 border-purple-300 hover:bg-purple-50 hover:border-purple-400"
                >
                  <FilePenLine className="h-4 w-4 mr-2" />
                  Modifier la Question
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Question Popup Dialog */}
      <Dialog open={questionPopup.open} onOpenChange={(open) => setQuestionPopup({ ...questionPopup, open })}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <BookOpen className="h-5 w-5 text-blue-600" />
              Question Signalée
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

      {/* Details Popup Dialog */}
      <Dialog open={detailsPopup.open} onOpenChange={(open) => setDetailsPopup({ ...detailsPopup, open })}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AlertCircle className="h-5 w-5 text-green-600" />
              Détails du Signalement
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-6">
                <p className="text-base leading-relaxed text-foreground whitespace-pre-wrap break-words">
                  {detailsPopup.text || <span className="italic text-slate-400">Aucun détail fourni</span>}
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setDetailsPopup({ open: false, text: '' })}
            >
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Question Dialog */}
      {showEditDialog && editingQuestion && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifier la Question</DialogTitle>
              <DialogDescription>Modifiez les détails de la question signalée</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Question</Label>
                <Textarea
                  value={editingQuestion.text || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, text: e.target.value })}
                  rows={4}
                />
              </div>
              <div className="space-y-3">
                <Label>Options</Label>
                {editingQuestion.options?.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <Checkbox
                      checked={opt.isCorrect || false}
                      onCheckedChange={(checked) => {
                        const newOptions = [...editingQuestion.options];
                        newOptions[idx] = { ...opt, isCorrect: checked };
                        setEditingQuestion({ ...editingQuestion, options: newOptions });
                      }}
                    />
                    <Input
                      value={opt.text || ''}
                      onChange={(e) => {
                        const newOptions = [...editingQuestion.options];
                        newOptions[idx] = { ...opt, text: e.target.value };
                        setEditingQuestion({ ...editingQuestion, options: newOptions });
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label>Note (optionnel)</Label>
                <Textarea
                  value={editingQuestion.note || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, note: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>Annuler</Button>
              <Button onClick={async () => {
                try {
                  await api.patch(`/questions/update/${editingQuestion._id || editingQuestion.id}`, {
                    text: editingQuestion.text,
                    options: editingQuestion.options,
                    note: editingQuestion.note
                  });
                  toast.success("Question mise à jour avec succès");
                  setShowEditDialog(false);
                  fetchReports(); // Refresh the reports list
                } catch (err) {
                  console.error("Error updating question:", err);
                  toast.error("Erreur lors de la mise à jour");
                }
              }}>
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ReportQuestionsAdmin;
