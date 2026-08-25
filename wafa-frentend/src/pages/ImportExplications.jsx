import React, { useState, useEffect, useRef } from "react";
import { motion as Motion } from "framer-motion";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Save, Upload, FileText, ImageIcon, Type, Loader2, X } from "lucide-react";
import { api } from "@/lib/utils";
import { toast } from "sonner";

const MAX_IMAGES = 5;
const MAX_PDF = 1;

const ImportExplications = () => {
  const [modules, setModules] = useState([]);
  const [exams, setExams] = useState([]);
  const [examCourses, setExamCourses] = useState([]);
  const [qcmBanques, setQcmBanques] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [modulesRes, examsRes, coursesRes, qcmRes] = await Promise.all([
        api.get("/modules"),
        api.get("/exams/all"),
        api.get("/exam-courses"),
        api.get("/qcm-banque/all")
      ]);
      setModules(modulesRes.data?.data || []);
      setExams(examsRes.data?.data || []);
      setExamCourses(coursesRes.data?.data || []);
      setQcmBanques(qcmRes.data?.data || []);
    } catch (err) {
      console.error("Error fetching data:", err);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  // Get exams filtered by module
  const getExamsForModule = (moduleId) => {
    return exams.filter(e => (e.moduleId?._id || e.moduleId) === moduleId);
  };

  // Base selections
  const [selectedModule, setSelectedModule] = useState("");
  const [examType, setExamType] = useState(""); // years | courses | qcm

  // years
  const [selectedExamNameYears, setSelectedExamNameYears] = useState("");

  // courses flow
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedYearName, setSelectedYearName] = useState("");

  // qcm
  const [selectedQCMName, setSelectedQCMName] = useState("");

  // common and payload inputs
  const [questionNumbers, setQuestionNumbers] = useState("");
  const [explicationText, setExplicationText] = useState("");
  const [imageFiles, setImageFiles] = useState([]);
  const [pdfFile, setPdfFile] = useState(null);
  const [explicationName, setExplicationName] = useState("");
  const [uploading, setUploading] = useState(false);
  const pdfInputRef = useRef(null);

  // Derived lists
  const examsForModule = selectedModule ? getExamsForModule(selectedModule) : [];
  const coursesForModule = selectedModule
    ? examCourses.filter(course => (course.moduleId?._id || course.moduleId) === selectedModule)
    : [];
  const qcmForModule = selectedModule
    ? qcmBanques.filter(qcm => (qcm.moduleId?._id || qcm.moduleId) === selectedModule)
    : [];
  const categoryOptions = examType === "courses"
    ? [...new Set(coursesForModule.map(course => course.category))].filter(Boolean)
    : [];
  const courseOptions = selectedCategory
    ? coursesForModule.filter(course => course.category === selectedCategory)
    : [];
  
  // Keep course-year choices aligned with the years that actually exist.
  const yearNames = [...new Set(examsForModule.map(exam => String(exam.year)).filter(Boolean))]
    .sort((a, b) => Number(b) - Number(a));

  const hasContextSelected = (() => {
    if (!selectedModule || !examType) return false;
    if (examType === "years") return !!selectedExamNameYears;
    if (examType === "courses") return !!(selectedCategory && selectedCourse);
    if (examType === "qcm") return !!selectedQCMName;
    return false;
  })();

  // Content is optional - at least one of text, images, or PDF required
  const hasAnyContent =
    explicationText.trim().length > 0 || (imageFiles?.length || 0) > 0 || pdfFile !== null;

  const canSubmit =
    hasContextSelected &&
    questionNumbers.trim().length > 0 &&
    explicationName.trim().length > 0 &&
    hasAnyContent;

  const handleSubmit = async () => {
    // Determine examId based on exam type
    let examId = null;
    if (examType === "years") examId = selectedExamNameYears;
    const hasTarget = examId
      || (examType === "courses" && selectedCourse)
      || (examType === "qcm" && selectedQCMName);

    if (!hasTarget) {
      toast.error("Veuillez sélectionner un examen, un cours ou une banque QCM");
      return;
    }
    
    try {
      setUploading(true);
      
      // Send content and attachments together so creation cannot become
      // disconnected from a preceding temporary upload.
      const formData = new FormData();
      formData.append('title', explicationName.trim());
      formData.append('contentText', explicationText.trim());
      formData.append('examId', examId || '');
      formData.append('questionNumbers', questionNumbers.trim());
      formData.append('moduleId', selectedModule);
      formData.append('examType', examType);
      if (selectedCourse) formData.append('courseId', selectedCourse);
      if (selectedYearName) formData.append('yearName', selectedYearName);
      if (selectedQCMName) formData.append('qcmBanqueId', selectedQCMName);
      imageFiles.forEach(file => formData.append('images', file));
      if (pdfFile) formData.append('pdf', pdfFile);

      await api.post('/explanations/admin-create', formData, { timeout: 180000 });
      
      toast.success("Explication importée avec succès!");
      
      // Reset form
      setExplicationName("");
      setExplicationText("");
      setImageFiles([]);
      setPdfFile(null);
      setQuestionNumbers("");
    } catch (error) {
      console.error("Error submitting explanation:", error);
      toast.error(error.response?.data?.message || "Erreur lors de l'import");
    } finally {
      setUploading(false);
    }
  };

  const handlePdfUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const validExtensions = new Set(['pdf', 'ppt', 'pptx', 'doc', 'docx']);
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (!extension || !validExtensions.has(extension)) {
      toast.error("Acceptés: PDF, PPTX, DOC, DOCX");
      return;
    }
    setPdfFile(file);
    toast.success(`Fichier ajouté: ${file.name}`);
    e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    const validImages = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (validImages.length > 0) {
      const remainingSlots = MAX_IMAGES - imageFiles.length;
      if (remainingSlots <= 0) {
        toast.error(`Maximum ${MAX_IMAGES} images autorisées`);
        return;
      }
      const toAdd = validImages.slice(0, remainingSlots);
      setImageFiles(prev => [...prev, ...toAdd]);
      if (validImages.length > remainingSlots) {
        toast.warning(`Seulement ${remainingSlots} image(s) ajoutée(s) (limite: ${MAX_IMAGES})`);
      }
    }
  };

  const removeImage = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removePdf = () => {
    setPdfFile(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-card flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" aria-label="Chargement" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-card">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Import Explications</h2>
            <p className="text-muted-foreground">Select module and exam context, then add question numbers, text and/or images, give it a name and submit.</p>
          </div>
        </div>

        {/* Main Form */}
        <Motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-6"
        >
          {/* Context Card */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg">
              <CardTitle className="text-xl font-bold text-foreground">
                Exam Context
              </CardTitle>
              <CardDescription>
                Choose the exam context: par years, par courses or QCM
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Module Select */}
                <div className="space-y-2">
                  <Label className="font-semibold text-foreground">Module *</Label>
                  <Select value={selectedModule} onValueChange={(e) => {
                    setSelectedModule(e);
                    setExamType("");
                    setSelectedExamNameYears("");
                    setSelectedCategory("");
                    setSelectedCourse("");
                    setSelectedYearName("");
                    setSelectedQCMName("");
                  }}>
                    <SelectTrigger className="border-gray-300 h-10">
                      <SelectValue placeholder="Choose a module" />
                    </SelectTrigger>
                    <SelectContent>
                      {modules.map((m) => (
                        <SelectItem key={m._id} value={m._id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Exam Type Select */}
                <div className="space-y-2">
                  <Label className="font-semibold text-foreground">Exam Type *</Label>
                  <Select value={examType} onValueChange={(e) => {
                    setExamType(e);
                    setSelectedExamNameYears("");
                    setSelectedCategory("");
                    setSelectedCourse("");
                    setSelectedYearName("");
                    setSelectedQCMName("");
                  }} disabled={!selectedModule}>
                    <SelectTrigger className="border-gray-300 h-10 disabled:bg-muted">
                      <SelectValue placeholder={selectedModule ? "Choose exam type" : "Select module first"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="years">Exam Par Years</SelectItem>
                      <SelectItem value="courses">Exam Par Courses</SelectItem>
                      <SelectItem value="qcm">Exam QCM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Conditional renders based on exam type */}
                {examType === "years" && (
                  <div className="space-y-2 md:col-span-2">
                    <Label className="font-semibold text-foreground">Exam Name *</Label>
                    <Select value={selectedExamNameYears} onValueChange={setSelectedExamNameYears}>
                      <SelectTrigger className="border-gray-300 h-10">
                        <SelectValue placeholder="Choose an exam name" />
                      </SelectTrigger>
                      <SelectContent>
                        {examsForModule
                          .filter(e => e.examType === "years" || !e.examType)
                          .map((exam) => (
                            <SelectItem key={exam._id} value={exam._id}>
                              {exam.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {examType === "courses" && (
                  <>
                    <div className="space-y-2">
                      <Label className="font-semibold text-foreground">Category *</Label>
                      <Select value={selectedCategory} onValueChange={(e) => {
                        setSelectedCategory(e);
                        setSelectedCourse("");
                        setSelectedYearName("");
                      }}>
                        <SelectTrigger className="border-gray-300 h-10">
                          <SelectValue placeholder="Choose a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categoryOptions.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold text-foreground">Course *</Label>
                      <Select value={selectedCourse} onValueChange={(e) => {
                        setSelectedCourse(e);
                        setSelectedYearName("");
                      }} disabled={!selectedCategory}>
                        <SelectTrigger className="border-gray-300 h-10 disabled:bg-muted">
                          <SelectValue placeholder="Choose a course" />
                        </SelectTrigger>
                        <SelectContent>
                          {courseOptions.map((course) => (
                            <SelectItem key={course._id} value={course._id}>{course.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold text-foreground">Year (optional)</Label>
                      <Select value={selectedYearName} onValueChange={setSelectedYearName} disabled={!selectedCourse}>
                        <SelectTrigger className="border-gray-300 h-10 disabled:bg-muted">
                          <SelectValue placeholder="Choose a year" />
                        </SelectTrigger>
                        <SelectContent>
                          {yearNames.map((y) => (
                            <SelectItem key={y} value={y}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {examType === "qcm" && (
                  <div className="space-y-2 md:col-span-2">
                    <Label className="font-semibold text-foreground">QCM Name *</Label>
                    <Select value={selectedQCMName} onValueChange={setSelectedQCMName}>
                      <SelectTrigger className="border-gray-300 h-10">
                        <SelectValue placeholder="Choose a QCM name" />
                      </SelectTrigger>
                      <SelectContent>
                        {qcmForModule
                          .map((qcm) => (
                            <SelectItem key={qcm._id} value={qcm._id}>
                              {qcm.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Details Card */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg">
              <CardTitle className="text-xl font-bold text-foreground">
                Content Details
              </CardTitle>
              <CardDescription>
                Add question numbers and at least one of: text, images (max {MAX_IMAGES}), or PDF
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {/* Question Numbers */}
                <div className="space-y-2">
                  <Label className="font-semibold text-foreground flex items-center gap-2">
                    <Type className="w-4 h-4" />
                    Question Numbers *
                  </Label>
                  <Input
                    placeholder="e.g. 1-5,7,10"
                    value={questionNumbers}
                    onChange={(e) => setQuestionNumbers(e.target.value)}
                    className="h-10 border-gray-300"
                  />
                  <p className="text-xs text-muted-foreground">Specify which questions this explanation covers</p>
                </div>

                {/* Explication Text */}
                <div className="space-y-2">
                  <Label className="font-semibold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Explanation Text (optionnel)
                  </Label>
                  <textarea
                    className="w-full rounded-md border border-gray-300 bg-card p-3 text-sm font-mono"
                    rows={5}
                    placeholder="Enter explanation text (optionnel si vous ajoutez des images ou un PDF)..."
                    value={explicationText}
                    onChange={(e) => setExplicationText(e.target.value)}
                  />
                </div>

                {/* Image Upload */}
                <div className="space-y-2">
                  <Label className="font-semibold text-foreground flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Upload Images (optionnel, max {MAX_IMAGES})
                  </Label>
                  <div 
                    className="border-2 border-dashed border-purple-300 rounded-lg p-6 bg-purple-50 hover:bg-purple-100 transition-colors cursor-pointer"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => imageFiles.length < MAX_IMAGES && document.getElementById('images-input')?.click()}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <Upload className="w-8 h-8 text-purple-600" />
                      <div className="text-center">
                        <p className="font-semibold text-foreground">Drop images here or click to browse</p>
                        <p className="text-sm text-muted-foreground">Supports JPG, PNG, GIF, WebP (max {MAX_IMAGES} images)</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          const remainingSlots = MAX_IMAGES - imageFiles.length;
                          if (remainingSlots <= 0) {
                            toast.error(`Maximum ${MAX_IMAGES} images autorisées`);
                            return;
                          }
                          const toAdd = files.slice(0, remainingSlots);
                          setImageFiles(prev => [...prev, ...toAdd]);
                          if (files.length > remainingSlots) {
                            toast.warning(`Seulement ${remainingSlots} image(s) ajoutée(s)`);
                          }
                          e.target.value = '';
                        }}
                        className="hidden"
                        id="images-input"
                        disabled={imageFiles.length >= MAX_IMAGES}
                      />
                      <Button 
                        variant="outline" 
                        className="bg-card hover:bg-purple-50" 
                        type="button"
                        disabled={imageFiles.length >= MAX_IMAGES}
                        onClick={(e) => {
                          e.stopPropagation();
                          document.getElementById('images-input')?.click();
                        }}
                      >
                        Browse Files
                      </Button>
                    </div>
                  </div>

                  {/* Image Preview */}
                  {imageFiles.length > 0 && (
                    <Motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3"
                    >
                      {imageFiles.map((file, index) => (
                        <Motion.div
                          key={index}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="relative group"
                        >
                          <div className="bg-muted rounded-lg overflow-hidden aspect-square">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 truncate">{file.name}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </Motion.div>
                      ))}
                    </Motion.div>
                  )}

                  {imageFiles.length > 0 && (
                    <Badge className="mt-2 bg-purple-100 text-purple-800">
                      {imageFiles.length}/{MAX_IMAGES} image{imageFiles.length !== 1 ? 's' : ''} selected
                    </Badge>
                  )}
                </div>

                {/* PDF Upload */}
                <div className="space-y-2">
                  <Label className="font-semibold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Upload PDF (optionnel, max {MAX_PDF})
                  </Label>
                  <input
                    type="file"
                    ref={pdfInputRef}
                    onChange={handlePdfUpload}
                    accept=".pdf,.pptx,.ppt,.doc,.docx"
                    className="hidden"
                  />
                  {!pdfFile ? (
                    <div 
                      className="border-2 border-dashed border-red-200 rounded-lg p-4 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
                      onClick={() => pdfInputRef.current?.click()}
                    >
                      <div className="flex items-center justify-center gap-3">
                        <FileText className="w-6 h-6 text-red-500" />
                        <div>
                          <p className="font-medium text-foreground">Click to upload Document</p>
                          <p className="text-sm text-muted-foreground">PDF, PPTX, DOC, DOCX</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <FileText className="w-6 h-6 text-red-600" />
                      <span className="flex-1 text-sm font-medium text-foreground truncate">{pdfFile.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={removePdf}
                        className="text-red-500 hover:text-red-600 hover:bg-red-100"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Explication Name */}
                <div className="space-y-2">
                  <Label className="font-semibold text-foreground">Explication Name *</Label>
                  <Input
                    type="text"
                    placeholder="e.g. Explication - ECG Q1"
                    value={explicationName}
                    onChange={(e) => setExplicationName(e.target.value)}
                    className="h-10 border-gray-300"
                  />
                  <p className="text-xs text-muted-foreground">This will be used to identify the imported explication</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-background rounded-b-lg border-t flex justify-end gap-3">
              <Button variant="outline" className="border-gray-300">
                Cancel
              </Button>
              <Button
                className="bg-gradient-to-r from-purple-600 to-pink-500 text-white hover:from-purple-700 hover:to-pink-600 shadow-md"
                disabled={!canSubmit || uploading}
                onClick={handleSubmit}
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {uploading ? "Importing..." : "Submit Explication"}
              </Button>
            </CardFooter>
          </Card>
        </Motion.div>
      </div>
    </div>
  );
};

export default ImportExplications;
