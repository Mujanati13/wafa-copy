import { useState, useEffect, useMemo } from "react";
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Save, Eye, Edit, HelpCircle, FileSpreadsheet, AlertTriangle, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared";
import { toast } from "sonner";
import { api } from "@/lib/utils";

const yearNames = ["2021", "2022", "2023", "2024", "2025"];

const AddQuestions = () => {
  const { t } = useTranslation(['admin', 'common']);

  const [modules, setModules] = useState([]);
  const [exams, setExams] = useState([]);
  const [qcmBanques, setQcmBanques] = useState([]);
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    fetchAllQuestions();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [modulesRes, examsRes, qcmRes] = await Promise.all([
        api.get("/modules"),
        api.get("/exams/all"),
        api.get("/qcm-banque/all")
      ]);
      setModules(modulesRes.data?.data || []);
      setExams(examsRes.data?.data || []);
      setQcmBanques(qcmRes.data?.data || []);
    } catch (err) {
      console.error("Error fetching data:", err);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  // Get exams/QCMs filtered by module
  const getExamsForModule = (moduleId) => {
    return exams.filter(e => (e.moduleId?._id || e.moduleId) === moduleId);
  };

  const getQCMsForModule = (moduleId) => {
    return qcmBanques.filter(q => (q.moduleId?._id || q.moduleId) === moduleId);
  };

  // Fetch categories when module changes
  const fetchCategoriesForModule = async (moduleId) => {
    if (!moduleId) {
      setCategories([]);
      return;
    }
    try {
      const response = await api.get(`/exam-courses/module/${moduleId}/categories`);
      setCategories(response.data?.data || []);
    } catch (err) {
      console.error("Error fetching categories:", err);
      setCategories([]);
    }
  };

  // Fetch courses when category changes
  const fetchCoursesForCategory = async (moduleId, category) => {
    if (!moduleId) {
      setCourses([]);
      return;
    }
    try {
      const url = category
        ? `/exam-courses?moduleId=${moduleId}&category=${category}`
        : `/exam-courses?moduleId=${moduleId}`;
      const response = await api.get(url);
      setCourses(response.data?.data || []);
    } catch (err) {
      console.error("Error fetching courses:", err);
      setCourses([]);
    }
  };

  const [selectedModule, setSelectedModule] = useState("");
  const [selectedContextSemester, setSelectedContextSemester] = useState("");
  const [examType, setExamType] = useState("");
  const [selectedExamNameYears, setSelectedExamNameYears] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedYearName, setSelectedYearName] = useState("");
  const [selectedTPName, setSelectedTPName] = useState("");
  const [selectedQCMName, setSelectedQCMName] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState([
    { id: crypto.randomUUID(), text: "", isCorrect: false },
    { id: crypto.randomUUID(), text: "", isCorrect: false },
  ]);
  const [note, setNote] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [examQuestions, setExamQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [viewingQuestion, setViewingQuestion] = useState(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [sessionLabel, setSessionLabel] = useState("Session principale");

  // Filters for questions table
  const [filterModule, setFilterModule] = useState("all");
  const [filterSemester, setFilterSemester] = useState("all"); // Semester filter for table
  const [filterExamType, setFilterExamType] = useState("all");
  const [filterExam, setFilterExam] = useState("all"); // Filter by specific exam
  const [searchQuery, setSearchQuery] = useState(""); // Search in question text

  // Selected questions for bulk operations
  const [selectedQuestions, setSelectedQuestions] = useState([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const contextSemesterOptions = useMemo(() => {
    const semesters = Array.from(new Set(modules.map((m) => m.semester).filter(Boolean)));
    return semesters.sort((a, b) => {
      const numA = parseInt(String(a).replace(/^S/i, ""), 10);
      const numB = parseInt(String(b).replace(/^S/i, ""), 10);

      if (Number.isNaN(numA) && Number.isNaN(numB)) {
        return String(a).localeCompare(String(b));
      }
      if (Number.isNaN(numA)) return 1;
      if (Number.isNaN(numB)) return -1;
      return numA - numB;
    });
  }, [modules]);

  const contextModules = useMemo(() => {
    if (!selectedContextSemester) return [];
    return modules.filter((m) => m.semester === selectedContextSemester);
  }, [modules, selectedContextSemester]);

  // Filter questions based on search and exam filter
  const filteredQuestions = useMemo(() => {
    let result = examQuestions;
    
    // Filter by specific exam
    if (filterExam !== "all") {
      result = result.filter(q => 
        (q.examId?._id || q.examId) === filterExam || 
        (q.qcmBanqueId?._id || q.qcmBanqueId) === filterExam
      );
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(q => 
        q.text?.toLowerCase().includes(query) ||
        q.options?.some(opt => opt.text?.toLowerCase().includes(query)) ||
        q.questionNumber?.toString().includes(query)
      );
    }
    
    return result;
  }, [examQuestions, filterExam, searchQuery]);

  const doesCourseSessionMatchYear = (sessionName, yearName) => {
    if (!yearName) return true;
    const normalizedSession = String(sessionName || "").toLowerCase();
    const normalizedYear = String(yearName).trim().toLowerCase();
    return normalizedSession.includes(`(${normalizedYear})`) || normalizedSession.includes(normalizedYear);
  };

  const mapCourseQuestionsForDisplay = (courseData) => {
    if (!courseData?.questions) return [];

    const courseReference = {
      _id: courseData._id,
      name: courseData.name,
      moduleId: courseData.moduleId,
      moduleName: courseData.moduleName,
    };

    return Object.entries(courseData.questions)
      .filter(([sessionName]) => doesCourseSessionMatchYear(sessionName, selectedYearName))
      .flatMap(([sessionName, sessionQuestions]) =>
        (sessionQuestions || []).map((question) => ({
          ...question,
          examCourseId: courseReference,
          courseSessionName: sessionName,
          sessionLabel: question.sessionLabel || sessionName,
        }))
      );
  };

  const getQuestionSourceDetails = (question) => {
    if (question?.examCourseId) {
      return {
        type: "Exam par courses",
        name: question.examCourseId?.name || "-",
        year: question.courseSessionName || "",
        module: question.examCourseId?.moduleId?.name || question.examCourseId?.moduleName || "-",
        color: "bg-green-100 text-green-800"
      };
    }

    if (question?.qcmBanqueId) {
      return {
        type: "QCM banque",
        name: question.qcmBanqueId?.name || "-",
        year: "",
        module: question.qcmBanqueId?.moduleId?.name || question.qcmBanqueId?.moduleName || "-",
        color: "bg-purple-100 text-purple-800"
      };
    }

    if (question?.examId) {
      return {
        type: "Exam par years",
        name: question.examId?.name || "-",
        year: question.examId?.year || "",
        module: question.examId?.moduleId?.name || question.examId?.moduleName || "-",
        color: "bg-blue-100 text-blue-800"
      };
    }

    return {
      type: "Non sp?cifi?",
      name: "-",
      year: "",
      module: "-",
      color: "bg-gray-100 text-gray-800"
    };
  };

  // Calculate paginated questions from filtered results
  const totalPages = Math.ceil(filteredQuestions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedQuestions = filteredQuestions.slice(startIndex, endIndex);

  // Reset to first page when questions or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredQuestions.length, itemsPerPage]);

  // Toggle select all (only for filtered questions)
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedQuestions(filteredQuestions.map(q => q._id || q.id));
    } else {
      setSelectedQuestions([]);
    }
  };

  // Toggle individual question selection
  const handleSelectQuestion = (questionId, checked) => {
    if (checked) {
      setSelectedQuestions(prev => [...prev, questionId]);
    } else {
      setSelectedQuestions(prev => prev.filter(id => id !== questionId));
    }
  };

  const handleAddOption = () => {
    setOptions((prev) => [...prev, { id: crypto.randomUUID(), text: "", isCorrect: false }]);
  };

  const handleRemoveOption = (id) => {
    setOptions((prev) => prev.filter((o) => o.id !== id));
  };

  const hasValidOptions = options.filter((o) => o.text.trim()).length >= 2;
  const hasAtLeastOneCorrect = options.some((o) => o.isCorrect && o.text.trim());
  const hasBasicQuestion = questionText.trim().length > 0 && hasValidOptions;

  const hasContextSelected = (() => {
    if (!selectedModule || !examType) return false;
    if (examType === "years") return !!selectedExamNameYears;
    if (examType === "courses") return !!(selectedCourse && selectedYearName);
    if (examType === "tp") return !!selectedTPName;
    if (examType === "qcm") return !!selectedQCMName;
    return false;
  })();

  const canSubmit = hasContextSelected && hasBasicQuestion && hasAtLeastOneCorrect;

  // Fetch all questions on mount or with filters
  const fetchAllQuestions = async () => {
    try {
      setLoadingQuestions(true);
      let url = '/questions/all';
      const params = new URLSearchParams();

      // If semester is selected but no module, get all modules for that semester and filter
      if (filterSemester && filterSemester !== 'all') {
        const semesterModules = modules.filter(m => m.semester === filterSemester);
        if (filterModule && filterModule !== 'all') {
          params.append('moduleId', filterModule);
        } else {
          // Send all module IDs for this semester
          semesterModules.forEach(m => params.append('moduleIds', m._id));
        }
      } else if (filterModule && filterModule !== 'all') {
        params.append('moduleId', filterModule);
      }
      
      if (filterExamType && filterExamType !== 'all') params.append('examType', filterExamType);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await api.get(url);
      setExamQuestions(response.data?.data || []);
    } catch (err) {
      console.error("Error fetching all questions:", err);
      setExamQuestions([]);
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Refetch when filters change
  useEffect(() => {
    if (!hasContextSelected) {
      fetchAllQuestions();
    }
  }, [filterModule, filterSemester, filterExamType, modules.length]);

  // Clear selections when questions change
  useEffect(() => {
    setSelectedQuestions([]);
  }, [examQuestions.length]);

  // Load questions when exam context changes
  useEffect(() => {
    if (hasContextSelected) {
      fetchExamQuestions();
    } else {
      setExamQuestions([]);
    }
  }, [hasContextSelected, selectedExamNameYears, selectedQCMName, selectedTPName, selectedCourse, selectedYearName]);

  const fetchExamQuestions = async () => {
    try {
      setLoadingQuestions(true);
      if (examType === "courses" && selectedCourse) {
        const [courseResponse, directQuestionsResponse] = await Promise.all([
          api.get(`/exam-courses/${selectedCourse}`),
          api.get(`/questions/by-exam/${selectedCourse}`)
        ]);

        const courseData = courseResponse.data?.data;
        const courseReference = {
          _id: courseData?._id || selectedCourse,
          name: courseData?.name || courses.find((course) => course._id === selectedCourse)?.name || "—",
          moduleId: courseData?.moduleId,
          moduleName: courseData?.moduleName,
        };

        const courseQuestions = mapCourseQuestionsForDisplay(courseData);
        const directQuestions = (directQuestionsResponse.data?.data || []).map((question) => ({
          ...question,
          examCourseId: courseReference,
          courseSessionName: question.sessionLabel || selectedYearName || "",
        }));

        const mergedQuestions = [...courseQuestions, ...directQuestions].filter(
          (question, index, allQuestions) =>
            allQuestions.findIndex((candidate) => (candidate._id || candidate.id) === (question._id || question.id)) === index
        );

        setExamQuestions(mergedQuestions);
        return;
      }

      let examId = null;

      if (examType === "years" && selectedExamNameYears) {
        const exam = exams.find(e => e._id === selectedExamNameYears);
        examId = exam?._id;
      } else if (examType === "qcm" && selectedQCMName) {
        examId = selectedQCMName;
      } else if (examType === "tp" && selectedTPName) {
        examId = selectedTPName;
      }

      if (!examId) {
        setExamQuestions([]);
        return;
      }

      const response = await api.get(`/questions/by-exam/${examId}`);
      setExamQuestions(response.data?.data || []);
    } catch (err) {
      console.error("Error fetching questions:", err);
      setExamQuestions([]);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleSubmit = async () => {
    try {
      let imageUrls = [];

      // Upload image if present
      if (imageFile) {
        const formData = new FormData();
        formData.append('images', imageFile);

        try {
          const uploadResponse = await api.post('/questions/upload-images', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          const uploadedData = uploadResponse.data?.data;
          if (uploadedData && Array.isArray(uploadedData)) {
            imageUrls = uploadedData.map(img => img.url);
          }
        } catch (uploadErr) {
          console.error('Error uploading image:', uploadErr);
          toast.error('Erreur lors du téléchargement de l\'image');
          return;
        }
      }

      // Determine examId based on selected exam type - examId is required by schema
      let examId = null;
      if (examType === "years" && selectedExamNameYears) {
        examId = selectedExamNameYears;
      } else if (examType === "qcm" && selectedQCMName) {
        examId = selectedQCMName;
      } else if (examType === "courses" && selectedCourse) {
        examId = selectedCourse;
      } else {
        toast.error("Veuillez sélectionner un examen ou une banque QCM");
        return;
      }

      // Prepare the question payload according to the schema
      const questionPayload = {
        examId: examId,
        text: questionText,
        options: options.map(opt => ({
          text: opt.text,
          isCorrect: opt.isCorrect
        })),
        sessionLabel: sessionLabel.trim() || "Session principale",
        note: note || undefined,
        images: imageUrls,
      };

      // Create the question
      await api.post('/questions/create', questionPayload);

      toast.success(t('admin:question_submitted'));
      
      // Reset form
      setQuestionText("");
      setOptions([
        { id: crypto.randomUUID(), text: "", isCorrect: false },
        { id: crypto.randomUUID(), text: "", isCorrect: false },
      ]);
      setNote("");
      setImageFile(null);

      // Refresh questions list
      if (hasContextSelected) {
        fetchExamQuestions();
      } else {
        fetchAllQuestions();
      }
    } catch (err) {
      console.error("Error submitting question:", err);
      toast.error(err.response?.data?.message || "Erreur lors de la soumission de la question");
    }
  };

  // Handle Export to Excel
  const handleExportToExcel = () => {
    const questionsToExport = selectedQuestions.length > 0
      ? examQuestions.filter(q => selectedQuestions.includes(q._id || q.id))
      : examQuestions;

    if (questionsToExport.length === 0) {
      toast.error("Aucune question à exporter");
      return;
    }

    // Create CSV content
    const headers = ["ID", "Question", "Option A", "Option B", "Option C", "Option D", "Option E", "Correct Answer"];
    const rows = questionsToExport.map(q => {
      const correctOption = q.options?.find(opt => opt.isCorrect);
      return [
        q._id || q.id,
        `"${q.text?.replace(/"/g, '""') || ''}"`,
        `"${q.options?.[0]?.text?.replace(/"/g, '""') || ''}"`,
        `"${q.options?.[1]?.text?.replace(/"/g, '""') || ''}"`,
        `"${q.options?.[2]?.text?.replace(/"/g, '""') || ''}"`,
        `"${q.options?.[3]?.text?.replace(/"/g, '""') || ''}"`,
        `"${q.options?.[4]?.text?.replace(/"/g, '""') || ''}"`,
        `"${correctOption?.text?.replace(/"/g, '""') || ''}"`,
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `questions_export_${Date.now()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`${questionsToExport.length} questions exportées avec succès`);
    setSelectedQuestions([]);
  };

  // Handle Delete All Questions
  const handleDeleteAllQuestions = async () => {
    const questionsToDelete = selectedQuestions.length > 0
      ? selectedQuestions
      : examQuestions.map(q => q._id || q.id);

    if (questionsToDelete.length === 0) {
      toast.error("Aucune question à supprimer");
      return;
    }

    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${questionsToDelete.length} question(s) ? Cette action est irréversible.`)) {
      return;
    }

    try {
      await api.post("/questions/bulk-delete", { questionIds: questionsToDelete });
      setExamQuestions(prev => prev.filter(q => !questionsToDelete.includes(q._id || q.id)));
      setSelectedQuestions([]);
      toast.success(`${questionsToDelete.length} question(s) supprimée(s) avec succès`);
      if (hasContextSelected) {
        fetchExamQuestions(); // Refresh the list
      } else {
        fetchAllQuestions();
      }
    } catch (err) {
      console.error("Error deleting questions:", err);
      toast.error("Erreur lors de la suppression des questions");
    }
  };

  // Handle Delete Single Question
  const handleDeleteQuestion = async (questionId) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette question ?")) {
      return;
    }

    try {
      await api.delete(`/questions/delete/${questionId}`);
      setExamQuestions(prev => prev.filter(q => (q._id || q.id) !== questionId));
      toast.success("Question supprimée avec succès");
    } catch (err) {
      console.error("Error deleting question:", err);
      toast.error("Erreur lors de la suppression de la question");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <PageHeader title={t('admin:add_questions')} description={t('admin:select_context_add_content')} />
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setShowPreview((p) => !p)}>
              <Eye className="h-4 w-4 mr-2" />
              {t('admin:preview')}
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              <Save className="h-4 w-4 mr-2" />
              {t('admin:submit')}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('admin:context')}</CardTitle>
            <CardDescription>{t('admin:select_module_exam_type')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>{t('admin:semester', 'Semester')}</Label>
                <Select
                  value={selectedContextSemester}
                  onValueChange={(val) => {
                    setSelectedContextSemester(val);
                    setSelectedModule("");
                    setExamType("");
                    setSelectedExamNameYears("");
                    setSelectedCategory("");
                    setSelectedCourse("");
                    setSelectedYearName("");
                    setSelectedTPName("");
                    setSelectedQCMName("");
                    setCategories([]);
                    setCourses([]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('admin:choose_semester', 'Choisir un semestre')} />
                  </SelectTrigger>
                  <SelectContent>
                    {contextSemesterOptions.map((semester) => (
                      <SelectItem key={semester} value={semester}>
                        {semester}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('admin:module')}</Label>
                <Select
                  value={selectedModule}
                  onValueChange={(val) => {
                    setSelectedModule(val);
                    setExamType("");
                    setSelectedExamNameYears("");
                    setSelectedCategory("");
                    setSelectedCourse("");
                    setSelectedYearName("");
                    setSelectedTPName("");
                    setSelectedQCMName("");
                    setCategories([]);
                    setCourses([]);
                    fetchCategoriesForModule(val);
                    fetchCoursesForCategory(val, "");
                  }}
                  disabled={!selectedContextSemester}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedContextSemester ? t('admin:choose_module') : t('admin:choose_semester', 'Choisir un semestre')} />
                  </SelectTrigger>
                  <SelectContent>
                    {contextModules.map((m) => (
                      <SelectItem key={m._id} value={m._id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('admin:exam_type')}</Label>
                <Select
                  value={examType}
                  onValueChange={(val) => {
                    setExamType(val);
                    setSelectedExamNameYears("");
                    setSelectedCategory("");
                    setSelectedCourse("");
                    setSelectedYearName("");
                    setSelectedTPName("");
                    setSelectedQCMName("");
                  }}
                  disabled={!selectedModule}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('admin:choose_type')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="years">{t('admin:exam_by_years')}</SelectItem>
                    <SelectItem value="courses">{t('admin:exam_by_courses')}</SelectItem>
                    <SelectItem value="tp">{t('admin:exam_tp')}</SelectItem>
                    <SelectItem value="qcm">{t('admin:exam_qcm')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {examType === "years" && (
                <div className="space-y-2 md:col-span-2">
                  <Label>{t('admin:exam_name')}</Label>
                  <Select value={selectedExamNameYears} onValueChange={setSelectedExamNameYears} disabled={!selectedModule}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin:choose_exam')} />
                    </SelectTrigger>
                    <SelectContent>
                      {getExamsForModule(selectedModule).map((exam) => (
                        <SelectItem key={exam._id} value={exam._id}>
                          {exam.name} ({exam.year})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {examType === "courses" && (
                <>
                  <div className="space-y-2">
                    <Label>{t('admin:category')}</Label>
                    <Select
                      value={selectedCategory}
                      onValueChange={(val) => {
                        setSelectedCategory(val);
                        setSelectedCourse("");
                        setSelectedYearName("");
                        fetchCoursesForCategory(selectedModule, val);
                      }}
                      disabled={!selectedModule}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('admin:choose_category')} />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('admin:course')}</Label>
                    <Select value={selectedCourse} onValueChange={setSelectedCourse} disabled={!selectedModule}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('admin:choose_course')} />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((c) => (
                          <SelectItem key={c._id} value={c._id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('admin:year')}</Label>
                    <Select value={selectedYearName} onValueChange={setSelectedYearName} disabled={!selectedCourse}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('admin:choose_year')} />
                      </SelectTrigger>
                      <SelectContent>
                        {yearNames.map((y) => (
                          <SelectItem key={y} value={y}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {examType === "tp" && (
                <div className="space-y-2 md:col-span-2">
                  <Label>{t('admin:tp_name')}</Label>
                  <Select value={selectedTPName} onValueChange={setSelectedTPName} disabled={!selectedModule}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin:choose_tp')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tp1">TP 1</SelectItem>
                      <SelectItem value="tp2">TP 2</SelectItem>
                      <SelectItem value="tp3">TP 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {examType === "qcm" && (
                <div className="space-y-2 md:col-span-2">
                  <Label>{t('admin:qcm_name')}</Label>
                  <Select value={selectedQCMName} onValueChange={setSelectedQCMName} disabled={!selectedModule}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin:choose_qcm')} />
                    </SelectTrigger>
                    <SelectContent>
                      {getQCMsForModule(selectedModule).map((qcm) => (
                        <SelectItem key={qcm._id} value={qcm._id}>
                          {qcm.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Export and Delete buttons - Only show when context is selected */}
            {hasContextSelected && (
              <div className="flex flex-wrap gap-3 pt-4 mt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportToExcel}
                  disabled={examQuestions.length === 0}
                  className="gap-2 text-green-600 border-green-200 hover:bg-green-50"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Exporter {selectedQuestions.length > 0 ? `(${selectedQuestions.length})` : 'Tout'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteAllQuestions}
                  disabled={examQuestions.length === 0}
                  className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer {selectedQuestions.length > 0 ? `(${selectedQuestions.length})` : 'Tout'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('admin:question')}</CardTitle>
            <CardDescription>{t('admin:add_question_text_options')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Session Label</Label>
                <Input 
                  value={sessionLabel} 
                  onChange={(e) => setSessionLabel(e.target.value)} 
                  placeholder="Ex: Session principale, Rattrapage, etc."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('admin:question_text')}</Label>
              <Textarea value={questionText} onChange={(e) => setQuestionText(e.target.value)} placeholder={t('admin:type_question_here')} rows={4} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>{t('admin:options')}</Label>
                <Button variant="outline" size="sm" onClick={handleAddOption}>
                  <Plus className="h-4 w-4 mr-1" />
                  {t('admin:add_option')}
                </Button>
              </div>
              <div className="space-y-3">
                {options.map((opt, index) => (
                  <div key={opt.id} className="flex items-center gap-3">
                    <Checkbox
                      checked={!!opt.isCorrect}
                      onCheckedChange={(checked) =>
                        setOptions((prev) =>
                          prev.map((o) =>
                            o.id === opt.id ? { ...o, isCorrect: checked } : o
                          )
                        )
                      }
                    />
                    <Input
                      placeholder={`${t('admin:option')} ${index + 1}`}
                      value={opt.text}
                      onChange={(e) =>
                        setOptions((prev) =>
                          prev.map((o) =>
                            o.id === opt.id ? { ...o, text: e.target.value } : o
                          )
                        )
                      }
                      className="flex-1"
                    />
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveOption(opt.id)} disabled={options.length <= 2}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{t('admin:check_correct_answers')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('admin:note_optional')}</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('admin:note_explanation')} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>{t('admin:images_optional')}</Label>
                <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                {imageFile && <p className="text-sm text-muted-foreground">{t('admin:selected')}: {imageFile.name}</p>}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowPreview((p) => !p)}>
              <Eye className="h-4 w-4 mr-2" />
              {t('admin:preview')}
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              <Save className="h-4 w-4 mr-2" />
              {t('admin:submit')}
            </Button>
          </CardFooter>
        </Card>

        {showPreview && (
          <Card>
            <CardHeader>
              <CardTitle>{t('admin:preview_title')}</CardTitle>
              <CardDescription>{t('admin:preview_description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="font-medium text-foreground">{questionText || "—"}</div>
              {imageFile && (
                <div className="border rounded-md p-3 bg-muted">
                  <span className="text-sm text-muted-foreground">{t('admin:image_attached')}: {imageFile.name}</span>
                </div>
              )}
              <ol className="space-y-2 list-decimal list-inside">
                {options
                  .filter((o) => o.text.trim())
                  .map((o) => (
                    <li key={o.id} className={o.isCorrect ? "font-medium text-green-700" : "text-foreground"}>
                      {o.text}
                    </li>
                  ))}
              </ol>
              {note && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{t('admin:note_optional')}: </span>
                  {note}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Questions List Table */}
        <Card>
          <CardHeader className="border-b space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {hasContextSelected ? "Questions de l'Examen" : "Toutes les Questions"}
                  <Badge variant="secondary">{filteredQuestions.length} Affichée(s)</Badge>
                  {filteredQuestions.length !== examQuestions.length && (
                    <Badge variant="outline" className="text-xs">{examQuestions.length} Total</Badge>
                  )}
                  {selectedQuestions.length > 0 && (
                    <Badge variant="default" className="bg-blue-500">{selectedQuestions.length} sélectionnée(s)</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {hasContextSelected ? "Toutes les questions de cet examen" : "Filtrez et gérez les questions importées"}
                </CardDescription>
              </div>
            </div>

            {/* Filters - Only show when no context is selected */}
            {!hasContextSelected && (
              <>
                {/* Search Box */}
                <div className="pt-4 border-t">
                  <div className="relative">
                    <Input
                      placeholder="Rechercher par texte, option ou N° question..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                    <HelpCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Semestre</Label>
                    <Select value={filterSemester} onValueChange={(val) => {
                      setFilterSemester(val);
                      setFilterModule("all"); // Reset module when semester changes
                      setFilterExam("all");
                    }}>
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
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Module</Label>
                    <Select value={filterModule} onValueChange={(val) => {
                      setFilterModule(val);
                      setFilterExam("all");
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tous les modules" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les modules</SelectItem>
                        {(filterSemester === "all" ? modules : modules.filter(m => m.semester === filterSemester)).map((m) => (
                          <SelectItem key={m._id} value={m._id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Type d'Examen</Label>
                    <Select value={filterExamType} onValueChange={(val) => {
                      setFilterExamType(val);
                      setFilterExam("all");
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tous les types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les types</SelectItem>
                        <SelectItem value="years">Exam par années</SelectItem>
                        <SelectItem value="qcm">Banque QCM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Examen spécifique</Label>
                    <Select value={filterExam} onValueChange={setFilterExam} disabled={filterModule === "all"}>
                      <SelectTrigger>
                        <SelectValue placeholder={filterModule === "all" ? "Sélectionnez un module" : "Tous les examens"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les examens</SelectItem>
                        {filterModule !== "all" && (
                          <>
                            {filterExamType !== "qcm" && exams
                              .filter(e => (e.moduleId?._id || e.moduleId) === filterModule)
                              .map((e) => (
                                <SelectItem key={e._id} value={e._id}>
                                  {e.name} {e.year && `(${e.year})`}
                                </SelectItem>
                              ))}
                            {filterExamType !== "years" && qcmBanques
                              .filter(q => (q.moduleId?._id || q.moduleId) === filterModule)
                              .map((q) => (
                                <SelectItem key={q._id} value={q._id}>
                                  QCM: {q.name}
                                </SelectItem>
                              ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 flex items-end">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setFilterSemester("all");
                        setFilterModule("all");
                        setFilterExamType("all");
                        setFilterExam("all");
                        setSearchQuery("");
                      }}
                    >
                      Réinitialiser
                    </Button>
                  </div>
                </div>

                {/* Export and Delete buttons for filtered questions */}
                <div className="flex flex-wrap gap-3 pt-4 border-t mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportToExcel}
                    disabled={examQuestions.length === 0}
                    className="gap-2 text-green-600 border-green-200 hover:bg-green-50"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Exporter {selectedQuestions.length > 0 ? `(${selectedQuestions.length})` : 'Tout'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteAllQuestions}
                    disabled={examQuestions.length === 0}
                    className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer {selectedQuestions.length > 0 ? `(${selectedQuestions.length})` : 'Tout'}
                  </Button>
                </div>
              </>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={filteredQuestions.length > 0 && selectedQuestions.length === filteredQuestions.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="w-16">N°</TableHead>
                    <TableHead className="w-20">Qst Num</TableHead>
                    <TableHead className="min-w-[120px] max-w-[150px]">Examen</TableHead>
                    <TableHead className="w-20">Image</TableHead>
                    <TableHead className="min-w-[200px] max-w-[250px]">Question</TableHead>
                    <TableHead className="min-w-[100px] max-w-[120px]">Réponse</TableHead>
                    <TableHead className="min-w-[120px]">Référence</TableHead>
                    <TableHead className="w-28 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingQuestions ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
                        <p className="text-muted-foreground mt-2">Chargement des questions...</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredQuestions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                        {examQuestions.length === 0 
                          ? "Aucune question trouvée" 
                          : "Aucune question ne correspond aux critères de recherche"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedQuestions.map((q, idx) => {
                      // Get exam/QCM name
                      const examName = q.examId?.name || q.qcmBanqueId?.name || "—";
                      const examYear = q.examId?.year || "";
                      // Get correct options
                      const correctOptions = q.options?.filter(opt => opt.isCorrect) || [];
                      const correctAnswerText = correctOptions.map((opt, i) => {
                        const optIndex = q.options.indexOf(opt);
                        return String.fromCharCode(65 + optIndex);
                      }).join(", ") || "—";
                      
                      // Determine question reference (which model/type)
                      const getQuestionReference = () => {
                        if (q.examId) {
                          return {
                            type: "Exam par years",
                            module: q.examId?.moduleId?.name || q.examId?.moduleName || "—",
                            color: "bg-blue-100 text-blue-800"
                          };
                        } else if (q.qcmBanqueId) {
                          return {
                            type: "QCM banque",
                            module: q.qcmBanqueId?.moduleId?.name || q.qcmBanqueId?.moduleName || "—",
                            color: "bg-purple-100 text-purple-800"
                          };
                        } else if (q.examCourseId) {
                          return {
                            type: "Exam par courses",
                            module: q.examCourseId?.moduleId?.name || q.examCourseId?.moduleName || "—",
                            color: "bg-green-100 text-green-800"
                          };
                        }
                        return { type: "Non spécifié", module: "—", color: "bg-gray-100 text-gray-800" };
                      };
                      const reference = getQuestionReference();
                      const sourceDetails = getQuestionSourceDetails(q);
                      
                      return (
                        <TableRow key={q._id || q.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedQuestions.includes(q._id || q.id)}
                              onCheckedChange={(checked) => handleSelectQuestion(q._id || q.id, checked)}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-sm">{startIndex + idx + 1}</TableCell>
                          <TableCell className="font-mono text-sm font-semibold text-blue-600">
                            {q.questionNumber || "—"}
                          </TableCell>
                          <TableCell className="max-w-[150px]">
                            <div className="line-clamp-2 text-xs" title={`${sourceDetails.name} ${sourceDetails.year}`}>
                              <span className="font-medium">{sourceDetails.name}</span>
                              {sourceDetails.year && <span className="text-muted-foreground ml-1">({sourceDetails.year})</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            {q.images?.length > 0 ? (
                              <Badge variant="outline" className="text-xs">
                                {q.images.length} img
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[250px]">
                            <div className="line-clamp-2 text-sm" title={q.text}>
                              {q.text}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[120px]">
                            <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                              {correctAnswerText}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant="secondary" className={`text-xs ${sourceDetails.color}`}>
                                {sourceDetails.type}
                              </Badge>
                              <span className="text-xs text-muted-foreground truncate max-w-[100px]" title={sourceDetails.module}>
                                {sourceDetails.module}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                title="Voir"
                                onClick={() => {
                                  setViewingQuestion(q);
                                  setShowViewDialog(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                title="Modifier"
                                onClick={() => {
                                  setEditingQuestion(q);
                                  setShowEditDialog(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteQuestion(q._id || q.id)}
                                title="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          {filteredQuestions.length > 0 && (
            <CardFooter className="border-t bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4 py-4">
              {/* Left side - Info */}
              <div className="text-sm text-muted-foreground">
                Affichage de {startIndex + 1} à {Math.min(endIndex, filteredQuestions.length)} sur {filteredQuestions.length} questions
              </div>
              
              {/* Center - Items per page selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Afficher:</span>
                <Select value={itemsPerPage.toString()} onValueChange={(val) => setItemsPerPage(parseInt(val))}>
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">par page</span>
              </div>
              
              {/* Right side - Pagination controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="h-8 px-2"
                >
                  Début
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center gap-1">
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="h-8 w-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="h-8 px-2"
                >
                  Fin
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>

        {/* View Question Dialog */}
        {showViewDialog && viewingQuestion && (
          <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Détails de la Question</DialogTitle>
                <DialogDescription>Informations complètes de la question</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Reference Information */}
                <div className="space-y-2 pb-3 border-b">
                  <Label className="text-sm font-semibold text-gray-700">Référence</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-600 font-medium">N° Question</p>
                      <p className="text-lg font-bold text-blue-800">
                        {viewingQuestion.questionNumber || "Non défini"}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                      <p className="text-xs text-purple-600 font-medium">Examen</p>
                      <p className="text-sm font-semibold text-purple-800 line-clamp-2">
                        {getQuestionSourceDetails(viewingQuestion).name}
                        {getQuestionSourceDetails(viewingQuestion).year && ` (${getQuestionSourceDetails(viewingQuestion).year})`}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {/* Question Type Badge */}
                    <Badge variant="outline" className={`text-xs ${getQuestionSourceDetails(viewingQuestion).color}`}>
                      {getQuestionSourceDetails(viewingQuestion).type}
                    </Badge>
                    {/* Module Badge */}
                    {getQuestionSourceDetails(viewingQuestion).module && getQuestionSourceDetails(viewingQuestion).module !== "-" && (
                      <Badge variant="outline" className="text-xs bg-gray-50">
                        Module: {getQuestionSourceDetails(viewingQuestion).module}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Question</Label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded border">{viewingQuestion.text}</p>
                </div>
                {viewingQuestion.images && viewingQuestion.images.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Images</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {viewingQuestion.images.map((img, idx) => (
                        <img 
                          key={idx} 
                          src={img.startsWith('http') ? img : `${import.meta.env.VITE_API_URL?.replace('/api/v1', '')}${img}`} 
                          alt={`Question image ${idx + 1}`} 
                          className="w-full h-32 object-cover rounded border" 
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Options</Label>
                  <div className="space-y-2">
                    {viewingQuestion.options?.map((opt, idx) => (
                      <div key={idx} className={`p-2 rounded border ${opt.isCorrect ? 'bg-green-50 border-green-300' : 'bg-gray-50'}`}>
                        <span className="font-medium">{String.fromCharCode(65 + idx)}. </span>
                        {opt.text}
                        {opt.isCorrect && <Badge className="ml-2 bg-green-600">Correct</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
                {viewingQuestion.note && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Correction / Note (Excel)</Label>
                    <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                      <p className="text-gray-900 whitespace-pre-wrap">{viewingQuestion.note}</p>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button onClick={() => setShowViewDialog(false)}>Fermer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit Question Dialog */}
        {showEditDialog && editingQuestion && (
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Modifier la Question</DialogTitle>
                <DialogDescription>Modifiez les détails de la question et ses images</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Reference Information (Read-only) */}
                <div className="grid grid-cols-2 gap-3 pb-3 border-b">
                  <div className="space-y-2">
                    <Label>N° Question dans l'examen</Label>
                    <Input
                      type="number"
                      value={editingQuestion.questionNumber || ''}
                      onChange={(e) => setEditingQuestion({ 
                        ...editingQuestion, 
                        questionNumber: e.target.value ? parseInt(e.target.value) : null 
                      })}
                      placeholder="Ex: 1, 2, 3..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Examen de référence</Label>
                    <Input
                      value={getQuestionSourceDetails(editingQuestion).name || 'Non defini'}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                </div>

                {/* Question Text */}
                <div className="space-y-2">
                  <Label>Question</Label>
                  <Textarea
                    value={editingQuestion.text}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, text: e.target.value })}
                    rows={4}
                  />
                </div>
                
                {/* Current Images */}
                {editingQuestion.images && editingQuestion.images.length > 0 && (
                  <div className="space-y-2">
                    <Label>Images actuelles</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {editingQuestion.images.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img 
                            src={img.startsWith('http') ? img : `${import.meta.env.VITE_API_URL?.replace('/api/v1', '')}${img}`} 
                            alt={`Image ${idx + 1}`} 
                            className="w-full h-24 object-cover rounded border"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              const newImages = editingQuestion.images.filter((_, i) => i !== idx);
                              setEditingQuestion({ ...editingQuestion, images: newImages });
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Upload New Images */}
                <div className="space-y-2">
                  <Label>Ajouter des images</Label>
                  <Input 
                    type="file" 
                    accept="image/*" 
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 0) {
                        setEditingQuestion({ ...editingQuestion, newImageFiles: files });
                      }
                    }}
                  />
                  {editingQuestion.newImageFiles && editingQuestion.newImageFiles.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {editingQuestion.newImageFiles.length} nouveau(x) fichier(s) sélectionné(s)
                    </p>
                  )}
                </div>
                
                {/* Options */}
                <div className="space-y-3">
                  <Label>Options (cochez les réponses correctes)</Label>
                  {editingQuestion.options?.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <Checkbox
                        checked={opt.isCorrect}
                        onCheckedChange={(checked) => {
                          const newOptions = [...editingQuestion.options];
                          newOptions[idx] = { ...opt, isCorrect: checked };
                          setEditingQuestion({ ...editingQuestion, options: newOptions });
                        }}
                      />
                      <span className="font-medium text-sm w-6">{String.fromCharCode(65 + idx)}.</span>
                      <Input
                        value={opt.text}
                        onChange={(e) => {
                          const newOptions = [...editingQuestion.options];
                          newOptions[idx] = { ...opt, text: e.target.value };
                          setEditingQuestion({ ...editingQuestion, options: newOptions });
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                        className={`flex-1 ${opt.isCorrect ? 'border-green-400 bg-green-50' : ''}`}
                      />
                    </div>
                  ))}
                </div>
                
                {/* Question Reference - Read Only */}
                <div className="space-y-2">
                  <Label>Référence de la question</Label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md border">
                    <Badge variant="secondary" className={getQuestionSourceDetails(editingQuestion).color}>
                      {getQuestionSourceDetails(editingQuestion).type}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Module: {getQuestionSourceDetails(editingQuestion).module}
                    </span>
                  </div>
                </div>
                
                {/* Note / Correction from Excel */}
                <div className="space-y-2">
                  <Label>Correction / Note (importé depuis Excel)</Label>
                  <Textarea
                    value={editingQuestion.note || ''}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, note: e.target.value })}
                    rows={4}
                    placeholder="Ajoutez la correction ou des notes explicatives..."
                    className="bg-yellow-50 border-yellow-200"
                  />
                  <p className="text-xs text-muted-foreground">
                    Cette note peut contenir la correction ou explication de la question
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>Annuler</Button>
                <Button onClick={async () => {
                  try {
                    // If new images were selected, upload them first
                    let updatedImages = [...(editingQuestion.images || [])];
                    
                    if (editingQuestion.newImageFiles && editingQuestion.newImageFiles.length > 0) {
                      const formData = new FormData();
                      formData.append('questionId', editingQuestion._id || editingQuestion.id);
                      editingQuestion.newImageFiles.forEach((file) => {
                        formData.append('images', file);
                      });
                      
                      try {
                        const uploadResponse = await api.post('/questions/upload-images', formData, {
                          headers: { 'Content-Type': 'multipart/form-data' }
                        });
                        // Backend returns array of objects with url property
                        const uploadedData = uploadResponse.data?.data;
                        if (uploadedData && Array.isArray(uploadedData)) {
                          const newImageUrls = uploadedData.map(img => img.url);
                          updatedImages = [...updatedImages, ...newImageUrls];
                        }
                      } catch (uploadErr) {
                        console.error('Error uploading images:', uploadErr);
                        toast.error('Erreur lors du téléchargement des images');
                        return; // Stop if upload fails
                      }
                    }
                    
                    // Update question with all data including questionNumber
                    await api.patch(`/questions/update/${editingQuestion._id || editingQuestion.id}`, {
                      text: editingQuestion.text,
                      options: editingQuestion.options,
                      note: editingQuestion.note,
                      questionNumber: editingQuestion.questionNumber,
                      images: updatedImages
                    });
                    
                    toast.success("Question mise à jour avec succès");
                    setShowEditDialog(false);
                    if (hasContextSelected) {
                      fetchExamQuestions();
                    } else {
                      fetchAllQuestions();
                    }
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
    </div>
  );
};

export default AddQuestions;
