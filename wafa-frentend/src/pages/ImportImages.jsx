import React, { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { motion } from "framer-motion";
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
import { Save, Upload, ImageIcon, Loader2 } from "lucide-react";
import { api } from "@/lib/utils";
import { toast } from "sonner";

const ImportImages = () => {
  const { t } = useTranslation(['admin', 'common']);

  const [modules, setModules] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [modulesRes, examsRes] = await Promise.all([
        api.get("/modules"),
        api.get("/exams/all")
      ]);
      setModules(modulesRes.data?.data || []);
      setExams(examsRes.data?.data || []);
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
  const [examType, setExamType] = useState(""); // years | courses | tp | qcm

  // years
  const [selectedExamNameYears, setSelectedExamNameYears] = useState("");

  // courses flow
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedYearName, setSelectedYearName] = useState("");

  // tp
  const [selectedTPName, setSelectedTPName] = useState("");
  // qcm
  const [selectedQCMName, setSelectedQCMName] = useState("");

  // common
  const [questionNumbers, setQuestionNumbers] = useState("");
  const [imageFiles, setImageFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Derived lists from actual API data
  const examsForModule = selectedModule ? getExamsForModule(selectedModule) : [];
  
  // Get categories for Exam par Courses
  const categoryOptions = examType === "courses"
    ? [...new Set(examsForModule.filter(e => e.category).map(e => e.category))]
    : [];
  
  // Get courses for selected category  
  const courseOptions = selectedCategory
    ? [...new Set(examsForModule.filter(e => e.category === selectedCategory && e.courseName).map(e => e.courseName))]
    : [];
    
  // Year options for courses
  const yearNames = ["2020", "2021", "2022", "2023", "2024", "2025"];

  const hasContextSelected = (() => {
    if (!selectedModule || !examType) return false;
    if (examType === "years") return !!selectedExamNameYears;
    if (examType === "courses")
      return !!(selectedCategory && selectedCourse && selectedYearName);
    if (examType === "tp") return !!selectedTPName;
    if (examType === "qcm") return !!selectedQCMName;
    return false;
  })();

  const canSubmit =
    hasContextSelected &&
    questionNumbers.trim().length > 0 &&
    imageFiles.length > 0;

  const handleSubmit = async () => {
    // Determine examId based on exam type
    let examId = null;
    if (examType === "years") examId = selectedExamNameYears;
    else if (examType === "tp") examId = selectedTPName;
    else if (examType === "qcm") examId = selectedQCMName;
    // For courses, we need to find the exam course ID
    
    if (!examId && examType !== "courses") {
      toast.error("Veuillez sélectionner un examen");
      return;
    }
    
    try {
      setUploading(true);
      
      // 1. Upload images to local storage
      const formData = new FormData();
      imageFiles.forEach(file => {
        formData.append('images', file);
      });
      
      // Don't set Content-Type manually - let axios handle it for FormData
      const uploadRes = await api.post('/questions/upload-images', formData);
      
      if (!uploadRes.data.success) {
        throw new Error("Échec du téléchargement des images");
      }
      
      const imageUrls = uploadRes.data.data.map(img => img.url);
      
      // 2. Attach images to questions
      await api.post('/questions/attach-images', {
        examId,
        imageUrls,
        questionNumbers
      });
      
      toast.success(`${imageFiles.length} image(s) téléchargée(s) et attachée(s) avec succès`);
      
      // Reset form
      setImageFiles([]);
      setQuestionNumbers("");
    } catch (error) {
      console.error("Error uploading images:", error);
      toast.error(error.response?.data?.message || "Erreur lors du téléchargement");
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    const droppedImages = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (droppedImages.length > 0) {
      setImageFiles(prev => [...prev, ...droppedImages]);
    }
  };

  const removeImage = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-card">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Import Images</h2>
            <p className="text-muted-foreground">Select module and exam context, specify question numbers, then upload images.</p>
          </div>
        </div>

        {/* Main Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-6"
        >
          {/* Context Card */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-cyan-50 to-teal-50 rounded-t-lg">
              <CardTitle className="text-xl font-bold text-foreground">
                Exam Context
              </CardTitle>
              <CardDescription>
                Choose the exam context: par years, par courses, TP or QCM
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
                    setSelectedTPName("");
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
                    setSelectedTPName("");
                    setSelectedQCMName("");
                  }} disabled={!selectedModule}>
                    <SelectTrigger className="border-gray-300 h-10 disabled:bg-muted">
                      <SelectValue placeholder={selectedModule ? "Choose exam type" : "Select module first"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="years">Exam Par Years</SelectItem>
                      <SelectItem value="courses">Exam Par Courses</SelectItem>
                      <SelectItem value="tp">Exam TP</SelectItem>
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
                          .filter(e => !e.examType || e.examType === "years")
                          .map((exam) => (
                            <SelectItem key={exam._id} value={exam._id}>
                              {exam.name} {exam.year ? `(${exam.year})` : ''}
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
                          {courseOptions.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold text-foreground">Year *</Label>
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

                {examType === "tp" && (
                  <div className="space-y-2 md:col-span-2">
                    <Label className="font-semibold text-foreground">TP Name *</Label>
                    <Select value={selectedTPName} onValueChange={setSelectedTPName}>
                      <SelectTrigger className="border-gray-300 h-10">
                        <SelectValue placeholder="Choose a TP name" />
                      </SelectTrigger>
                      <SelectContent>
                        {examsForModule
                          .filter(e => e.examType === "tp" || e.contentType === "tp")
                          .map((exam) => (
                            <SelectItem key={exam._id} value={exam._id}>
                              {exam.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {examType === "qcm" && (
                  <div className="space-y-2 md:col-span-2">
                    <Label className="font-semibold text-foreground">QCM Name *</Label>
                    <Select value={selectedQCMName} onValueChange={setSelectedQCMName}>
                      <SelectTrigger className="border-gray-300 h-10">
                        <SelectValue placeholder="Choose a QCM name" />
                      </SelectTrigger>
                      <SelectContent>
                        {examsForModule
                          .filter(e => e.examType === "qcm" || e.contentType === "qcm")
                          .map((exam) => (
                            <SelectItem key={exam._id} value={exam._id}>
                              {exam.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Images Card */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-cyan-50 to-teal-50 rounded-t-lg">
              <CardTitle className="text-xl font-bold text-foreground">
                Question Images
              </CardTitle>
              <CardDescription>
                Provide question numbers and upload one or more images
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {/* Question Numbers */}
                <div className="space-y-2">
                  <Label className="font-semibold text-foreground">Question Numbers *</Label>
                  <Input
                    placeholder="e.g. 1-5,7,10"
                    value={questionNumbers}
                    onChange={(e) => setQuestionNumbers(e.target.value)}
                    className="h-10 border-gray-300"
                  />
                  <p className="text-xs text-muted-foreground">Specify which questions these images correspond to</p>
                </div>

                {/* Image Upload Section */}
                <div className="space-y-2">
                  <Label className="font-semibold text-foreground flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Upload Images *
                  </Label>
                  <div 
                    className="border-2 border-dashed border-cyan-300 rounded-lg p-8 bg-cyan-50 hover:bg-cyan-100 transition-colors cursor-pointer"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('images-input')?.click()}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <Upload className="w-10 h-10 text-cyan-600" />
                      <div className="text-center">
                        <p className="font-semibold text-foreground">Drop images here or click to browse</p>
                        <p className="text-sm text-muted-foreground">Supports JPG, PNG, GIF, WebP (multiple files)</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          const newFiles = Array.from(e.target.files || []);
                          if (newFiles.length > 0) {
                            setImageFiles(prev => [...prev, ...newFiles]);
                          }
                          e.target.value = '';
                        }}
                        className="hidden"
                        id="images-input"
                      />
                      <Button 
                        variant="outline" 
                        className="bg-card hover:bg-cyan-50" 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          document.getElementById('images-input')?.click();
                        }}
                      >
                        Browse Files
                      </Button>
                    </div>
                  </div>

                  {/* Image Preview Grid */}
                  {imageFiles.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-6"
                    >
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {imageFiles.map((file, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="group relative"
                          >
                            <div className="bg-muted rounded-lg overflow-hidden aspect-square shadow-md hover:shadow-lg transition-shadow">
                              <img
                                src={URL.createObjectURL(file)}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 truncate font-medium" title={file.name}>
                              {file.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => removeImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                            >
                              ×
                            </motion.button>
                          </motion.div>
                        ))}
                      </div>

                      {/* Images Summary */}
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 flex items-center gap-3 p-3 bg-cyan-50 border border-cyan-200 rounded-lg"
                      >
                        <ImageIcon className="w-5 h-5 text-cyan-600 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-cyan-900">Images Ready</p>
                          <p className="text-sm text-cyan-700">
                            {imageFiles.length} image{imageFiles.length !== 1 ? 's' : ''} selected •{" "}
                            {(imageFiles.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(2)} MB total
                          </p>
                        </div>
                        <Badge className="bg-cyan-100 text-cyan-800">Ready</Badge>
                      </motion.div>
                    </motion.div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-background rounded-b-lg border-t flex justify-end gap-3">
              <Button variant="outline" className="border-gray-300">
                Cancel
              </Button>
              <Button
                className="bg-gradient-to-r from-cyan-600 to-teal-500 text-white hover:from-cyan-700 hover:to-teal-600 shadow-md"
                disabled={!canSubmit || uploading}
                onClick={handleSubmit}
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {uploading ? "Uploading..." : "Submit Images"}
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default ImportImages;
