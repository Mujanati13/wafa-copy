import React, { useState, useEffect } from "react";
import { Button } from "../ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { cn } from "../../lib/utils";
import { displaySubscriptionPlanName, editableUserPlan } from "@/utils/subscriptionDisplay";
import {
  Download,
  UserPlus,
  Search,
  Filter,
  Mail,
  Phone,
  Calendar,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Users,
  UserCheck,
  DollarSign,
  Gift,
  Crown,
  Edit,
  Trash2,
  Eye,
  FileSpreadsheet,
  FileText,
  Shield,
  CheckCircle,
  CreditCard,
  GraduationCap,
  X,
  AlertCircle,
  Ban,
  ShieldOff,
} from "lucide-react";
import { TableFilters } from "../shared";
import NewUserForm from "./NewUserForm";
import { userService } from "../../services/userService";
import { Badge } from "../ui/badge";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

const studentYears = [
  { value: "1", label: "1ère année" },
  { value: "2", label: "2ème année" },
  { value: "3", label: "3ème année" },
  { value: "4", label: "4ème année" },
  { value: "5", label: "5ème année" },
  { value: "6", label: "6ème année" },
];

const semesterOptions = [
  { value: "S1", label: "S1" },
  { value: "S2", label: "S2" },
  { value: "S3", label: "S3" },
  { value: "S4", label: "S4" },
  { value: "S5", label: "S5" },
  { value: "S6", label: "S6" },
  { value: "S7", label: "S7" },
  { value: "S8", label: "S8" },
  { value: "S9", label: "S9" },
  { value: "S10", label: "S10" },
];

const paymentModeOptions = [
  { value: "PayPal", label: "PayPal" },
  { value: "Bank Transfer", label: "Virement bancaire" },
  { value: "Contact", label: "Contact" },
  { value: "Manual", label: "Manuel" },
];

