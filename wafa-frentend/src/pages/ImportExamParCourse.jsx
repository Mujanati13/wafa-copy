import React, { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from "framer-motion";
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
import {
  Plus,
  Trash2,
  Link,
  BookOpen,
  ChevronRight,
  ChevronDown,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  Upload,
  ImageIcon,
  FileText,
  Layers,
  Search,
  Filter
} from "lucide-react";
import { toast } from "sonner";
import { cryptoCompat } from "@/lib/cryptoCompat";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, cn } from "@/lib/utils";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const ImportExamParCourse = () => {
  const { t } = useTranslation(['admin', 'common']);

  // State for modules and courses
  const [modules, setModules] = useState([]);
  const [examCourses, setExamCourses] = useState([]);
  const [examYears, setExamYears] = useState([]);
  const [selectedExamQuestions, setSelectedExamQuestions] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState("");
  
  // Search and filter for courses
  const [courseSearch, setCourseSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedCourses, setExpandedCourses] = useState(new Set());
  
  const semesters = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10"];

  // Loading states
  const [loadingModules, setLoadingModules] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingExamYears, setLoadingExamYears] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [linking, setLinking] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Selection state
  const [selectedModule, setSelectedModule] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");

  // Filter modules by selected semester
  const filteredModules = selectedSemester
    ? modules.filter(m => m.semester === selectedSemester)
    : modules;

  // Get unique categories from courses
  const courseCategories = [...new Set(examCourses.map(c => c.category).filter(Boolean))];
  
  // Filter courses by search and category
  const filteredCourses = examCourses.filter(course => {
    const matchesSearch = !courseSearch || 
      course.name?.toLowerCase().includes(courseSearch.toLowerCase()) ||
      course.category?.toLowerCase().includes(courseSearch.toLowerCase());
    const matchesCategory = selectedCategory === "all" || course.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group filtered courses by category
  const coursesByCategory = filteredCourses.reduce((acc, course) => {
    const category = course.category || "Sans catégorie";
    if (!acc[category]) acc[category] = [];
    acc[category].push(course);
    return acc;
  }, {});

  // Dialog for viewing questions
  const [showQuestionsDialog, setShowQuestionsDialog] = useState(false);

  // Question linking mappings
  const [yearMappings, setYearMappings] = useState([
    { id: cryptoCompat.randomUUID(), examYearId: "", yearName: "", questionNumbers: "" },
  ]);

  // Image mappings for attaching images to linked questions
  const [imageMappings, setImageMappings] = useState([
    { id: cryptoCompat.randomUUID(), file: null, questionNumbers: "" },
  ]);

  const handleAddImageRow = () =>
    setImageMappings((prev) => [
      ...prev,
      { id: cryptoCompat.randomUUID(), file: null, questionNumbers: "" },
    ]);

  const handleRemoveImageRow = (id) =>
    setImageMappings((prev) => prev.filter((r) => r.id !== id));

  // Handle image upload for course questions  
  const handleUploadImages = async () => {
    const validMappings = imageMappings.filter(
      (m) => m.file && m.questionNumbers.trim()
    );

    if (validMappings.length === 0) {
      toast.info("Aucune image à télécharger");
      return;
    }

    // We need to find the linked exam to attach images
    const validYearMappings = yearMappings.filter(
      m => m.examYearId && m.questionNumbers.trim()
    );

    if (validYearMappings.length === 0) {
      toast.error("Veuillez d'abord lier des questions à un examen");
      return;
    }

    try {
      setUploading(true);

      for (const mapping of validMappings) {
        // 1. Upload image to local storage
        const formData = new FormData();
        formData.append("images", mapping.file);

        const uploadRes = await axios.post(`${API_URL}/questions/upload-images`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true,
        });

        if (!uploadRes.data.success) {
          throw new Error("Échec du téléchargement de l'image");
        }

        const imageUrls = uploadRes.data.data.map((img) => img.url);

        // 2. Attach images to questions for the first exam year mapping
        await axios.post(`${API_URL}/questions/attach-images`, {
          examId: validYearMappings[0].examYearId,
          imageUrls,
          questionNumbers: mapping.questionNumbers,
        }, { withCredentials: true });
      }

      toast.success(`${validMappings.length} image(s) téléchargée(s) et attachée(s)`);
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

  // Fetch modules on mount
  useEffect(() => {
    fetchModules();
  }, []);

  // Fetch courses and exam years when module changes
  useEffect(() => {
    if (selectedModule) {
      fetchCoursesForModule(selectedModule);
      fetchExamYearsForModule(selectedModule);
    } else {
      setExamCourses([]);
      setExamYears([]);
    }
    setSelectedCourse("");
    setCourseSearch("");
    setSelectedCategory("all");
    setExpandedCourses(new Set());
  }, [selectedModule]);

  const fetchModules = async () => {
    try {
      setLoadingModules(true);
      const response = await axios.get(`${API_URL}/modules`, {
        withCredentials: true,
      });
      if (response.data.success) {
        setModules(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching modules:", error);
      toast.error("Erreur lors du chargement des modules");
    } finally {
      setLoadingModules(false);
    }
  };

  const fetchCoursesForModule = async (moduleId) => {
    try {
      setLoadingCourses(true);
      const response = await api.get(`/exam-courses/module/${moduleId}`);
      if (response.data.success) {
        setExamCourses(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
      setExamCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  };

  const fetchExamYearsForModule = async (moduleId) => {
    try {
      setLoadingExamYears(true);
      const response = await axios.get(`${API_URL}/exams/all`, {
        withCredentials: true,
      });
      if (response.data.success) {
        // Filter exams by moduleId on the client side
        const allExams = response.data.data || [];
        const filtered = allExams.filter(exam => {
          const examModuleId = exam.moduleId?._id || exam.moduleId;
          return examModuleId === moduleId;
        });
        setExamYears(filtered);
      }
    } catch (error) {
      console.error("Error fetching exam years:", error);
      setExamYears([]);
    } finally {
      setLoadingExamYears(false);
    }
  };

  const fetchQuestionsForExam = async (examId) => {
    try {
      setLoadingQuestions(true);
      const response = await axios.get(`${API_URL}/questions/exam/${examId}`, {
        withCredentials: true,
      });
      if (response.data.success) {
        setSelectedExamQuestions(response.data.data || []);
        setShowQuestionsDialog(true);
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
      toast.error("Erreur lors du chargement des questions");
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleAddYearRow = () =>
    setYearMappings((prev) => [
      ...prev,
      { id: cryptoCompat.randomUUID(), examYearId: "", yearName: "", questionNumbers: "" },
    ]);

  const handleRemoveYearRow = (id) =>
    setYearMappings((prev) => prev.filter((r) => r.id !== id));

  const handleYearMappingChange = (id, field, value) => {
    setYearMappings((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const updated = { ...r, [field]: value };
          if (field === "examYearId") {
            const examYear = examYears.find(e => e._id === value);
            if (examYear) {
              updated.yearName = `${examYear.name} (${examYear.year})`;
            }
          }
          return updated;
        }
        return r;
      })
    );
  };

  const handleViewQuestions = (examYearId) => {
    if (examYearId) {
      fetchQuestionsForExam(examYearId);
    }
  };

  const handleLinkQuestions = async () => {
    if (!selectedCourse) {
      toast.error("Veuillez sélectionner un cours");
      return;
    }

    const validMappings = yearMappings.filter(
      m => m.examYearId && m.questionNumbers.trim()
    );

    if (validMappings.length === 0) {
      toast.error("Veuillez ajouter au moins une intégration avec des numéros de questions");
      return;
    }

    try {
      setLinking(true);
      const response = await axios.post(
        `${API_URL}/exam-courses/${selectedCourse}/link-questions`,
        {
          questionLinks: validMappings.map(m => ({
            examParYearId: m.examYearId,
            questionNumbers: m.questionNumbers,
            yearName: m.yearName,
          })),
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        toast.success(response.data.message);
        setYearMappings([
          { id: cryptoCompat.randomUUID(), examYearId: "", yearName: "", questionNumbers: "" },
        ]);
        // Refresh courses to get updated question counts
        if (selectedModule) {
          fetchCoursesForModule(selectedModule);
        }
      }
    } catch (error) {
      console.error("Error linking questions:", error);
      toast.error(error.response?.data?.message || "Erreur lors de la liaison des questions");
    } finally {
      setLinking(false);
    }
  };

  const canLink = selectedModule && selectedCourse && yearMappings.some(
    m => m.examYearId && m.questionNumbers.trim()
  );

  return (
    <div className="min-h-screen bg-card">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Lier Questions aux Cours</h2>
            <p className="text-muted-foreground">Liez les questions des examens par années aux cours thématiques</p>
          </div>
          <Link className="w-10 h-10 text-blue-600" />
        </div>

        {/* Selection Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-rose-50 to-orange-50 border-b">
              <CardTitle className="flex items-center gap-2 text-rose-900">
                <BookOpen className="w-5 h-5" />
                Sélection du Cours
              </CardTitle>
              <CardDescription>
                Sélectionnez le module et le cours auquel vous souhaitez lier des questions
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Semester Select */}
                <div className="space-y-2">
                  <Label className="font-semibold text-foreground flex items-center gap-1">
                    <span className="text-blue-600">●</span> Semestre
                  </Label>
                  <Select
                    value={selectedSemester}
                    onValueChange={(value) => {
                      setSelectedSemester(value);
                      setSelectedModule("");
                      setSelectedCourse("");
                    }}
                  >
                    <SelectTrigger className="border-rose-200">
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
                </div>

                {/* Module Select */}
                <div className="space-y-2">
                  <Label className="font-semibold text-foreground flex items-center gap-1">
                    <span className="text-rose-600">●</span> Module
                  </Label>
                  <Select
                    value={selectedModule}
                    onValueChange={setSelectedModule}
                    disabled={!selectedSemester || loadingModules}
                  >
                    <SelectTrigger className="border-rose-200">
                      <SelectValue placeholder={loadingModules ? "Chargement..." : "Choisir un module"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredModules.map((m) => (
                        <SelectItem key={m._id} value={m._id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Enhanced Sous-Modules / Courses Display */}
              {selectedModule && (
                <div className="mt-6 space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                    <Label className="font-semibold text-foreground flex items-center gap-2">
                      <Layers className="w-4 h-4 text-orange-600" />
                      Sous-modules / Cours ({filteredCourses.length})
                    </Label>
                    
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                      {/* Search Input */}
                      <div className="relative flex-1 sm:flex-none">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="Rechercher..."
                          value={courseSearch}
                          onChange={(e) => setCourseSearch(e.target.value)}
                          className="pl-8 w-full sm:w-48 h-9 text-sm"
                        />
                      </div>
                      
                      {/* Category Filter */}
                      {courseCategories.length > 0 && (
                        <Select
                          value={selectedCategory}
                          onValueChange={setSelectedCategory}
                        >
                          <SelectTrigger className="w-full sm:w-40 h-9 text-sm">
                            <Filter className="w-3 h-3 mr-1" />
                            <SelectValue placeholder="Catégorie" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Toutes catégories</SelectItem>
                            {courseCategories.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>

                  {loadingCourses ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                      <span className="ml-2 text-muted-foreground">Chargement des cours...</span>
                    </div>
                  ) : filteredCourses.length === 0 ? (
                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-center gap-2 text-amber-800">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm">
                          {examCourses.length === 0 
                            ? "Aucun cours trouvé pour ce module. Créez d'abord des cours dans la section \"Examens par Cours\"."
                            : "Aucun cours ne correspond à votre recherche."}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                      {Object.entries(coursesByCategory).map(([category, courses]) => (
                        <div key={category} className="border rounded-lg overflow-hidden">
                          {/* Category Header */}
                          <button
                            onClick={() => {
                              const newExpanded = new Set(expandedCourses);
                              if (newExpanded.has(category)) {
                                newExpanded.delete(category);
                              } else {
                                newExpanded.add(category);
                              }
                              setExpandedCourses(newExpanded);
                            }}
                            className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-gray-50 hover:from-slate-100 hover:to-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <ChevronDown className={cn(
                                "w-4 h-4 text-muted-foreground transition-transform",
                                !expandedCourses.has(category) && "-rotate-90"
                              )} />
                              <FileText className="w-4 h-4 text-orange-500" />
                              <span className="font-medium text-foreground">{category}</span>
                              <Badge variant="secondary" className="text-xs">
                                {courses.length}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {courses.reduce((sum, c) => sum + (c.totalQuestions || 0), 0)} questions
                            </div>
                          </button>
                          
                          {/* Courses List */}
                          <AnimatePresence>
                            {expandedCourses.has(category) && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="divide-y divide-gray-100">
                                  {courses.map((course) => (
                                    <button
                                      key={course._id}
                                      onClick={() => setSelectedCourse(course._id)}
                                      className={cn(
                                        "w-full flex items-center justify-between p-3 text-left transition-all",
                                        selectedCourse === course._id
                                          ? "bg-rose-50 border-l-4 border-rose-500"
                                          : "hover:bg-background border-l-4 border-transparent"
                                      )}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className={cn(
                                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold",
                                          selectedCourse === course._id
                                            ? "bg-rose-500 text-white"
                                            : "bg-muted text-muted-foreground"
                                        )}>
                                          {course.name?.charAt(0)?.toUpperCase() || "C"}
                                        </div>
                                        <div>
                                          <p className={cn(
                                            "font-medium text-sm",
                                            selectedCourse === course._id ? "text-rose-700" : "text-foreground"
                                          )}>
                                            {course.name}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {course.totalQuestions || 0} questions liées
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge 
                                          variant={course.status === "active" ? "default" : "secondary"}
                                          className={cn(
                                            "text-xs",
                                            course.status === "active" 
                                              ? "bg-emerald-100 text-emerald-700" 
                                              : ""
                                          )}
                                        >
                                          {course.status === "active" ? "Actif" : "Brouillon"}
                                        </Badge>
                                        {selectedCourse === course._id && (
                                          <CheckCircle className="w-4 h-4 text-rose-500" />
                                        )}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Question Linking Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b">
              <CardTitle className="flex items-center gap-2 text-orange-900">
                <Link className="w-5 h-5" />
                Intégrer Questions d'Examens par Années
              </CardTitle>
              <CardDescription>
                Mappez les questions des examens par années existants vers ce cours
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {yearMappings.map((row, idx) => (
                  <motion.div
                    key={row.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                    className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-end p-3 bg-background rounded-lg border border-border"
                  >
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs font-semibold">Examen par Année</Label>
                      <Select
                        value={row.examYearId}
                        onValueChange={(value) => handleYearMappingChange(row.id, "examYearId", value)}
                        disabled={!selectedModule || loadingExamYears}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent>
                          {examYears.map((exam) => (
                            <SelectItem key={exam._id} value={exam._id}>
                              {exam.name} ({exam.year})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs font-semibold">Numéros de Questions</Label>
                      <Input
                        placeholder="ex: 1-5,7,10-12"
                        value={row.questionNumbers}
                        onChange={(e) => handleYearMappingChange(row.id, "questionNumbers", e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewQuestions(row.examYearId)}
                        disabled={!row.examYearId || loadingQuestions}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        {loadingQuestions ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveYearRow(row.id)}
                        disabled={yearMappings.length === 1}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>

              <Button
                variant="outline"
                onClick={handleAddYearRow}
                className="w-full mt-4 gap-2 border-orange-200 text-orange-600 hover:bg-orange-50"
              >
                <Plus className="w-4 h-4" />
                Ajouter une Intégration
              </Button>
            </CardContent>
            <CardFooter className="bg-background border-t flex justify-end">
              <Button
                className="bg-rose-600 hover:bg-rose-700 gap-2"
                disabled={!canLink || linking}
                onClick={handleLinkQuestions}
              >
                {linking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Lier les Questions
              </Button>
            </CardFooter>
          </Card>
        </motion.div>

        {/* Image Attachment Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
              <CardTitle className="flex items-center gap-2 text-purple-900">
                <ImageIcon className="w-5 h-5" />
                Attacher des Images (Optionnel)
              </CardTitle>
              <CardDescription>
                Associez des images aux questions liées
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
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

              <div className="flex gap-2 mt-4">
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
                  disabled={uploading || !yearMappings.some(m => m.examYearId) || !imageMappings.some(m => m.file && m.questionNumbers.trim())}
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
            </CardContent>
          </Card>
        </motion.div>

        {/* Selected Course Summary */}
        {selectedCourse && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                <CardTitle className="flex items-center gap-2 text-green-900">
                  <CheckCircle className="w-5 h-5" />
                  Cours Sélectionné
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {examCourses.filter(c => c._id === selectedCourse).map(course => (
                  <div key={course._id} className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{course.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Catégorie: {course.category} •
                        Questions liées: {course.totalQuestions || 0}
                      </p>
                    </div>
                    <Badge variant={course.status === "active" ? "success" : "secondary"}>
                      {course.status === "active" ? "Actif" : "Brouillon"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Questions Preview Dialog */}
        <Dialog open={showQuestionsDialog} onOpenChange={setShowQuestionsDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Questions de l'Examen</DialogTitle>
              <DialogDescription>
                Visualisez les questions disponibles. Utilisez les numéros dans le champ de saisie.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[50vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead className="w-24">Session</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedExamQuestions.map((question, idx) => (
                    <TableRow key={question._id}>
                      <TableCell className="font-medium">{idx + 1}</TableCell>
                      <TableCell className="max-w-md truncate">
                        {question.text?.substring(0, 100)}
                        {question.text?.length > 100 && "..."}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {question.sessionLabel}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {selectedExamQuestions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune question trouvée pour cet examen
                </div>
              )}
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowQuestionsDialog(false)}>
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ImportExamParCourse;
