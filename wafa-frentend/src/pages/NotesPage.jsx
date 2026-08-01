import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  Trash2, Search, Pin, NotebookPen, Plus, Calendar, Clock, FileText, Zap,
  Filter, ChevronDown, X, Eye, Edit2, BookOpen, CheckCircle2, Tag
} from "lucide-react";
import { debounce } from "lodash";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn, api } from "@/lib/utils";

const NotesPage = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const [notes, setNotes] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNote, setSelectedNote] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [autoSaving, setAutoSaving] = useState(false);
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  // Filter states
  const [filterType, setFilterType] = useState("recent"); // recent, module, date
  const [selectedModule, setSelectedModule] = useState("all");
  const [selectedExamName, setSelectedExamName] = useState("all");
  const [selectedQuestionNumber, setSelectedQuestionNumber] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  // Modal states
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [questionPreview, setQuestionPreview] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);

  useEffect(() => {
    fetchNotes();
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const { data } = await api.get('/modules');
      setModules(data.data || []);
    } catch (error) {
      console.error("Error fetching modules:", error);
    }
  };

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/notes");
      setNotes(data.data || []);
    } catch (error) {
      console.error("Error fetching notes:", error);
      toast.error(t('dashboard:error_loading_notes'));
    } finally {
      setLoading(false);
    }
  };

  const autoSaveNote = useCallback(
    debounce(async (noteId, content) => {
      if (!content.trim()) return;
      setAutoSaving(true);
      try {
        await api.put(`/notes/${noteId}`, { content });
        toast.success(t('dashboard:note_auto_saved'));
      } catch (error) {
        console.error("Auto-save failed:", error);
        toast.error(t('dashboard:auto_save_failed'));
      } finally {
        setTimeout(() => setAutoSaving(false), 500);
      }
    }, 3000),
    []
  );

  const handleContentChange = (content) => {
    setEditContent(content);
    if (selectedNote) {
      autoSaveNote(selectedNote._id, content);
      setNotes((prevNotes) =>
        prevNotes.map((note) =>
          note._id === selectedNote._id
            ? { ...note, content, updatedAt: new Date().toISOString() }
            : note
        )
      );
    }
  };

  const selectNote = (note) => {
    setSelectedNote(note);
    setEditContent(note.content);
    setEditTitle(note.title || "Sans titre");
  };

  const deleteNote = async (noteId) => {
    if (!confirm(t('dashboard:confirm_delete_note'))) return;
    
    try {
      await api.delete(`/notes/${noteId}`);
      setNotes((prevNotes) => prevNotes.filter((note) => note._id !== noteId));
      if (selectedNote?._id === noteId) {
        setSelectedNote(null);
        setEditContent("");
        setEditTitle("");
      }
      toast.success(t('dashboard:note_deleted_success'));
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error(t('dashboard:note_delete_failed'));
    }
  };

  const togglePin = async (noteId, currentPinned) => {
    try {
      await api.put(`/notes/${noteId}`, { isPinned: !currentPinned });
      setNotes((prevNotes) =>
        prevNotes.map((note) =>
          note._id === noteId ? { ...note, isPinned: !currentPinned } : note
        )
      );
      if (selectedNote?._id === noteId) {
        setSelectedNote((prev) => ({ ...prev, isPinned: !currentPinned }));
      }
      toast.success(
        !currentPinned ? "Note épinglée" : "Note désépinglée"
      );
    } catch (error) {
      console.error("Toggle pin failed:", error);
      toast.error("Échec de l'épinglage");
    }
  };

  const saveTitle = async () => {
    if (!selectedNote || !editTitle.trim()) return;
    
    try {
      setIsSavingTitle(true);
      await api.put(`/notes/${selectedNote._id}`, { 
        title: editTitle.trim() 
      });
      
      setNotes((prevNotes) =>
        prevNotes.map((note) =>
          note._id === selectedNote._id
            ? { ...note, title: editTitle.trim() }
            : note
        )
      );
      
      setSelectedNote((prev) => ({
        ...prev,
        title: editTitle.trim()
      }));
      
      toast.success("Titre mis à jour");
    } catch (error) {
      console.error("Save title failed:", error);
      toast.error("Échec de la sauvegarde du titre");
    } finally {
      setIsSavingTitle(false);
    }
  };

  const createNewNote = async () => {
    try {
      const { data } = await api.post("/notes", { 
        title: "Nouvelle note",
        content: t('dashboard:new_note_placeholder') || "Commencez à taper...",
        questionId: null,
        moduleId: null,
        tags: [],
        color: "#fbbf24"
      });
      
      const newNote = data.data || data;
      
      setNotes((prevNotes) => [newNote, ...prevNotes]);
      selectNote(newNote);
      toast.success(t('dashboard:new_note_created'));
    } catch (error) {
      console.error("Create note failed:", error.response?.data || error.message);
      toast.error(t('dashboard:note_create_failed'));
    }
  };

  // View question in modal
  const viewQuestion = async (note) => {
    if (!note.questionId) {
      toast.info("Cette note n'est pas liée à une question");
      return;
    }

    try {
      const questionId = note.questionId._id || note.questionId;
      const { data } = await api.get(`/questions/${questionId}`);
      setQuestionPreview({
        question: data.data,
        note: note
      });
      setShowQuestionModal(true);
    } catch (error) {
      console.error("Error fetching question:", error);
      toast.error("Impossible de charger la question");
    }
  };

  // Open edit modal
  const openEditModal = (note) => {
    setEditingNote({ ...note });
    setShowEditModal(true);
  };

  // Save edited note
  const saveEditedNote = async () => {
    if (!editingNote) return;

    try {
      await api.put(`/notes/${editingNote._id}`, { 
        title: editingNote.title,
        content: editingNote.content 
      });
      
      setNotes((prevNotes) =>
        prevNotes.map((note) =>
          note._id === editingNote._id ? { ...note, ...editingNote } : note
        )
      );
      
      setShowEditModal(false);
      setEditingNote(null);
      toast.success("Note mise à jour");
    } catch (error) {
      console.error("Save failed:", error);
      toast.error("Échec de la sauvegarde");
    }
  };

  // Get unique modules from notes
  const getUniqueModules = () => {
    const moduleNames = new Set();
    notes.forEach(note => {
      if (note.moduleId?.name) {
        moduleNames.add(note.moduleId.name);
      }
    });
    return Array.from(moduleNames).sort();
  };

  // Get unique exam names from notes
  const getExamNames = () => {
    const names = new Set();
    notes.forEach(note => {
      if (note.questionId?.examId) {
        const examName = note.questionId.examId.name || 
                        note.questionId.examId.title || 
                        (note.questionId.examId.year ? `Examen ${note.questionId.examId.year}` : null);
        if (examName) names.add(examName);
      }
    });
    return Array.from(names);
  };

  // Get unique question numbers from notes
  const getQuestionNumbers = () => {
    const numbers = new Set();
    notes.forEach(note => {
      if (note.questionId?.questionNumber) {
        numbers.add(note.questionId.questionNumber);
      }
    });
    return Array.from(numbers).sort((a, b) => a - b);
  };

  // Filter notes
  const filteredNotes = notes.filter((note) => {
    // Search filter
    const searchLower = searchQuery.toLowerCase();
    if (searchQuery && 
        !note.content?.toLowerCase().includes(searchLower) &&
        !note.title?.toLowerCase().includes(searchLower)) {
      return false;
    }

    // Module filter
    if (selectedModule !== "all") {
      if (!note.moduleId?.name || note.moduleId.name !== selectedModule) return false;
    }

    // Exam Name filter
    if (selectedExamName !== "all") {
      const examName = note.questionId?.examId?.name || 
                      note.questionId?.examId?.title || 
                      (note.questionId?.examId?.year ? `Examen ${note.questionId.examId.year}` : null);
      if (!examName || examName !== selectedExamName) return false;
    }

    // Question Number filter
    if (selectedQuestionNumber && selectedQuestionNumber !== "all") {
      const qNumber = note.questionId?.questionNumber;
      if (!qNumber || qNumber.toString() !== selectedQuestionNumber.toString()) return false;
    }

    // Date filter
    if (filterType === "date" && dateFilter) {
      const noteDate = new Date(note.createdAt).toISOString().split('T')[0];
      if (noteDate !== dateFilter) return false;
    }

    return true;
  });

  // Sort notes: pinned first, then by date
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const pinnedNotes = sortedNotes.filter((note) => note.isPinned);
  const unpinnedNotes = sortedNotes.filter((note) => !note.isPinned);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
              <NotebookPen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Vos notes</h1>
              <p className="text-sm text-muted-foreground">Sélectionnez une note pour l'éditer</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              {notes.length} notes
            </Badge>
            <Button onClick={createNewNote} className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
              <Plus className="h-4 w-4" />
              Nouvelle note
            </Button>
          </div>
        </div>

        {/* Filters Section */}
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher une note..."
                  className="pl-10 bg-background"
                />
              </div>

              {/* Filter Row */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Filter Type Tabs */}
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                  <button
                    onClick={() => {
                      setFilterType("recent");
                      setSelectedModule("all");
                      setSelectedExamName("all");
                      setSelectedQuestionNumber("all");
                    }}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                      filterType === "recent" 
                        ? "bg-background text-blue-600 shadow-sm" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Récent
                  </button>
                  <button
                    onClick={() => setFilterType("module")}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                      filterType === "module" 
                        ? "bg-background text-blue-600 shadow-sm" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Module
                  </button>
                  <button
                    onClick={() => {
                      setFilterType("date");
                      setSelectedModule("all");
                      setSelectedExamName("all");
                      setSelectedQuestionNumber("all");
                    }}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1",
                      filterType === "date" 
                        ? "bg-background text-blue-600 shadow-sm" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    Filtrer par date
                  </button>
                </div>

                {/* Divider */}
                <div className="h-8 w-px bg-slate-200" />

                {/* Filter Button */}
                <Badge variant="outline" className="text-muted-foreground h-8 px-3">
                  <Filter className="h-3 w-3 mr-1" />
                  Filter
                </Badge>
              </div>

              {/* Second Row - Dropdowns */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Module Filter */}
                <Select 
                  value={selectedModule} 
                  onValueChange={setSelectedModule}
                >
                  <SelectTrigger className="w-[180px] bg-background">
                    <SelectValue placeholder="Module" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All modules</SelectItem>
                    {getUniqueModules().map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Exam Name Filter */}
                <Select 
                  value={selectedExamName} 
                  onValueChange={setSelectedExamName}
                >
                  <SelectTrigger className="w-[160px] bg-background">
                    <SelectValue placeholder="Exam Name" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All exams</SelectItem>
                    {getExamNames().map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Number of Question Filter */}
                <Select value={selectedQuestionNumber} onValueChange={setSelectedQuestionNumber}>
                  <SelectTrigger className="w-[180px] bg-background">
                    <SelectValue placeholder="Number of Question" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All questions</SelectItem>
                    {getQuestionNumbers().map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        Question {num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Date Filter */}
                {filterType === "date" && (
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-[160px] bg-background"
                  />
                )}

                {/* Filter indicator */}
                <div className="ml-auto">
                  <Badge variant="outline" className="text-muted-foreground">
                    {sortedNotes.length} résultat{sortedNotes.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes Grid */}
        <div className="space-y-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-64 w-full rounded-xl" />
              ))}
            </div>
          ) : sortedNotes.length === 0 ? (
            <Card className="border-border">
              <CardContent className="p-12 text-center">
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <div className="p-4 bg-muted rounded-full">
                      <FileText className="h-10 w-10 text-slate-400" />
                    </div>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-muted-foreground">
                      {searchQuery ? "Aucune note trouvée" : "Aucune note"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {searchQuery ? "Essayez avec d'autres mots-clés" : "Créez votre première note"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Pinned Section */}
              {pinnedNotes.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Pin className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                      Épinglées ({pinnedNotes.length})
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {pinnedNotes.map((note) => (
                      <NoteCard
                        key={note._id}
                        note={note}
                        onDelete={() => deleteNote(note._id)}
                        onViewQuestion={() => viewQuestion(note)}
                        onEdit={() => openEditModal(note)}
                        onTogglePin={() => togglePin(note._id, note.isPinned)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Unpinned Notes */}
              <div>
                {pinnedNotes.length > 0 && (
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
                    Autres ({unpinnedNotes.length})
                  </h3>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {unpinnedNotes.map((note) => (
                    <NoteCard
                      key={note._id}
                      note={note}
                      onDelete={() => deleteNote(note._id)}
                      onViewQuestion={() => viewQuestion(note)}
                      onEdit={() => openEditModal(note)}
                      onTogglePin={() => togglePin(note._id, note.isPinned)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Question Preview Modal */}
        <Dialog open={showQuestionModal} onOpenChange={setShowQuestionModal}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                Question liée à la note
              </DialogTitle>
            </DialogHeader>
            {questionPreview && (
              <div className="space-y-4">
                {/* Question Text */}
                <div className="p-4 bg-card rounded-lg">
                  <p className="font-medium text-foreground">
                    {questionPreview.question?.text || "Question non disponible"}
                  </p>
                </div>

                {/* Options */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Choix:</p>
                  {questionPreview.question?.options?.map((option, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "p-3 rounded-lg border-2 transition-all",
                        option.isCorrect
                          ? "bg-emerald-50 border-emerald-400 text-emerald-800"
                          : "bg-background border-border text-muted-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {option.isCorrect && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                        )}
                        <span className="text-sm">{option.text}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Note Content */}
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2 mb-2">
                    <NotebookPen className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">Votre note:</span>
                  </div>
                  <p className="text-sm text-yellow-900">
                    {questionPreview.note?.content || "Aucun contenu"}
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Note Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-blue-600" />
                Modifier la note
              </DialogTitle>
            </DialogHeader>
            {editingNote && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">
                    Titre
                  </label>
                  <Input
                    value={editingNote.title || ""}
                    onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                    placeholder="Titre de la note..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">
                    Contenu
                  </label>
                  <Textarea
                    value={editingNote.content || ""}
                    onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                    placeholder="Contenu de la note..."
                    className="min-h-[200px]"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowEditModal(false)}>
                    Annuler
                  </Button>
                  <Button onClick={saveEditedNote} className="bg-blue-600 hover:bg-blue-700">
                    Sauvegarder
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

// Note Card Component - Redesigned per requirements
const NoteCard = ({ note, onDelete, onViewQuestion, onEdit, onTogglePin }) => {
  const getModuleInfo = () => {
    if (note.moduleId) {
      return {
        name: note.moduleId.name,
        semester: note.moduleId.semester
      };
    }
    return null;
  };

  const getExamInfo = () => {
    if (note.questionId?.examId) {
      const exam = note.questionId.examId;
      return exam.name || exam.title || (exam.year ? `Examen ${exam.year}` : null);
    }
    return null;
  };

  const getQuestionNumber = () => {
    return note.questionId?.questionNumber || null;
  };

  const moduleInfo = getModuleInfo();
  const examInfo = getExamInfo();
  const questionNumber = getQuestionNumber();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-background rounded-xl border-2 border-border hover:border-blue-300 transition-all shadow-sm hover:shadow-md overflow-hidden flex flex-col h-full"
    >
      {/* Date Header */}
      <div className="px-4 py-2 bg-card border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>{new Date(note.createdAt).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          })}</span>
        </div>
        {note.isPinned && (
          <Pin className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
        )}
      </div>

      {/* Context Reference - Organized */}
      {(moduleInfo || examInfo || questionNumber) && (
        <div className="px-4 pt-3 pb-2 space-y-2 flex-shrink-0">
          {/* Module + Exam on same line when both exist */}
          {moduleInfo && examInfo ? (
            <div className="flex items-center gap-2 px-2 py-1.5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-md border border-blue-200">
              <BookOpen className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-blue-900 truncate">
                  {moduleInfo.name} {moduleInfo.semester && `(${moduleInfo.semester})`}
                </p>
                <p className="text-xs text-purple-700 truncate">{examInfo}</p>
              </div>
            </div>
          ) : (
            <>
              {moduleInfo && (
                <div className="flex items-center gap-2 px-2 py-1.5 bg-blue-50 rounded-md border border-blue-200">
                  <BookOpen className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-blue-900">{moduleInfo.name}</p>
                    {moduleInfo.semester && <p className="text-xs text-blue-700">{moduleInfo.semester}</p>}
                  </div>
                </div>
              )}
              {examInfo && (
                <div className="flex items-center gap-2 px-2 py-1.5 bg-purple-50 rounded-md border border-purple-200">
                  <Tag className="h-3.5 w-3.5 text-purple-600 flex-shrink-0" />
                  <p className="text-xs font-medium text-purple-900">{examInfo}</p>
                </div>
              )}
            </>
          )}
          
          {/* Question Reference */}
          {questionNumber && (
            <div className="flex items-center gap-2 px-2 py-1.5 bg-amber-50 rounded-md border border-amber-200">
              <FileText className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
              <p className="text-xs font-medium text-amber-900">Question #{questionNumber}</p>
            </div>
          )}
        </div>
      )}

      {/* Note Content */}
      <div className="p-4 flex-1 overflow-hidden">
        <h3 className="font-bold text-base text-foreground mb-3 line-clamp-2">
          {note.title || "Sans titre"}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-4 min-h-[4rem] leading-relaxed">
          {note.content || "Aucun contenu"}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="px-4 pb-3 flex flex-col gap-2 border-t border-border pt-3 flex-shrink-0">
        {/* View Question Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onViewQuestion}
          className="w-full h-8 text-xs gap-1"
          disabled={!note.questionId}
        >
          <Eye className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Question</span>
        </Button>

        {/* Edit Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          className="w-full h-8 text-xs gap-1"
        >
          <Edit2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Modifier</span>
        </Button>

        {/* Delete Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          className="w-full h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 gap-1"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Supprimer</span>
        </Button>
      </div>
    </motion.div>
  );
};

export default NotesPage;

