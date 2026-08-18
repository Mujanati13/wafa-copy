import React, { useMemo, useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Upload, FileText, Database, FolderOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/utils";
import { cryptoCompat } from "@/lib/cryptoCompat";

const ImportQCMBanque = () => {
  const { t } = useTranslation(['admin', 'common']);

  const [modules, setModules] = useState([]);
  const [qcmBanques, setQcmBanques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedModule, setSelectedModule] = useState("");
  const [selectedQCMBanque, setSelectedQCMBanque] = useState("");
  const [excelFile, setExcelFile] = useState(null);
  const [importingExcel, setImportingExcel] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const semesters = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10"];

  // Filter modules by selected semester
  const filteredModules = selectedSemester
    ? modules.filter(m => m.semester === selectedSemester)
    : modules;

  // Fetch modules on mount
  useEffect(() => {
    const fetchModules = async () => {
      try {
        setLoading(true);
        const response = await api.get("/modules");
        setModules(response.data?.data || []);
      } catch (error) {
        console.error('Error fetching modules:', error);
        toast.error('Erreur lors du chargement des modules');
      } finally {
        setLoading(false);
      }
    };
    fetchModules();
  }, []);

  // Fetch QCM Banques when module changes
  useEffect(() => {
    const fetchQCMBanques = async () => {
      if (!selectedModule) {
        setQcmBanques([]);
        return;
      }
      try {
        const response = await api.get("/qcm-banque/all");
        const allQCM = response.data?.data || [];
        // Filter by module
        const filtered = allQCM.filter(q => 
          (q.moduleId?._id || q.moduleId) === selectedModule
        );
        setQcmBanques(filtered);
      } catch (error) {
        console.error('Error fetching QCM Banques:', error);
      }
    };
    fetchQCMBanques();
    setSelectedQCMBanque("");
  }, [selectedModule]);

  // Image mappings
  const [imageMappings, setImageMappings] = useState([
    { id: cryptoCompat.randomUUID(), file: null, questionNumbers: "" },
  ]);

  // Category mappings for questions (sessions)
  const [categoryMappings, setCategoryMappings] = useState([
    { id: cryptoCompat.randomUUID(), category: "", questionNumbers: "" },
  ]);

  const handleAddImageRow = () =>
    setImageMappings((prev) => [
      ...prev,
      { id: cryptoCompat.randomUUID(), file: null, questionNumbers: "" },
    ]);

  const handleRemoveImageRow = (id) =>
    setImageMappings((prev) => prev.filter((r) => r.id !== id));

  const handleAddCategoryRow = () =>
    setCategoryMappings((prev) => [
      ...prev,
      { id: cryptoCompat.randomUUID(), category: "", questionNumbers: "" },
    ]);

  const handleRemoveCategoryRow = (id) =>
    setCategoryMappings((prev) => prev.filter((r) => r.id !== id));

  const canImportExcel = selectedModule && selectedQCMBanque && excelFile;

  // Handle Excel import
  const handleImportExcel = async () => {
    if (!selectedQCMBanque || !excelFile) {
      toast.error("Veuillez sélectionner une QCM Banque et un fichier Excel");
      return;
    }

    try {
      setImportingExcel(true);
      
      const formData = new FormData();
      formData.append('qcmBanqueId', selectedQCMBanque);
      formData.append('file', excelFile);
      formData.append('type', 'qcm-banque');

      await api.post('/questions/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success("Questions importées avec succès");
      setExcelFile(null);
    } catch (error) {
      console.error("Error importing Excel:", error);
      toast.error(error.response?.data?.message || "Erreur lors de l'import");
    } finally {
      setImportingExcel(false);
    }
  };

  // Handle images upload
  const handleUploadImages = async () => {
    if (!selectedQCMBanque) {
      toast.error("Veuillez sélectionner une QCM Banque");
      return;
    }

    const validImageMappings = imageMappings.filter(
      (m) => m.file && m.questionNumbers.trim()
    );

    if (validImageMappings.length === 0) {
      toast.info("Veuillez ajouter au moins une image avec des numéros de questions");
      return;
    }

    try {
      setUploading(true);

      for (const mapping of validImageMappings) {
        const imgFormData = new FormData();
        imgFormData.append('images', mapping.file);

        const uploadRes = await api.post('/questions/upload-images', imgFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (uploadRes.data.success) {
          const imageUrls = uploadRes.data.data.map(img => img.url);
          await api.post('/questions/attach-images', {
            qcmBanqueId: selectedQCMBanque,
            imageUrls,
            questionNumbers: mapping.questionNumbers
          });
        }
      }

      toast.success(`${validImageMappings.length} image(s) téléchargée(s) et attachée(s)`);
      setImageMappings([{ id: cryptoCompat.randomUUID(), file: null, questionNumbers: "" }]);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Erreur lors du téléchargement');
    } finally {
      setUploading(false);
    }
  };

  // Handle category (session) assignment
  const handleAssignCategories = async () => {
    if (!selectedQCMBanque) {
      toast.error("Veuillez sélectionner une QCM Banque");
      return;
    }

    const validCategoryMappings = categoryMappings.filter(
      (m) => m.category.trim() && m.questionNumbers.trim()
    );

    if (validCategoryMappings.length === 0) {
      toast.info("Veuillez ajouter au moins une catégorie avec des numéros de questions");
      return;
    }

    try {
      setUploading(true);

      await api.post("/questions/assign-submodules", {
        qcmBanqueId: selectedQCMBanque,
        subModules: validCategoryMappings.map(m => ({
          name: m.category,
          questionNumbers: m.questionNumbers
        }))
      });

      toast.success(`${validCategoryMappings.length} catégorie(s) assignée(s)`);
      setCategoryMappings([{ id: cryptoCompat.randomUUID(), category: "", questionNumbers: "" }]);
    } catch (error) {
      console.error('Assignment error:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de l\'assignation');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-card">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Importer QCM Banque</h2>
            <p className="text-muted-foreground">Importez des questions pour la banque de QCM depuis un fichier Excel</p>
          </div>
          <Database className="w-10 h-10 text-blue-600" />
        </div>

        {/* Source Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b">
              <CardTitle className="flex items-center gap-2 text-emerald-900">
                <Upload className="w-5 h-5" />
                Source d'Importation
              </CardTitle>
              <CardDescription>
                Sélectionnez le module, puis la QCM Banque, et enfin téléchargez le fichier Excel
              </CardDescription>
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs font-medium text-blue-800 mb-2">📋 Format Excel attendu:</p>
                <div className="text-xs text-blue-700 space-y-1">
                  <p><strong>Colonnes:</strong> Question | A | B | C | D | answer</p>
                  <p><strong>answer:</strong> Texte de la bonne réponse (séparer par virgule si plusieurs réponses correctes)</p>
                  <p><strong>Exemple:</strong> Si la réponse correcte est dans la colonne A, mettez le texte de A dans "answer"</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Semester Selection */}
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="space-y-2"
                >
                  <Label className="font-semibold text-foreground">Semestre</Label>
                  <Select
                    value={selectedSemester}
                    onValueChange={(value) => {
                      setSelectedSemester(value);
                      setSelectedModule("");
                      setSelectedQCMBanque("");
                    }}
                  >
                    <SelectTrigger className="border-emerald-200">
                      <SelectValue placeholder="Choisir un semestre" />
                    </SelectTrigger>
                    <SelectContent>
                      {semesters.map((sem) => (
                        <SelectItem key={sem} value={sem}>
                          {sem}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </motion.div>

                {/* Module Selection */}
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.15 }}
                  className="space-y-2"
                >
                  <Label className="font-semibold text-foreground">Module</Label>
                  <Select
                    value={selectedModule}
                    onValueChange={setSelectedModule}
                    disabled={!selectedSemester || loading}
                  >
                    <SelectTrigger className="border-emerald-200">
                      <SelectValue placeholder={loading ? "Chargement..." : "Choisir un module"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredModules.length === 0 ? (
                        <SelectItem value="none" disabled>
                          Aucun module pour ce semestre
                        </SelectItem>
                      ) : (
                        filteredModules.map((m) => (
                          <SelectItem key={m._id} value={m._id}>
                            {m.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </motion.div>

                {/* QCM Banque Selection */}
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="space-y-2"
                >
                  <Label className="font-semibold text-foreground">QCM Banque</Label>
                  <Select
                    value={selectedQCMBanque}
                    onValueChange={setSelectedQCMBanque}
                    disabled={!selectedModule || qcmBanques.length === 0}
                  >
                    <SelectTrigger className="border-emerald-200">
                      <SelectValue placeholder={!selectedModule ? "Sélectionnez un module d'abord" : "Choisir une QCM Banque"} />
                    </SelectTrigger>
                    <SelectContent>
                      {qcmBanques.length === 0 ? (
                        <SelectItem value="none" disabled>
                          Aucune QCM Banque pour ce module
                        </SelectItem>
                      ) : (
                        qcmBanques.map((q) => (
                          <SelectItem key={q._id} value={q._id}>
                            {q.name || q.title}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </motion.div>

                {/* Excel File */}
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.25 }}
                  className="space-y-2"
                >
                  <Label className="font-semibold text-foreground">Fichier Excel</Label>
                  <div className="relative">
                    <Input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                      className="border-emerald-200"
                    />
                    {excelFile && (
                      <Badge className="absolute right-2 top-1/2 -translate-y-1/2 bg-green-100 text-green-800 border-0">
                        <FileText className="w-3 h-3 mr-1" />
                        {excelFile.name}
                      </Badge>
                    )}
                  </div>
                </motion.div>
              </div>
            </CardContent>
            <CardFooter className="bg-background border-t flex justify-end">
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                disabled={!canImportExcel || importingExcel}
                onClick={handleImportExcel}
              >
                {importingExcel ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {importingExcel ? 'Import en cours...' : 'Importer Excel'}
              </Button>
            </CardFooter>
          </Card>
        </motion.div>

        {/* Optional Mappings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50 border-b">
              <CardTitle className="flex items-center gap-2 text-teal-900">
                <FileText className="w-5 h-5" />
                Actions Supplémentaires
              </CardTitle>
              <CardDescription>
                Associez les images aux questions ou organisez les questions par catégorie
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Images */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-teal-50 rounded-lg">
                    <Plus className="w-5 h-5 text-teal-600" />
                    <h3 className="font-semibold text-foreground">Ajouter des Images</h3>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {imageMappings.map((row, idx) => (
                      <motion.div
                        key={row.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: idx * 0.05 }}
                        className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end p-3 bg-background rounded-lg border border-border"
                      >
                        <div className="sm:col-span-2 space-y-1">
                          <Label className="text-xs font-semibold">Image</Label>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setImageMappings((prev) =>
                                prev.map((r) =>
                                  r.id === row.id ? { ...r, file } : r
                                )
                              );
                            }}
                            className="text-xs"
                          />
                        </div>
                        <div className="sm:col-span-2 space-y-1">
                          <Label className="text-xs font-semibold">Questions</Label>
                          <Input
                            placeholder="ex: 1,2,5-7"
                            value={row.questionNumbers}
                            onChange={(e) =>
                              setImageMappings((prev) =>
                                prev.map((r) =>
                                  r.id === row.id
                                    ? { ...r, questionNumbers: e.target.value }
                                    : r
                                )
                              )
                            }
                            className="text-xs"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveImageRow(row.id)}
                          disabled={imageMappings.length === 1}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleAddImageRow}
                    className="w-full gap-2 border-teal-200 text-teal-600 hover:bg-teal-50"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter une Ligne d'Image
                  </Button>
                </div>

                {/* Right: Categories */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-cyan-50 rounded-lg">
                    <FolderOpen className="w-5 h-5 text-cyan-600" />
                    <h3 className="font-semibold text-foreground">Organiser par Catégorie</h3>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {categoryMappings.map((row, idx) => (
                      <motion.div
                        key={row.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: idx * 0.05 }}
                        className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end p-3 bg-background rounded-lg border border-border"
                      >
                        <div className="sm:col-span-2 space-y-1">
                          <Label className="text-xs font-semibold">Catégorie</Label>
                          <Input
                            placeholder="Nom de la catégorie"
                            value={row.category}
                            onChange={(e) =>
                              setCategoryMappings((prev) =>
                                prev.map((r) =>
                                  r.id === row.id ? { ...r, category: e.target.value } : r
                                )
                              )
                            }
                            className="text-xs"
                          />
                        </div>
                        <div className="sm:col-span-2 space-y-1">
                          <Label className="text-xs font-semibold">Numéros de Questions</Label>
                          <Input
                            placeholder="ex: 10-15,22"
                            value={row.questionNumbers}
                            onChange={(e) =>
                              setCategoryMappings((prev) =>
                                prev.map((r) =>
                                  r.id === row.id
                                    ? { ...r, questionNumbers: e.target.value }
                                    : r
                                )
                              )
                            }
                            className="text-xs"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveCategoryRow(row.id)}
                          disabled={categoryMappings.length === 1}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleAddCategoryRow}
                    className="w-full gap-2 border-cyan-200 text-cyan-600 hover:bg-cyan-50"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter une Catégorie
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-background border-t flex justify-end gap-3">
              <Button
                variant="outline"
                className="gap-2 border-teal-200 text-teal-600 hover:bg-teal-50"
                disabled={uploading || !selectedQCMBanque}
                onClick={handleUploadImages}
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Télécharger Images
              </Button>
              <Button
                className="bg-cyan-600 hover:bg-cyan-700 gap-2"
                disabled={uploading || !selectedQCMBanque}
                onClick={handleAssignCategories}
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FolderOpen className="w-4 h-4" />
                )}
                Assigner Catégories
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default ImportQCMBanque;
