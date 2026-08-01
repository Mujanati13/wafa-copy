import { useMemo, useState, useEffect, useRef } from "react";
import { useTranslation } from 'react-i18next';
import { BookOpen, Search, Plus, Edit, Trash2, Eye, ChevronLeft, ChevronRight, Loader2, HelpCircle, Upload, X } from "lucide-react";
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
import { api } from "@/lib/utils";

const API_URL = import.meta.env.VITE_API_URL;
const DEFAULT_QCM_IMAGE = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSMC9M_cEyx3SqKeJVj_RbrtTxkDXhVP1k_2A&s";

const QCMBanque = () => {
    const { t } = useTranslation(['admin', 'common']);
    const [searchTerm, setSearchTerm] = useState("");
    const [showAddQCMForm, setShowAddQCMForm] = useState(false);
    const [editingQCM, setEditingQCM] = useState(null);
    const [viewingQCM, setViewingQCM] = useState(null);
    const [showViewDialog, setShowViewDialog] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;
    const [moduleFilter, setModuleFilter] = useState("all");
    const [semesterFilter, setSemesterFilter] = useState("all"); // Semester filter for table
    const [formSemesterFilter, setFormSemesterFilter] = useState("all");
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState("");
    const fileInputRef = useRef(null);
    const [qcmList, setQcmList] = useState([]);
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [formData, setFormData] = useState({
        name: "",
        moduleId: "",
        imageUrl: "",
        infoText: "",
    });

    const placeholderImage = DEFAULT_QCM_IMAGE;

    useEffect(() => {
        fetchQCMList();
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

    const fetchQCMList = async () => {
        try {
            setLoading(true);
            setError(null);
            const { data } = await api.get("/qcm-banque/all");
            const list = (data?.data || []).map((q) => {
                // Handle image URL - prepend API_URL if it's a relative path
                let imageUrl = q?.imageUrl || placeholderImage;
                if (imageUrl && !imageUrl.startsWith("http") && imageUrl !== placeholderImage) {
                    imageUrl = `${API_URL?.replace('/api/v1', '')}${imageUrl}`;
                }
                
                return {
                    id: q?._id,
                    moduleName: q?.moduleName || q?.moduleId?.name || "",
                    moduleId: q?.moduleId?._id || q?.moduleId || "",
                    name: q?.name || "",
                    imageUrl: imageUrl,
                    totalQuestions: q?.totalQuestions || 0,
                    infoText: q?.infoText || "",
                };
            });
            setQcmList(list);
        } catch (err) {
            console.error("Error fetching QCM Banque:", err);
            setError("Erreur lors du chargement des QCM Banque");
            toast.error("Erreur de chargement");
        } finally {
            setLoading(false);
        }
    };

    const handleFormChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        
        // When module is changed, validate it matches the current semester filter
        if (field === "moduleId" && value && formSemesterFilter !== "all") {
            const selectedModule = modules.find(m => m._id === value);
            if (selectedModule && selectedModule.semester !== formSemesterFilter) {
                // Module doesn't match the semester filter, reset it
                setFormData((prev) => ({ ...prev, moduleId: "" }));
                toast.warning(`Le module sélectionné n'appartient pas au semestre ${formSemesterFilter}`);
            }
        }
    };

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

    // Reset form
    const resetForm = () => {
        setShowAddQCMForm(false);
        setEditingQCM(null);
        setFormSemesterFilter("all");
        clearImage();
        setFormData({ name: "", moduleId: "", imageUrl: "", infoText: "" });
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.moduleId) {
            toast.error("Veuillez remplir les champs obligatoires");
            return;
        }

        try {
            // Use FormData for file upload
            const submitData = new FormData();
            submitData.append("name", formData.name);
            submitData.append("moduleId", formData.moduleId);
            submitData.append("infoText", formData.infoText || "");
            
            if (imageFile) {
                submitData.append("qcmImage", imageFile);
            }

            await api.post("/qcm-banque/create-with-image", submitData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            
            toast.success("QCM Banque créé avec succès");
            resetForm();
            fetchQCMList();
        } catch (err) {
            console.error("Error creating QCM Banque:", err);
            toast.error("Erreur lors de la création");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer ce QCM Banque ?")) return;

        try {
            await api.delete(`/qcm-banque/${id}`);
            toast.success("QCM Banque supprimé");
            fetchQCMList();
        } catch (err) {
            console.error("Error deleting QCM Banque:", err);
            toast.error("Erreur lors de la suppression");
        }
    };

    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedItems(new Set(currentQCMs.map(q => q.id)));
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
        
        if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedItems.size} QCM Banque ?`)) return;

        try {
            await Promise.all(
                Array.from(selectedItems).map(id => api.delete(`/qcm-banque/${id}`))
            );
            toast.success(`${selectedItems.size} QCM Banque supprimé(s) avec succès`);
            setSelectedItems(new Set());
            fetchQCMList();
        } catch (error) {
            console.error("Error bulk deleting QCM Banque:", error);
            toast.error("Erreur lors de la suppression groupée");
        }
    };

    const handleEdit = (qcm) => {
        // Find the module to get its semester for the form filter
        const module = modules.find(m => m._id === qcm.moduleId);
        if (module && module.semester) {
            setFormSemesterFilter(module.semester);
        }
        
        setFormData({
            name: qcm.name,
            moduleId: qcm.moduleId,
            imageUrl: qcm.imageUrl === placeholderImage ? "" : qcm.imageUrl,
            infoText: qcm.infoText || "",
        });
        
        // Set preview for existing image
        if (qcm.imageUrl && qcm.imageUrl !== placeholderImage) {
            setImagePreview(qcm.imageUrl);
        }
        
        setEditingQCM(qcm);
        setShowAddQCMForm(true);
    };

    const handleUpdate = async () => {
        if (!formData.name || !formData.moduleId) {
            toast.error("Veuillez remplir les champs obligatoires");
            return;
        }

        try {
            // Use FormData for file upload
            const submitData = new FormData();
            submitData.append("name", formData.name);
            submitData.append("moduleId", formData.moduleId);
            submitData.append("infoText", formData.infoText || "");
            
            if (imageFile) {
                submitData.append("qcmImage", imageFile);
            } else if (editingQCM.imageUrl && editingQCM.imageUrl !== placeholderImage) {
                // Preserve existing image URL if no new file is selected
                // Extract the relative path from the full URL
                const existingUrl = editingQCM.imageUrl.includes('/uploads/') 
                    ? editingQCM.imageUrl.substring(editingQCM.imageUrl.indexOf('/uploads/'))
                    : editingQCM.imageUrl;
                submitData.append("existingImageUrl", existingUrl);
            }

            await api.put(`/qcm-banque/update-with-image/${editingQCM.id}`, submitData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            
            toast.success("QCM Banque mis à jour avec succès");
            resetForm();
            fetchQCMList();
        } catch (err) {
            console.error("Error updating QCM Banque:", err);
            toast.error("Erreur lors de la mise à jour");
        }
    };

    const filteredQCMs = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return qcmList.filter((qcm) => {
            const passesModule = moduleFilter === "all" || qcm.moduleId === moduleFilter;
            // Check semester filter - find module and compare semester
            const qcmModule = modules.find(m => m._id === qcm.moduleId);
            const passesSemester = semesterFilter === "all" || (qcmModule && qcmModule.semester === semesterFilter);
            const passesSearch =
                qcm.name.toLowerCase().includes(term) ||
                qcm.moduleName.toLowerCase().includes(term) ||
                String(qcm.id).includes(term);
            return passesModule && passesSemester && passesSearch;
        });
    }, [searchTerm, moduleFilter, semesterFilter, qcmList, modules]);

    const totalPages = Math.ceil(filteredQCMs.length / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentQCMs = filteredQCMs.slice(startIndex, endIndex);

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

    if (loading) {
        return (
            <div className="min-h-screen bg-card flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-green-500 mx-auto mb-4" />
                    <p className="text-muted-foreground">Chargement des QCM Banque...</p>
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
                        className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center justify-between"
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
                        <h2 className="text-2xl font-bold text-black mb-1">QCM Banque</h2>
                        <p className="text-muted-foreground">Total: <span className="font-semibold text-black">{filteredQCMs.length}</span> QCM Banque</p>
                    </div>
                    <Button
                        size="lg"
                        className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
                        onClick={() => setShowAddQCMForm(true)}
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Créer QCM Banque
                    </Button>
                </motion.div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5" />
                            Répertoire des QCM Banque
                        </CardTitle>
                        <CardDescription>Gérer les banques de QCM par module</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                <Input type="text" placeholder="Rechercher par nom ou module..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
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
                        </div>

                        {error && <div className="text-sm text-red-600 p-3 bg-red-50 rounded-md">{error}</div>}

                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">
                                            <Checkbox
                                                checked={currentQCMs.length > 0 && selectedItems.size === currentQCMs.length}
                                                onCheckedChange={handleSelectAll}
                                            />
                                        </TableHead>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Module</TableHead>
                                        <TableHead>Nom du QCM</TableHead>
                                        <TableHead>Image</TableHead>
                                        <TableHead>
                                            <div className="flex items-center gap-1">
                                                <HelpCircle className="h-4 w-4" />
                                                Info
                                            </div>
                                        </TableHead>
                                        <TableHead>Questions</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {currentQCMs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                                Aucun QCM Banque trouvé
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        currentQCMs.map((qcm) => (
                                            <TableRow key={qcm.id}>
                                                <TableCell className="w-12">
                                                    <Checkbox
                                                        checked={selectedItems.has(qcm.id)}
                                                        onCheckedChange={(checked) => handleSelectItem(qcm.id, checked)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">{qcm.id?.slice(-6)}</TableCell>
                                                <TableCell className="font-medium">{qcm.moduleName}</TableCell>
                                                <TableCell className="font-medium">{qcm.name}</TableCell>
                                                <TableCell>
                                                    <div className="w-16 h-12 rounded-md overflow-hidden bg-muted border">
                                                        <img src={qcm.imageUrl} alt={qcm.name} className="w-full h-full object-cover" />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="max-w-xs truncate" title={qcm.infoText}>
                                                    {qcm.infoText || "—"}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">{qcm.totalQuestions}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                            onClick={() => {
                                                                setViewingQCM(qcm);
                                                                setShowViewDialog(true);
                                                            }}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                            onClick={() => handleEdit(qcm)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => handleDelete(qcm.id)}
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
                            Affichage de {filteredQCMs.length === 0 ? 0 : startIndex + 1} à {Math.min(endIndex, filteredQCMs.length)} sur {filteredQCMs.length} résultats
                        </div>
                        {renderPagination()}
                    </CardFooter>
                </Card>
            </div>

            {/* Add QCM Banque Dialog */}
            <AnimatePresence>
                {showAddQCMForm && (
                    <Dialog open={showAddQCMForm} onOpenChange={(open) => { if (!open) resetForm(); }}>
                        <DialogContent className="bg-card border-border text-black sm:max-w-lg max-h-[90vh] overflow-y-auto">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                            >
                                <DialogHeader>
                                    <DialogTitle className="text-black text-xl">
                                        {editingQCM ? "Modifier le QCM Banque" : "Créer un QCM Banque"}
                                    </DialogTitle>
                                    <DialogDescription className="text-muted-foreground">
                                        Ajouter un nouveau QCM Banque avec les détails nécessaires
                                    </DialogDescription>
                                </DialogHeader>

                                <form className="space-y-4 py-4" onSubmit={(e) => { e.preventDefault(); editingQCM ? handleUpdate() : handleSubmit(); }}>
                                    <div className="space-y-2">
                                        <Label className="text-black font-medium">Nom du QCM *</Label>
                                        <Input
                                            placeholder="Ex: Banque QCM Anatomie"
                                            value={formData.name}
                                            onChange={(e) => handleFormChange("name", e.target.value)}
                                            className="bg-background border-gray-300 text-black placeholder:text-muted-foreground focus:border-green-500 focus:ring-green-500"
                                        />
                                    </div>

                                    {/* Semester filter for module selection */}
                                    <div className="space-y-2">
                                        <Label className="text-black font-medium">Filtrer par semestre</Label>
                                        <Select value={formSemesterFilter} onValueChange={(value) => {
                                            setFormSemesterFilter(value);
                                            // Reset module selection when semester changes
                                            if (formData.moduleId) {
                                                const currentModule = modules.find(m => m._id === formData.moduleId);
                                                if (currentModule && value !== "all" && currentModule.semester !== value) {
                                                    handleFormChange("moduleId", "");
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
                                        <Select value={formData.moduleId} onValueChange={(value) => handleFormChange("moduleId", value)}>
                                            <SelectTrigger className="bg-background border-gray-300 text-black">
                                                <SelectValue placeholder="Sélectionner un module" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-card border-border">
                                                {modules
                                                    .filter(m => formSemesterFilter === "all" || m.semester === formSemesterFilter)
                                                    .map((m) => (
                                                        <SelectItem key={m._id} value={m._id} className="text-black">
                                                            {m.name} {m.semester ? `(${m.semester})` : ""}
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

                                    {/* Image upload section */}
                                    <div className="space-y-2">
                                        <Label className="text-black font-medium">Image du QCM</Label>
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
                                        <Label className="text-black font-medium">Texte d'aide (optionnel)</Label>
                                        <textarea
                                            placeholder="Entrez une description ou des informations supplémentaires..."
                                            value={formData.infoText}
                                            onChange={(e) => handleFormChange("infoText", e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-background text-black placeholder:text-muted-foreground focus:border-green-500 focus:ring-green-500 min-h-[80px] resize-none"
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
                                                className={editingQCM ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"}
                                            >
                                                {editingQCM ? "Mettre à jour" : "Créer QCM Banque"}
                                            </Button>
                                        </motion.div>
                                    </DialogFooter>
                                </form>
                            </motion.div>
                        </DialogContent>
                    </Dialog>
                )}

                {/* View Dialog */}
                {showViewDialog && viewingQCM && (
                    <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
                        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Détails du QCM</DialogTitle>
                                <DialogDescription>Informations complètes du QCM</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-foreground">Nom du QCM</Label>
                                    <p className="text-foreground bg-background p-2 rounded border">{viewingQCM.name}</p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-foreground">Module</Label>
                                    <p className="text-foreground bg-background p-2 rounded border">{viewingQCM.moduleName}</p>
                                </div>
                                {viewingQCM.imageUrl && (
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-foreground">Image</Label>
                                        <img src={viewingQCM.imageUrl} alt={viewingQCM.name} className="w-full h-32 object-cover rounded border" />
                                    </div>
                                )}
                                {viewingQCM.helpText && (
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-foreground">Texte d'aide</Label>
                                        <p className="text-foreground bg-background p-2 rounded border">{viewingQCM.helpText}</p>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-foreground">Total Questions</Label>
                                    <p className="text-foreground bg-background p-2 rounded border">{viewingQCM.totalQuestions}</p>
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

export default QCMBanque;
