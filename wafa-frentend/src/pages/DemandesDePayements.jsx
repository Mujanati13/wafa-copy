import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { motion } from "framer-motion";
import { Trash2, Check, CreditCard, ChevronLeft, ChevronRight, CheckCircle2, Clock, DollarSign, Search, Calendar, X, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader, TableFilters } from "@/components/shared";
import { paymentService } from "@/services/paymentService";
import { toast } from "sonner";

const DemandesDePayements = () => {
  const { t } = useTranslation(['admin', 'common']);

  // Real data from backend
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 5, total: 0, pages: 0 });

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending"); // Default to pending
  const [actionLoading, setActionLoading] = useState(null); // Track loading state per transaction ID

  useEffect(() => {
    fetchTransactions(1);
  }, [statusFilter]);

  const fetchTransactions = async (page) => {
    try {
      setLoading(true);
      const params = { page, limit: pagination.limit };
      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const response = await paymentService.getAllTransactions(params);
      setTransactions(response.transactions);
      setPagination(response.pagination);
      setStats(response.stats);
    } catch (error) {
      toast.error('Erreur', { description: 'Impossible de charger les transactions.' });
    } finally {
      setLoading(false);
    }
  };

  // Handle approve transaction
  const handleApprove = async (transactionId) => {
    setActionLoading(transactionId);
    try {
      await paymentService.approveTransaction(transactionId);
      toast.success('Succès', { description: 'Transaction approuvée avec succès.' });
      fetchTransactions(pagination.page); // Refresh the list
    } catch (error) {
      toast.error('Erreur', { description: 'Impossible d\'approuver la transaction.' });
      console.error('Approve error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle reject transaction
  const handleReject = async (transactionId) => {
    setActionLoading(transactionId);
    try {
      await paymentService.rejectTransaction(transactionId);
      toast.success('Succès', { description: 'Transaction refusée avec succès.' });
      fetchTransactions(pagination.page); // Refresh the list
    } catch (error) {
      toast.error('Erreur', { description: 'Impossible de refuser la transaction.' });
      console.error('Reject error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Old hardcoded data (keeping for reference, will be removed)
  const demandesOld = [
    {
      id: 1,
      profileImg: "https://randomuser.me/api/portraits/women/1.jpg",
      username: "sarahj",
      name: "Dr. Sarah Johnson",
      email: "sarah.johnson@email.com",
      registered: "2024-01-10",
      paymentMode: "Credit Card",
      semesters: ["Spring 2024", "Fall 2024"],
    },
    {
      id: 2,
      profileImg: "https://randomuser.me/api/portraits/men/2.jpg",
      username: "mikec",
      name: "Michael Chen",
      email: "michael.chen@email.com",
      registered: "2024-02-05",
      paymentMode: "PayPal",
      semesters: ["Spring 2024"],
    },
    {
      id: 3,
      profileImg: "https://randomuser.me/api/portraits/women/3.jpg",
      username: "emilyr",
      name: "Dr. Emily Rodriguez",
      email: "emily.rodriguez@email.com",
      registered: "2024-03-12",
      paymentMode: "Bank Transfer",
      semesters: ["Fall 2024"],
    },
    {
      id: 4,
      profileImg: "https://randomuser.me/api/portraits/women/1.jpg",
      username: "sarahj",
      name: "Dr. Sarah Johnson",
      email: "sarah.johnson@email.com",
      registered: "2024-01-10",
      paymentMode: "Credit Card",
      semesters: ["Spring 2024", "Fall 2024"],
    },
    {
      id: 5,
      profileImg: "https://randomuser.me/api/portraits/men/2.jpg",
      username: "mikec",
      name: "Michael Chen",
      email: "michael.chen@email.com",
      registered: "2024-02-05",
      paymentMode: "PayPal",
      semesters: ["Spring 2024"],
    },
    {
      id: 6,
      profileImg: "https://randomuser.me/api/portraits/women/3.jpg",
      username: "emilyr",
      name: "Dr. Emily Rodriguez",
      email: "emily.rodriguez@email.com",
      registered: "2024-03-12",
      paymentMode: "Bank Transfer",
      semesters: ["Fall 2024"],
    },
  ];

  // Pagination logic with real data
  const handlePageChange = (page) => {
    fetchTransactions(page);
  };

  // Filter transactions based on search and date
  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      t.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t._id?.toLowerCase().includes(searchTerm.toLowerCase());

    const transactionDate = t.createdAt ? t.createdAt.slice(0, 10) : "";
    let matchesDate = true;
    if (dateFrom) {
      matchesDate = matchesDate && transactionDate >= dateFrom;
    }
    if (dateTo) {
      matchesDate = matchesDate && transactionDate <= dateTo;
    }

    return matchesSearch && matchesDate;
  });

  const renderPaginationButtons = () => {
    const buttons = [];
    const maxVisiblePages = 5;
    const currentPage = pagination.page;
    const totalPages = pagination.pages;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    // Previous button
    buttons.push(
      <button
        key="prev"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center gap-1 px-3 py-1 border rounded text-sm bg-card hover:bg-muted disabled:opacity-50"
      >
        &lt; Prev
      </button>
    );
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`min-w-[40px] px-3 py-1 border rounded text-sm ${currentPage === i
            ? "bg-black text-white"
            : "bg-card hover:bg-muted"
            }`}
        >
          {i}
        </button>
      );
    }
    // Next button
    buttons.push(
      <button
        key="next"
        onClick={() => handlePageChange(pagination.page + 1)}
        disabled={pagination.page === totalPages}
        className="flex items-center gap-1 px-3 py-1 border rounded text-sm bg-card hover:bg-muted disabled:opacity-50"
      >
        Next &gt;
      </button>
    );
    return buttons;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50 to-slate-100 p-3 sm:p-4 md:p-6">
      <div className="w-full space-y-6">
        {/* Header with gradient background */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-lg bg-gradient-to-r from-amber-600 to-orange-500 p-6 text-white shadow-lg"
        >
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Demandes de Payements
            </h1>
            <p className="text-amber-100">
              Gérez et traitez les demandes de paiement des utilisateurs
            </p>
          </div>
        </motion.div>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {/* Total Requests */}
          <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">
                    Total Demandes
                  </p>
                  <p className="text-3xl font-bold text-foreground mt-2">
                    {loading ? '...' : pagination.total}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Payment requests
                  </p>
                </div>
                <Clock className="w-8 h-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          {/* Pending Requests */}
          <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">
                    En attente
                  </p>
                  <p className="text-3xl font-bold text-foreground mt-2">
                    {loading ? '...' : (stats.find(s => s._id === 'pending')?.count || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Awaiting approval
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          {/* Completed */}
          <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">
                    Complétés
                  </p>
                  <p className="text-3xl font-bold text-foreground mt-2">
                    {loading ? '...' : (stats.find(s => s._id === 'completed')?.count || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Completed payments
                  </p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <Card className="shadow-lg border-0">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[300px] max-w-xl">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search users by name, username or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 h-10 border border-border rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 px-3 border border-border rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm bg-card"
                >
                  <option value="pending">En attente</option>
                  <option value="completed">Approuvés</option>
                  <option value="all">Tous</option>
                </select>

                {/* Date of demandes Filter */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="h-10 px-3 border border-border rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                      placeholder="Date of demandes"
                    />
                  </div>
                  {(dateFrom || dateTo) && (
                    <span className="text-slate-400">-</span>
                  )}
                  {(dateFrom || dateTo) && (
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="h-10 px-3 border border-border rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                    />
                  )}
                </div>

                {/* Clear Filters */}
                {(searchTerm || dateFrom || dateTo || statusFilter !== 'pending') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("");
                      setDateFrom("");
                      setDateTo("");
                      setStatusFilter("pending");
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reset
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Table Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
              <CardTitle className="text-2xl font-bold text-foreground">
                Liste des Demandes
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Tableau des demandes de paiement des utilisateurs
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-background border-b border-border">
                    <tr>
                      <th className="text-left py-4 px-6 font-semibold text-foreground">
                        ID
                      </th>
                      <th className="text-left py-4 px-6 font-semibold text-foreground">
                        Utilisateur
                      </th>
                      <th className="text-left py-4 px-6 font-semibold text-foreground">
                        Email
                      </th>
                      <th className="text-center py-4 px-6 font-semibold text-foreground">
                        Date de Demande
                      </th>
                      <th className="text-center py-4 px-6 font-semibold text-foreground">
                        Date d'Inscription
                      </th>
                      <th className="text-center py-4 px-6 font-semibold text-foreground">
                        Mode de Paiement
                      </th>
                      <th className="text-center py-4 px-6 font-semibold text-foreground">
                        Semestres Demandés
                      </th>
                      <th className="text-center py-4 px-6 font-semibold text-foreground">
                        Montant
                      </th>
                      <th className="text-right py-4 px-6 font-semibold text-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 3 }).map((_, index) => (
                        <tr key={index} className="border-b border-gray-100">
                          <td className="py-4 px-6"><div className="h-4 bg-gray-200 rounded animate-pulse"></div></td>
                          <td className="py-4 px-6"><div className="h-10 bg-gray-200 rounded animate-pulse"></div></td>
                          <td className="py-4 px-6"><div className="h-4 bg-gray-200 rounded animate-pulse"></div></td>
                          <td className="py-4 px-6"><div className="h-4 bg-gray-200 rounded animate-pulse"></div></td>
                          <td className="py-4 px-6"><div className="h-4 bg-gray-200 rounded animate-pulse"></div></td>
                          <td className="py-4 px-6"><div className="h-4 bg-gray-200 rounded animate-pulse"></div></td>
                          <td className="py-4 px-6"><div className="h-4 bg-gray-200 rounded animate-pulse"></div></td>
                          <td className="py-4 px-6"><div className="h-4 bg-gray-200 rounded animate-pulse"></div></td>
                          <td className="py-4 px-6"><div className="h-4 bg-gray-200 rounded animate-pulse"></div></td>
                        </tr>
                      ))
                    ) : filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-8 text-muted-foreground">
                          Aucune transaction trouvée
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((t, index) => (
                        <motion.tr
                          key={t._id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="border-b border-gray-100 hover:bg-amber-50/50 transition-colors"
                        >
                          <td className="py-4 px-6 text-muted-foreground text-sm font-mono">
                            {t._id.slice(-8).toUpperCase()}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={t.user?.profileImage?.startsWith('http') ? t.user.profileImage : t.user?.profileImage ? `${import.meta.env.VITE_API_URL?.replace('/api/v1', '')}${t.user.profileImage}` : undefined} />
                                <AvatarFallback>
                                  {t.user?.name
                                    ?.split(" ")
                                    .map((n) => n[0])
                                    .join("") || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <p className="font-semibold text-foreground">
                                {t.user?.name || "Unknown"}
                              </p>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-muted-foreground">{t.user?.email || "N/A"}</td>
                          <td className="py-4 px-6 text-center text-muted-foreground text-sm">
                            {new Date(t.createdAt).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="py-4 px-6 text-center text-muted-foreground text-sm">
                            {t.user?.createdAt ? new Date(t.user.createdAt).toLocaleDateString('fr-FR') : 'N/A'}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <Badge
                              className={`border-0 ${t.paymentMethod === 'Contact' ? 'bg-blue-100 text-blue-800' :
                                t.paymentMethod === 'PayPal' ? 'bg-indigo-100 text-indigo-800' :
                                  t.paymentMethod === 'Bank Transfer' ? 'bg-emerald-100 text-emerald-800' :
                                    'bg-muted text-foreground'
                                }`}
                            >
                              <MessageCircle className="h-3 w-3 mr-1" />
                              {t.paymentMethod || 'Contact'}
                            </Badge>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="flex flex-wrap gap-1 justify-center">
                              {t.semesters && t.semesters.length > 0 ? (
                                t.semesters.map((sem, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {sem}
                                  </Badge>
                                ))
                              ) : t.plan?.semesters && t.plan.semesters.length > 0 ? (
                                t.plan.semesters.map((sem, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {sem}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <Badge variant="outline" className="text-xs font-semibold">
                              ${t.amount?.toFixed(2) || "0.00"}
                            </Badge>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {t.status === 'pending' ? (
                                <>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    className="h-8 px-3 bg-green-600 hover:bg-green-700"
                                    title="Approuver"
                                    onClick={() => handleApprove(t._id)}
                                    disabled={actionLoading === t._id}
                                  >
                                    <Check className="h-4 w-4 mr-1" />
                                    {actionLoading === t._id ? 'Chargement...' : 'Approuver'}
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="h-8 px-3 bg-red-600 hover:bg-red-700"
                                    title="Refuser"
                                    onClick={() => handleReject(t._id)}
                                    disabled={actionLoading === t._id}
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    {actionLoading === t._id ? 'Chargement...' : 'Refuser'}
                                  </Button>
                                </>
                              ) : (
                                <Badge className={
                                  t.status === 'completed' ? 'bg-green-100 text-green-700' :
                                    t.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                      'bg-muted text-foreground'
                                }>
                                  {t.status === 'completed' ? 'Approuvé' :
                                    t.status === 'cancelled' ? 'Rejeté' : t.status}
                                </Badge>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      )))}
                  </tbody>
                </table>
              </div>
            </CardContent>

            {/* Pagination Footer */}
            {pagination.pages > 1 && (
              <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t bg-gradient-to-r from-amber-50 to-orange-50 py-4">
                <div className="text-sm text-muted-foreground font-medium">
                  Page {pagination.page} sur {pagination.pages} ({pagination.total} résultats)
                </div>
                <div className="flex items-center gap-1">
                  {renderPaginationButtons()}
                </div>
              </CardFooter>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default DemandesDePayements;
