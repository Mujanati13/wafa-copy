import React, { useState, useEffect } from "react";
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
import { Plus, Trash2, Upload, FileText, Calendar, Loader2 } from "lucide-react";
import { api } from "@/lib/utils";
import { cryptoCompat } from "@/lib/cryptoCompat";
import { toast } from "sonner";

const ImportExamParYears = () => {
  const { t } = useTranslation(['admin', 'common']);
  const [modules, setModules] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState("");
  
  const semesters = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10"];

  useEffect(() => {
    fetchModules();
    fetchExams();
  }, []);

  const fetchModules = async () => {
    try {
      const { data } = await api.get("/modules");
      setModules(data?.data || []);
    } catch (err) {
      console.error("Error fetching modules:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExams = async () => {
    try {
      const { data } = await api.get("/exams/all");
      setExams(data?.data || []);
    } catch (err) {
      console.error("Error fetching exams:", err);
    }
  };

  const [selectedModule, setSelectedModule] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [excelFile, setExcelFile] = useState(null);
  const [sessionName, setSessionName] = useState("");

  // Filter modules by selected semester
  const filteredModules = selectedSemester
    ? modules.filter(m => m.semester === selectedSemester)
    : modules;

  // Left column: images attachment to question numbers
  const [imageMappings, setImageMappings] = useState([
    { id: cryptoCompat.randomUUID(), file: null, questionNumbers: "" },
  ]);

  // Right column: integrate questions into a sub module
  const [subModuleMappings, setSubModuleMappings] = useState([
    { id: cryptoCompat.randomUUID(), name: "", questionNumbers: "" },
  ]);

  const handleAddImageRow = () =>
    setImageMappings((prev) => [
      ...prev,
      { id: cryptoCompat.randomUUID(), file: null, questionNumbers: "" },
    ]);

  const handleRemoveImageRow = (id) =>
    setImageMappings((prev) => prev.filter((r) => r.id !== id));

  const handleAddSubModuleRow = () =>
    setSubModuleMappings((prev) => [
      ...prev,
      { id: cryptoCompat.randomUUID(), name: "", questionNumbers: "" },
    ]);

  const handleRemoveSubModuleRow = (id) =>
    setSubModuleMappings((prev) => prev.filter((r) => r.id !== id));

  const [uploading, setUploading] = useState(false);
  const [importingExcel, setImportingExcel] = useState(false);

  // Allow import with just exam selected (images don't require Excel file)
  const canImportExcel = selectedModule && selectedExam && excelFile;
  const canImportImages = selectedModule && selectedExam;

  // Handle Excel import
  const handleImportExcel = async () => {
    if (!selectedExam || !excelFile) {
      toast.error("Veuillez sélectionner un examen et un fichier Excel");
      return;
    }

    try {
      setImportingExcel(true);
      
      const formData = new FormData();
      formData.append('examId', selectedExam);
      formData.append('file', excelFile);
      formData.append('type', 'exam-par-year');
      if (sessionName.trim()) {
        formData.append('sessionName', sessionName.trim());
      }

      // Don't set Content-Type manually - axios handles it for FormData
      await api.post('/questions/import', formData);

      toast.success("Questions importées avec succès");
      setExcelFile(null);
      setSessionName("");
    } catch (error) {
      console.error("Error importing Excel:", error);
      toast.error(error.response?.data?.message || "Erreur lors de l'import");
    } finally {
      setImportingExcel(false);
    }
  };

  // Handle images upload separately
  const handleUploadImages = async () => {
    if (!selectedExam) {
      toast.error("Veuillez sélectionner un examen");
      return;
    }

    // Check if we have any images to upload
    const validImageMappings = imageMappings.filter(
      (m) => m.file && m.questionNumbers.trim()
    );

    if (validImageMappings.length === 0) {
      toast.info("Veuillez ajouter au moins une image avec des numéros de questions");
      return;
    }

    try {
      setUploading(true);

      // Process each image mapping
      for (const mapping of validImageMappings) {
        // 1. Upload image to local storage
        const formData = new FormData();
        formData.append("images", mapping.file);

        // Don't set Content-Type manually - axios handles it for FormData
        const uploadRes = await api.post("/questions/upload-images", formData);

        if (!uploadRes.data.success) {
          throw new Error("Échec du téléchargement de l'image");
        }

        const imageUrls = uploadRes.data.data.map((img) => img.url);

        // 2. Attach images to questions
        await api.post("/questions/attach-images", {
          examId: selectedExam,
          imageUrls,
          questionNumbers: mapping.questionNumbers,
        });
      }

      toast.success(`${validImageMappings.length} image(s) téléchargée(s) et attachée(s)`);

      // Reset image mappings
      setImageMappings([
        { id: cryptoCompat.randomUUID(), file: null, questionNumbers: "" },
      ]);
    } catch (error) {
      console.error("Error uploading images:", error);
      toast.error(error.response?.data?.message || "Erreur lors du téléchargement");
    } finally {
      setUploading(false);
    }
  };

  // Handle sub-module assignment
  const handleAssignSubModules = async () => {
    if (!selectedExam) {
      toast.error("Veuillez sélectionner un examen");
      return;
    }

    const validSubModuleMappings = subModuleMappings.filter(
      (m) => m.name.trim() && m.questionNumbers.trim()
    );

    if (validSubModuleMappings.length === 0) {
      toast.info("Veuillez ajouter au moins un sous-module avec des numéros de questions");
      return;
    }

    try {
      setUploading(true);

      await api.post("/questions/assign-submodules", {
        examId: selectedExam,
        subModules: validSubModuleMappings.map(m => ({
          name: m.name,
          questionNumbers: m.questionNumbers
        }))
      });

      toast.success(`${validSubModuleMappings.length} sous-module(s) assigné(s)`);

      // Reset sub-module mappings
      setSubModuleMappings([
        { id: cryptoCompat.randomUUID(), name: "", questionNumbers: "" },
      ]);
    } catch (error) {
      console.error("Error assigning sub-modules:", error);
      toast.error(error.response?.data?.message || "Erreur lors de l'assignation");
    } finally {
      setUploading(false);
    }
  };

  // Filter exams by selected module
  const examOptions = selectedModule
    ? exams.filter(e => (e.moduleId?._id || e.moduleId) === selectedModule || e.moduleName === modules.find(m => m._id === selectedModule)?.name)
    : [];

  return (
    <div className="min-h-screen bg-card">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Importer Examens par Années</h2>
            <p className="text-muted-foreground">Importez les questions depuis un fichier Excel</p>
          </div>
          <Calendar className="w-10 h-10 text-blue-600" />
        </div>

        {/* Source Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
              <CardTitle className="flex items-center gap-2 text-indigo-900">
                <Upload className="w-5 h-5" />
                Source d'Importation
              </CardTitle>
              <CardDescription>
                Sélectionnez le module, l'examen par année, puis téléchargez le fichier Excel
              </CardDescription>
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs font-medium text-blue-800 mb-2">📋 Format Excel attendu:</p>
                <div className="text-xs text-blue-700 space-y-1">
                  <p><strong>Colonnes:</strong> qst Num | Question | A | B | C | D | answer</p>
                  <p><strong>qst Num:</strong> Numéro de la question (1, 2, 3, ...)</p>
                  <p><strong>answer:</strong> Texte de la bonne réponse (séparer par virgule si plusieurs réponses correctes)</p>
                  <p><strong>Exemple:</strong> Si la réponse correcte est dans la colonne A, mettez le texte de A dans "answer"</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                      setSelectedExam("");
                    }}
                  >
                    <SelectTrigger className="border-indigo-200">
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

                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.15 }}
                  className="space-y-2"
                >
                  <Label className="font-semibold text-foreground">Module</Label>
                  <Select
                    value={selectedModule}
                    onValueChange={(value) => {
                      setSelectedModule(value);
                      setSelectedExam("");
                    }}
                    disabled={!selectedSemester}
                  >
                    <SelectTrigger className="border-indigo-200">
                      <SelectValue placeholder="Choisir un module" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredModules.map((m) => (
                        <SelectItem key={m._id} value={m._id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="space-y-2"
                >
                  <Label className="font-semibold text-foreground">Examen par Année</Label>
                  <select
                    value={selectedExam}
                    onChange={(event) => setSelectedExam(event.target.value)}
                    disabled={!selectedModule}
                    aria-label="Examen par Année"
                    className="h-9 w-full rounded-md border border-indigo-200 bg-background px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="" disabled>
                      {!selectedModule
                        ? "Sélectionnez d'abord un module"
                        : examOptions.length > 0
                          ? "Choisir un examen"
                          : "Aucun examen disponible"}
                    </option>
                    {examOptions.map((ex) => (
                      <option key={ex._id} value={ex._id}>
                        {ex.name}
                      </option>
                    ))}
                  </select>
                </motion.div>

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
                      className="border-indigo-200"
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

              {/* Session Name Input */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="mt-4 space-y-2"
              >
                <Label className="font-semibold text-foreground">
                  Nom de la session (optionnel)
                </Label>
                <Input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="Ex: Session Principale, Rattrapage 2024, etc."
                  className="border-indigo-200"
                  disabled={!selectedExam}
                />
                <p className="text-xs text-muted-foreground">
                  Si spécifié, toutes les questions importées seront groupées sous ce nom de session. 
                  Sinon, elles seront groupées sous le nom de l'examen par défaut.
                </p>
              </motion.div>
            </CardContent>
            <CardFooter className="bg-background border-t flex justify-end">
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 gap-2"
                disabled={!canImportExcel || importingExcel}
                onClick={handleImportExcel}
              >
                {importingExcel ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {importingExcel ? "Import en cours..." : "Importer Excel"}
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
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
              <CardTitle className="flex items-center gap-2 text-purple-900">
                <FileText className="w-5 h-5" />
                Mappages Optionnels
              </CardTitle>
              <CardDescription>
                Associez les images aux questions ou intégrez les questions dans des sous-modules
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Images */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
                    <Plus className="w-5 h-5 text-purple-600" />
                    <h3 className="font-semibold text-foreground">Ajouter des Images</h3>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {imageMappings.map((row, idx) => (
                      <motion.div
                        key={row.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: idx * 0.05 }}
                        className="p-3 bg-background rounded-lg border border-border"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
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
                        </div>
                        {/* Image Preview */}
                        {row.file && (
                          <div className="mt-2 flex items-center gap-2 p-2 bg-card rounded border">
                            <img
                              src={URL.createObjectURL(row.file)}
                              alt="Preview"
                              className="w-12 h-12 object-cover rounded"
                            />
                            <div className="text-xs text-muted-foreground">
                              <p className="font-medium truncate max-w-32">{row.file.name}</p>
                              <p>{(row.file.size / 1024).toFixed(1)} KB</p>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleAddImageRow}
                      className="flex-1 gap-2 border-purple-200 text-purple-600 hover:bg-purple-50"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter
                    </Button>
                    <Button
                      onClick={handleUploadImages}
                      disabled={uploading || !selectedExam || !imageMappings.some(m => m.file && m.questionNumbers.trim())}
                      className="flex-1 gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {uploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {uploading ? "Téléchargement..." : "Télécharger Images"}
                    </Button>
                  </div>
                </div>

                {/* Right: Sub-modules */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-pink-50 rounded-lg">
                    <Plus className="w-5 h-5 text-pink-600" />
                    <h3 className="font-semibold text-foreground">Intégrer dans Sous-modules</h3>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {subModuleMappings.map((row, idx) => (
                      <motion.div
                        key={row.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: idx * 0.05 }}
                        className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end p-3 bg-background rounded-lg border border-border"
                      >
                        <div className="sm:col-span-2 space-y-1">
                          <Label className="text-xs font-semibold">Nom du Sous-module</Label>
                          <Input
                            placeholder="ex: Cardiologie"
                            value={row.name}
                            onChange={(e) =>
                              setSubModuleMappings((prev) =>
                                prev.map((r) =>
                                  r.id === row.id
                                    ? { ...r, name: e.target.value }
                                    : r
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
                              setSubModuleMappings((prev) =>
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
                          onClick={() => handleRemoveSubModuleRow(row.id)}
                          disabled={subModuleMappings.length === 1}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleAddSubModuleRow}
                    className="w-full gap-2 border-pink-200 text-pink-600 hover:bg-pink-50"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter un Sous-module
                  </Button>
                  <Button
                    onClick={handleAssignSubModules}
                    disabled={uploading || !selectedExam || !subModuleMappings.some(m => m.name.trim() && m.questionNumbers.trim())}
                    className="w-full gap-2 bg-pink-600 hover:bg-pink-700 text-white"
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    Assigner Sous-modules
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default ImportExamParYears;