const UsersWithTabs = () => {
  const [activeTab, setActiveTab] = useState("free"); // "free" or "paying"
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({});
  const [pagination, setPagination] = useState({});
  const [exporting, setExporting] = useState(false);

  // Dialog states
  const [selectedUser, setSelectedUser] = useState(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [editFormData, setEditFormData] = useState({});
  const [actionLoading, setActionLoading] = useState(false);

  // New filter states
  const [studentYear, setStudentYear] = useState("all");
  const [startDate, setStartDate] = useState(undefined);
  const [endDate, setEndDate] = useState(undefined);
  const [paymentStartDate, setPaymentStartDate] = useState(undefined);
  const [paymentEndDate, setPaymentEndDate] = useState(undefined);

  // Fetch users based on active tab
  const fetchUsers = async () => {
    setLoading(true);
    try {
      let data;
      if (activeTab === "free") {
        data = await userService.getFreeUsers(currentPage, itemsPerPage);
      } else {
        data = await userService.getPayingUsers(currentPage, itemsPerPage);
      }

      if (data.success) {
        setUsers(data.data.users);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user statistics
  const fetchStats = async () => {
    try {
      const data = await userService.getUserStats();

      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [activeTab, currentPage]);

  useEffect(() => {
    fetchStats();
  }, []);

  // Export to CSV
  const handleExportCSV = async () => {
    setExporting(true);
    try {
      // Fetch all users for export
      const response = await userService.getAllUsers(1, 10000);
      if (!response.success) {
        throw new Error("Failed to fetch users");
      }

      const allUsers = response.data.users;
      const headers = ["Nom", "Email", "Plan", "Statut", "Date d'inscription"];
      const csvContent = [
        headers.join(","),
        ...allUsers.map((user) =>
          [
            `"${user.name || user.username || ""}"`,
            `"${user.email}"`,
            `"${displaySubscriptionPlanName(user.plan, "Free")}"`,
            `"${user.isAactive ? "Actif" : "Inactif"}"`,
            `"${new Date(user.createdAt).toLocaleDateString("fr-FR")}"`,
          ].join(",")
        ),
      ].join("\n");

      const blob = new Blob(["\ufeff" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `utilisateurs_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      alert("Erreur lors de l'exportation CSV");
    } finally {
      setExporting(false);
    }
  };

  // Export to PDF
  const handleExportPDF = async () => {
    setExporting(true);
    try {
      // Fetch all users for export
      const response = await userService.getAllUsers(1, 10000);
      if (!response.success) {
        throw new Error("Failed to fetch users");
      }

      const allUsers = response.data.users;
      const doc = new jsPDF();

      // Title
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text("Liste des Utilisateurs - YourQCM", 14, 20);

      // Subtitle with date
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}`, 14, 28);

      // Stats summary
      doc.setFontSize(11);
      doc.setTextColor(60);
      doc.text(`Total: ${allUsers.length} utilisateurs | Gratuit: ${allUsers.filter(u => u.plan === "Free").length} | Premium: ${allUsers.filter(u => u.plan !== "Free").length}`, 14, 36);

      // Table
      autoTable(doc, {
        startY: 42,
        head: [["Nom", "Email", "Plan", "Statut", "Date d'inscription"]],
        body: allUsers.map((user) => [
          user.name || user.username || "-",
          user.email,
          displaySubscriptionPlanName(user.plan, "Free"),
          user.isAactive ? "Actif" : "Inactif",
          new Date(user.createdAt).toLocaleDateString("fr-FR"),
        ]),
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [99, 102, 241], // Indigo
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251],
        },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 55 },
          2: { cellWidth: 25 },
          3: { cellWidth: 20 },
          4: { cellWidth: 30 },
        },
      });

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Page ${i} sur ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }

      doc.save(`utilisateurs_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (error) {
      console.error("Error exporting PDF:", error);
      alert("Erreur lors de l'exportation PDF");
    } finally {
      setExporting(false);
    }
  };

  const getPlanBadgeColor = (plan) => {
    switch (plan) {
      case "Premium":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "Enterprise":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "Student Discount":
        return "bg-green-100 text-green-800 border-green-200";
      case "Free":
        return "bg-muted text-foreground border-border";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const getStatusBadgeColor = (isActive) => {
    return isActive
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-red-100 text-red-800 border-red-200";
  };

  // Filter users based on search term and filters
  const filteredUsers = users.filter((user) => {
    // Search filter
    const matchesSearch =
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());

    // Student year filter
    const matchesYear = studentYear === "all" || user.currentYear === studentYear;

    // Registration date filter
    const userRegDate = new Date(user.createdAt);
    const matchesRegDate =
      (!startDate || userRegDate >= startDate) &&
      (!endDate || userRegDate <= endDate);

    // Payment date filter (only for paying users)
    let matchesPaymentDate = true;
    if (activeTab === "paying" && user.paymentDate) {
      const userPayDate = new Date(user.paymentDate);
      matchesPaymentDate =
        (!paymentStartDate || userPayDate >= paymentStartDate) &&
        (!paymentEndDate || userPayDate <= paymentEndDate);
    }

    return matchesSearch && matchesYear && matchesRegDate && matchesPaymentDate;
  });

  const handleClearFilters = () => {
    setSearchTerm("");
    setStudentYear("all");
    setStartDate(undefined);
    setEndDate(undefined);
    setPaymentStartDate(undefined);
    setPaymentEndDate(undefined);
  };

  const activeFilterCount =
    (searchTerm ? 1 : 0) +
    (studentYear !== "all" ? 1 : 0) +
    (startDate || endDate ? 1 : 0) +
    (paymentStartDate || paymentEndDate ? 1 : 0);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  // View user details
  const handleViewUser = (user) => {
    setSelectedUser(user);
    setShowViewDialog(true);
  };

  // Helper function to safely format date
  const formatDateSafe = (dateValue) => {
    if (!dateValue) return "";
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return "";
      return date.toISOString().split('T')[0];
    } catch {
      return "";
    }
  };

  // Helper function to format datetime for datetime-local input
  const formatDatetimeLocal = (dateValue) => {
    if (!dateValue) return "";
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return "";
      // Format: YYYY-MM-DDTHH:MM
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return "";
    }
  };

  // Open edit dialog
  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name || "",
      email: user.email || "",
      username: user.username || "",
      currentYear: user.currentYear || "",
      semesters: Array.isArray(user.semesters) ? user.semesters : [],
      plan: editableUserPlan(user.plan),
      isAactive: user.isAactive ?? true,
      paymentMode: user.paymentMode || "",
      paymentDate: formatDateSafe(user.paymentDate),
      approvalDate: formatDateSafe(user.approvalDate),
      consentAcceptedAt: formatDatetimeLocal(user.consentAcceptedAt),
      hasAcceptedCGU: !!user.consentAcceptedAt,
    });
    setShowEditDialog(true);
  };

  // Update user
  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    if (editFormData.plan !== "Free" && (editFormData.semesters || []).length !== 1) {
      toast.error("Sélectionnez exactement un semestre pour cet abonnement");
      return;
    }
    setActionLoading(true);
    try {
      // Clean up data before sending - convert empty strings to null for enum fields
      const cleanedData = {
        ...editFormData,
        paymentMode: editFormData.paymentMode || null,
        paymentDate: editFormData.paymentDate || null,
        approvalDate: editFormData.approvalDate || null,
        // Handle CGU: if toggled on and no date set, use current date; if toggled off, set to null
        consentAcceptedAt: editFormData.hasAcceptedCGU 
          ? (editFormData.consentAcceptedAt 
              ? new Date(editFormData.consentAcceptedAt).toISOString() 
              : new Date().toISOString())
          : null,
      };
      
      // Remove the hasAcceptedCGU helper field before sending
      delete cleanedData.hasAcceptedCGU;
      
      console.log('Sending CGU data:', cleanedData.consentAcceptedAt);
      
      await userService.updateUser(selectedUser._id, cleanedData);
      toast.success("Utilisateur mis à jour avec succès");
      setShowEditDialog(false);
      setSelectedUser(null);
      fetchUsers(); // Refresh list
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Erreur lors de la mise à jour";
      toast.error(errorMessage);
      console.error("Update error:", error);
    } finally {
      setActionLoading(false);
    }
  };

  // Open delete confirmation
  const handleDeleteClick = (user) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  // Open block confirmation
  const handleBlockClick = (user) => {
    setSelectedUser(user);
    setBlockReason("");
    setShowBlockDialog(true);
  };

  // Confirm block/unblock user
  const handleToggleBlock = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await userService.toggleBlockUser(selectedUser._id, blockReason || null);
      toast.success(
        selectedUser.isBlocked 
          ? "Utilisateur débloqué avec succès" 
          : "Utilisateur bloqué avec succès"
      );
      setShowBlockDialog(false);
      setSelectedUser(null);
      setBlockReason("");
      fetchUsers(); // Refresh list
      fetchStats(); // Refresh stats
    } catch (error) {
      toast.error("Erreur lors du changement de statut de blocage");
      console.error("Block toggle error:", error);
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm delete user
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await userService.deleteUser(selectedUser._id);
      toast.success("Utilisateur supprimé avec succès");
      setShowDeleteDialog(false);
      setSelectedUser(null);
      fetchUsers(); // Refresh list
      fetchStats(); // Refresh stats
    } catch (error) {
      toast.error("Erreur lors de la suppression");
      console.error("Delete error:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const renderPaginationButtons = () => {
    if (!pagination.totalPages || pagination.totalPages <= 1) return null;

    const buttons = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(
      1,
      pagination.currentPage - Math.floor(maxVisiblePages / 2)
    );
    let endPage = Math.min(
      pagination.totalPages,
      startPage + maxVisiblePages - 1
    );

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Previous button
    buttons.push(
      <Button
        key="prev"
        variant="outline"
        size="sm"
        onClick={() => handlePageChange(pagination.currentPage - 1)}
        disabled={!pagination.hasPrevPage}
        className="flex items-center gap-0.5 sm:gap-1 h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm"
      >
        <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
        <span className="hidden sm:inline">Previous</span>
      </Button>
    );

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <Button
          key={i}
          variant={pagination.currentPage === i ? "default" : "outline"}
          size="sm"
          onClick={() => handlePageChange(i)}
          className="min-w-[28px] sm:min-w-[36px] h-7 sm:h-8 text-xs sm:text-sm"
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
        onClick={() => handlePageChange(pagination.currentPage + 1)}
        disabled={!pagination.hasNextPage}
        className="flex items-center gap-0.5 sm:gap-1 h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
      </Button>
    );

    return buttons;
  };

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6">
      <div className="w-full space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
              User Management
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Manage user accounts, subscriptions, and access
            </p>
          </div>
          <div className="flex gap-2 sm:gap-3 flex-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={exporting} className="h-8 sm:h-9 text-xs sm:text-sm">
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline ml-1.5">{exporting ? "Exportation..." : "Export"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV} className="gap-2 cursor-pointer">
                  <FileSpreadsheet className="w-4 h-4" />
                  Exporter en CSV
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportPDF} className="gap-2 cursor-pointer">
                  <FileText className="w-4 h-4" />
                  Exporter en PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="sm"
              className="bg-black text-white hover:bg-gray-800 h-8 sm:h-9 text-xs sm:text-sm"
              onClick={() => setShowNewUserForm(!showNewUserForm)}
            >
              <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="ml-1.5">Add</span>
            </Button>
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {/* Total Users Card */}
          <Card className="shadow-sm">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                    Total Users
                  </p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">
                    {stats.totalUsers || 0}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Free Users Card */}
          <Card className="shadow-sm">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                    Free Users
                  </p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">
                    {stats.freeUsers || 0}
                  </p>
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                    {stats.totalUsers
                      ? ((stats.freeUsers / stats.totalUsers) * 100).toFixed(1)
                      : 0}
                    % of total
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-muted rounded-lg">
                  <Gift className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Paying Users Card */}
          <Card className="shadow-sm">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                    Paying Users
                  </p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">
                    {stats.payingUsers || 0}
                  </p>
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                    {stats.totalUsers
                      ? ((stats.payingUsers / stats.totalUsers) * 100).toFixed(
                        1
                      )
                      : 0}
                    % of total
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-green-100 rounded-lg">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Users Card */}
          <Card className="shadow-sm">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                    Active Users
                  </p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">
                    {stats.activeUsers || 0}
                  </p>
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                    {stats.totalUsers
                      ? ((stats.activeUsers / stats.totalUsers) * 100).toFixed(
                        1
                      )
                      : 0}
                    % of total
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-green-100 rounded-lg">
                  <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <Card className="shadow-sm">
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <div className="flex space-x-1 overflow-x-auto pb-1 -mx-1 px-1">
              <Button
                variant={activeTab === "free" ? "default" : "outline"}
                onClick={() => handleTabChange("free")}
                className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap"
                size="sm"
              >
                <Gift className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Free ({stats.freeUsers || 0})
              </Button>
              <Button
                variant={activeTab === "paying" ? "default" : "outline"}
                onClick={() => handleTabChange("paying")}
                className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap"
                size="sm"
              >
                <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Paying ({stats.payingUsers || 0})
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Search and Filter */}
        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <TableFilters
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Rechercher par nom, username ou email..."
              startDate={startDate}
              endDate={endDate}
              onDateChange={({ startDate: sd, endDate: ed }) => {
                setStartDate(sd);
                setEndDate(ed);
              }}
              showDateFilter={true}
              additionalFilters={[
                {
                  key: "studentYear",
                  label: "Année d'étude",
                  value: studentYear,
                  onChange: setStudentYear,
                  options: studentYears,
                },
                ...(activeTab === "paying" ? [{
                  key: "paymentDate",
                  label: "Date de paiement",
                  value: paymentStartDate ? "custom" : "all",
                  onChange: (val) => {
                    if (val === "all") {
                      setPaymentStartDate(undefined);
                      setPaymentEndDate(undefined);
                    }
                  },
                  options: [
                    { value: "last7days", label: "7 derniers jours" },
                    { value: "last30days", label: "30 derniers jours" },
                    { value: "last90days", label: "90 derniers jours" },
                  ],
                }] : [])
              ]}
              onClearFilters={handleClearFilters}
              activeFilterCount={activeFilterCount}
            />
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="shadow-sm">
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-base sm:text-lg md:text-xl font-bold">
              {activeTab === "free" ? "Free Users" : "Paying Users"} (
              {filteredUsers.length})
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {activeTab === "free"
                ? "Users with free plan access"
                : "Users with premium subscriptions"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-2 md:p-4">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-foreground">
                        Utilisateur
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-foreground">
                        Contact
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-foreground">
                        <div className="flex items-center gap-1">
                          <GraduationCap className="w-4 h-4" />
                          Année
                        </div>
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-foreground">
                        Statut
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-foreground">
                        Semestre
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-foreground">
                        Inscription
                      </th>
                      {activeTab === "paying" && (
                        <>
                          <th className="text-left py-3 px-4 font-medium text-foreground">
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              Approbation
                            </div>
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-foreground">
                            <div className="flex items-center gap-1">
                              <CreditCard className="w-4 h-4 text-blue-600" />
                              Paiement
                            </div>
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-foreground">
                            <div className="flex items-center gap-1">
                              <CreditCard className="w-4 h-4 text-purple-600" />
                              Mode de paiement
                            </div>
                          </th>
                        </>
                      )}
                      <th className="text-left py-3 px-4 font-medium text-foreground">
                        <div className="flex items-center gap-1">
                          <Shield className="w-4 h-4 text-purple-600" />
                          CGU
                        </div>
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr
                        key={user._id}
                        className="border-b border-gray-100 hover:bg-background transition-colors"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-muted-foreground font-medium text-sm">
                                {user.name
                                  ? user.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                  : user.username?.charAt(0).toUpperCase() ||
                                  "U"}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-foreground truncate">
                                {user.name || user.username}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                @{user.username}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="text-gray-400 flex-shrink-0 w-3.5 h-3.5" />
                              <span className="text-foreground truncate">
                                {user.email}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {user.currentYear ? `${user.currentYear}ème` : '-'}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-1">
                            <span
                              className={cn(
                                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                                getStatusBadgeColor(user.isAactive)
                              )}
                            >
                              {user.isAactive ? "Actif" : "Inactif"}
                            </span>
                            {user.isBlocked && (
                              <Badge className="bg-red-100 text-red-700 border-red-300 text-xs">
                                <Ban className="w-3 h-3 mr-1" />
                                Bloqué
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-foreground">
                            {user.semesters?.map((s) => s).join(", ") || "N/A"}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="text-gray-400 flex-shrink-0 w-3.5 h-3.5" />
                            <span className="text-foreground text-sm">
                              {new Date(user.createdAt).toLocaleDateString("fr-FR")}
                            </span>
                          </div>
                        </td>
                        {activeTab === "paying" && (
                          <>
                            <td className="py-4 px-4">
                              {user.approvalDate ? (
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="text-green-500 w-4 h-4" />
                                  <span className="text-sm text-foreground">
                                    {new Date(user.approvalDate).toLocaleDateString("fr-FR")}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              {user.paymentDate ? (
                                <div className="flex items-center gap-2">
                                  <CreditCard className="text-blue-500 w-4 h-4" />
                                  <span className="text-sm text-foreground">
                                    {new Date(user.paymentDate).toLocaleDateString("fr-FR")}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              {user.paymentMethod ? (
                                <Badge
                                  variant="outline"
                                  className={
                                    user.paymentMethod === 'PayPal'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : user.paymentMethod === 'Bank Transfer'
                                        ? 'bg-green-50 text-green-700 border-green-200'
                                        : 'bg-purple-50 text-purple-700 border-purple-200'
                                  }
                                >
                                  {user.paymentMethod}
                                </Badge>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </td>
                          </>
                        )}
                        <td className="py-4 px-4">
                          {user.consentAcceptedAt ? (
                            <div className="space-y-1">
                              <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Accepté
                              </Badge>
                              <p className="text-xs text-muted-foreground">
                                {new Date(user.consentAcceptedAt).toLocaleDateString("fr-FR")}
                              </p>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-300 gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Non accepté
                            </Badge>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="text-gray-400 hover:text-muted-foreground transition-colors">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="flex items-center gap-2 cursor-pointer"
                                onClick={() => handleViewUser(user)}
                              >
                                <Eye className="w-4 h-4" />
                                Voir
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="flex items-center gap-2 cursor-pointer"
                                onClick={() => handleEditUser(user)}
                              >
                                <Edit className="w-4 h-4" />
                                Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="flex items-center gap-2 cursor-pointer"
                                onClick={() => {
                                  handleEditUser(user);
                                  // Scroll to CGU section after opening (small delay for dialog to render)
                                  setTimeout(() => {
                                    const cguSection = document.getElementById('edit-cgu-accepted');
                                    if (cguSection) {
                                      cguSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }
                                  }, 100);
                                }}
                              >
                                <Shield className="w-4 h-4 text-purple-600" />
                                Gérer CGU
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className={cn(
                                  "flex items-center gap-2 cursor-pointer",
                                  user.isBlocked ? "text-green-600" : "text-orange-600"
                                )}
                                onClick={() => handleBlockClick(user)}
                              >
                                {user.isBlocked ? (
                                  <>
                                    <ShieldOff className="w-4 h-4" />
                                    Débloquer
                                  </>
                                ) : (
                                  <>
                                    <Ban className="w-4 h-4" />
                                    Bloquer
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="flex items-center gap-2 text-red-600 cursor-pointer"
                                onClick={() => handleDeleteClick(user)}
                              >
                                <Trash2 className="w-4 h-4" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>

          {/* Pagination Footer */}
          {pagination.totalPages > 1 && (
            <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 border-t bg-background/50 p-3 sm:p-4">
              <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                Showing {(pagination.currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(
                  pagination.currentPage * itemsPerPage,
                  pagination.totalUsers
                )}{" "}
                of {pagination.totalUsers}
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-center">
                {renderPaginationButtons()}
              </div>
            </CardFooter>
          )}
        </Card>
      </div>

      {showNewUserForm && (
        <NewUserForm 
          setShowNewUserForm={setShowNewUserForm} 
          onUserCreated={() => {
            fetchUsers();
            fetchStats();
          }}
        />
      )}

      {/* View User Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Détails de l'utilisateur
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Nom</Label>
                  <p className="font-medium">{selectedUser.name || selectedUser.username || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Username</Label>
                  <p className="font-medium">@{selectedUser.username}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Plan</Label>
                  <Badge className={getPlanBadgeColor(selectedUser.plan)}>
                    {displaySubscriptionPlanName(selectedUser.plan, "Free")}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Statut</Label>
                  <div className="flex flex-col gap-1 mt-1">
                    <Badge className={getStatusBadgeColor(selectedUser.isAactive)}>
                      {selectedUser.isAactive ? "Actif" : "Inactif"}
                    </Badge>
                    {selectedUser.isBlocked && (
                      <Badge className="bg-red-100 text-red-700 border-red-300">
                        <Ban className="w-3 h-3 mr-1" />
                        Bloqué
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Année d'étude</Label>
                  <p className="font-medium">{selectedUser.currentYear ? `${selectedUser.currentYear}ème année` : "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date d'inscription</Label>
                  <p className="font-medium">{new Date(selectedUser.createdAt).toLocaleDateString("fr-FR")}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground">CGU (Conditions Générales d'Utilisation)</Label>
                  {selectedUser.consentAcceptedAt ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Accepté
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        le {new Date(selectedUser.consentAcceptedAt).toLocaleDateString("fr-FR")} à {new Date(selectedUser.consentAcceptedAt).toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ) : (
                    <Badge variant="outline" className="mt-1 text-muted-foreground">
                      Non accepté
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Semesters Section */}
              <div className="border-t pt-4">
                <Label className="text-muted-foreground">Semestres assignés</Label>
                {selectedUser.semesters && selectedUser.semesters.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedUser.semesters.map((sem) => (
                      <Badge key={sem} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {sem}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 mt-1">Aucun semestre assigné</p>
                )}
              </div>

              {/* Block Status Section */}
              {selectedUser.isBlocked && (
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <Ban className="w-4 h-4 text-red-600" />
                    Informations de blocage
                  </Label>
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md space-y-2">
                    {selectedUser.blockedAt && (
                      <p className="text-sm text-foreground">
                        <span className="font-medium">Bloqué le :</span>{" "}
                        {new Date(selectedUser.blockedAt).toLocaleDateString("fr-FR")} à{" "}
                        {new Date(selectedUser.blockedAt).toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                    {selectedUser.blockedReason && (
                      <p className="text-sm text-foreground">
                        <span className="font-medium">Raison :</span> {selectedUser.blockedReason}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Modifier l'utilisateur
            </DialogTitle>
            <DialogDescription>
              Modifiez les informations de l'utilisateur. Les champs marqués avec * sont obligatoires.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Name and Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Nom *</Label>
                <Input
                  id="edit-name"
                  value={editFormData.name || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="Nom complet"
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editFormData.email || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
            </div>

            {/* Year and Plan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-year">Année d'étude</Label>
                <select
                  id="edit-year"
                  className="w-full p-2 border rounded-md bg-card"
                  value={editFormData.currentYear || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, currentYear: e.target.value })}
                >
                  <option value="">Sélectionner...</option>
                  {studentYears.map((year) => (
                    <option key={year.value} value={year.value}>{year.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="edit-plan">Plan</Label>
                <select
                  id="edit-plan"
                  className="w-full p-2 border rounded-md bg-card"
                  value={editFormData.plan || "Free"}
                  onChange={(e) => setEditFormData({
                    ...editFormData,
                    plan: e.target.value,
                    semesters: e.target.value === "Free"
                      ? editFormData.semesters
                      : (editFormData.semesters || []).slice(0, 1),
                  })}
                >
                  <option value="Free">Gratuit</option>
                  <option value="Premium">Premium (Semestre)</option>
                  <option value="Premium Pro">Premium Pro (Semestre)</option>
                </select>
              </div>
            </div>

            {/* Semesters Multi-select */}
            <div>
              <Label>Semestres</Label>
              <div className="grid grid-cols-5 gap-2 mt-2 p-3 border rounded-md bg-background">
                {semesterOptions.map((sem) => (
                  <label key={sem.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.semesters?.includes(sem.value) || false}
                      onChange={(e) => {
                        const currentSemesters = editFormData.semesters || [];
                        if (e.target.checked && editFormData.plan !== "Free") {
                          setEditFormData({
                            ...editFormData,
                            semesters: [sem.value],
                          });
                        } else if (e.target.checked) {
                          setEditFormData({
                            ...editFormData, 
                            semesters: [...currentSemesters, sem.value].sort() 
                          });
                        } else {
                          setEditFormData({ 
                            ...editFormData, 
                            semesters: currentSemesters.filter(s => s !== sem.value) 
                          });
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{sem.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Payment Info - Only show for non-Free plans */}
            {editFormData.plan !== "Free" && (
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Informations de paiement
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="edit-payment-mode">Mode de paiement</Label>
                    <select
                      id="edit-payment-mode"
                      className="w-full p-2 border rounded-md bg-card"
                      value={editFormData.paymentMode || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, paymentMode: e.target.value })}
                    >
                      <option value="">Sélectionner...</option>
                      {paymentModeOptions.map((mode) => (
                        <option key={mode.value} value={mode.value}>{mode.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="edit-payment-date">Date de paiement</Label>
                    <Input
                      id="edit-payment-date"
                      type="date"
                      value={editFormData.paymentDate || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, paymentDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-approval-date">Date d'approbation</Label>
                    <Input
                      id="edit-approval-date"
                      type="date"
                      value={editFormData.approvalDate || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, approvalDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Active Status */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="edit-active"
                checked={editFormData.isAactive ?? true}
                onChange={(e) => setEditFormData({ ...editFormData, isAactive: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="edit-active" className="cursor-pointer">Compte actif</Label>
            </div>

            {/* CGU (Terms of Use) Section */}
            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-600" />
                Conditions Générales d'Utilisation (CGU)
              </h4>
              <div className="space-y-3 p-3 bg-background rounded-lg">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-cgu-accepted"
                    checked={editFormData.hasAcceptedCGU || false}
                    onChange={(e) => {
                      const isAccepted = e.target.checked;
                      setEditFormData({ 
                        ...editFormData, 
                        hasAcceptedCGU: isAccepted,
                        // If accepting for first time and no date set, will use current date on save
                        consentAcceptedAt: isAccepted ? (editFormData.consentAcceptedAt || formatDatetimeLocal(new Date())) : ""
                      });
                    }}
                    className="rounded"
                  />
                  <Label htmlFor="edit-cgu-accepted" className="cursor-pointer font-medium">
                    L'utilisateur a accepté les CGU
                  </Label>
                </div>
                
                {editFormData.hasAcceptedCGU && (
                  <div>
                    <Label htmlFor="edit-consent-date" className="text-sm">Date d'acceptation</Label>
                    <Input
                      id="edit-consent-date"
                      type="datetime-local"
                      value={editFormData.consentAcceptedAt || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, consentAcceptedAt: e.target.value })}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Date et heure à laquelle l'utilisateur a accepté les conditions d'utilisation
                    </p>
                  </div>
                )}
                
                {!editFormData.hasAcceptedCGU && (
                  <p className="text-sm text-amber-600 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    L'utilisateur n'a pas encore accepté les CGU
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Annuler</Button>
            <Button onClick={handleUpdateUser} disabled={actionLoading}>
              {actionLoading ? "Mise à jour..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{selectedUser?.name || selectedUser?.username}</strong> ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={actionLoading}>
              {actionLoading ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block/Unblock Confirmation Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              {selectedUser?.isBlocked ? (
                <>
                  <ShieldOff className="w-5 h-5" />
                  Débloquer l'utilisateur
                </>
              ) : (
                <>
                  <Ban className="w-5 h-5" />
                  Bloquer l'utilisateur
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.isBlocked ? (
                <>
                  Êtes-vous sûr de vouloir débloquer <strong>{selectedUser?.name || selectedUser?.username}</strong> ? Cet utilisateur pourra à nouveau se connecter.
                </>
              ) : (
                <>
                  Êtes-vous sûr de vouloir bloquer <strong>{selectedUser?.name || selectedUser?.username}</strong> ? Cet utilisateur ne pourra plus se connecter à son compte.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {!selectedUser?.isBlocked && (
            <div className="space-y-2">
              <Label htmlFor="blockReason">Raison du blocage (optionnel)</Label>
              <Input
                id="blockReason"
                placeholder="Ex: Violation des conditions d'utilisation"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockDialog(false)}>Annuler</Button>
            <Button 
              onClick={handleToggleBlock} 
              disabled={actionLoading}
              className={selectedUser?.isBlocked ? "bg-green-600 hover:bg-green-700" : "bg-orange-600 hover:bg-orange-700"}
            >
              {actionLoading ? "Traitement..." : (selectedUser?.isBlocked ? "Débloquer" : "Bloquer")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersWithTabs;
