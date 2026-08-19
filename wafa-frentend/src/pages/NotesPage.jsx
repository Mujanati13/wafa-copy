import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  Trash2, Search, Pin, NotebookPen, Plus, Calendar, Clock, FileText, Zap,
  Filter, ChevronDown, X, Eye, Edit2, BookOpen, CheckCircle2, Tag, Sparkles, Folder
} from "lucide-react";
import { debounce } from "lodash";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn, api } from "@/lib/utils";

const NotesPage = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const [notes, setNotes] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter states
  const [filterType, setFilterType] = useState("all"); // all, recent, module, date
  const [selectedModule, setSelectedModule] = useState("all");
  const [selectedExamName, setSelectedExamName] = useState("all");
  const [selectedQuestionNumber, setSelectedQuestionNumber] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  // Modal states
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [questionPreview, setQuestionPreview] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newNoteData, setNewNoteData] = useState({ title: "", content: "" });
  const [savingNote, setSavingNote] = useState(false);

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
      toast.error("Impossible de charger les notes");
    } finally {
      setLoading(false);
    }
  };

  const deleteNote = async (noteId, e) => {
    if (e) e.stopPropagation();
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette note ?")) return;
    
    try {
      await api.delete(`/notes/${noteId}`);
      setNotes((prevNotes) => prevNotes.filter((note) => note._id !== noteId));
      toast.success("Note supprimée avec succès");
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Échec de la suppression");
    }
  };

  const togglePin = async (noteId, currentPinned, e) => {
    if (e) e.stopPropagation();
    try {
      await api.put(`/notes/${noteId}`, { isPinned: !currentPinned });
      setNotes((prevNotes) =>
        prevNotes.map((note) =>
          note._id === noteId ? { ...note, isPinned: !currentPinned } : note
        )
      );
      toast.success(!currentPinned ? "Note épinglée" : "Note désépinglée");
    } catch (error) {
      console.error("Pin toggle failed:", error);
      toast.error("Impossible de modifier l'épinglage");
    }
  };

  const openCreateModal = () => {
    setNewNoteData({ title: "", content: "" });
    setShowCreateModal(true);
  };

  const createNote = async (e) => {
    if (e) e.preventDefault();
    if (!newNoteData.content.trim() && !newNoteData.title.trim()) {
      toast.error("Veuillez saisir un titre ou du contenu pour votre note");
      return;
    }

    setSavingNote(true);
    try {
      const { data } = await api.post("/notes", {
        title: newNoteData.title.trim() || "Sans titre",
        content: newNoteData.content.trim(),
      });
      setShowCreateModal(false);
      setNewNoteData({ title: "", content: "" });
      toast.success("Note créée avec succès");
      await fetchNotes();
    } catch (error) {
      console.error("Error creating note:", error);
      toast.error("Impossible de créer la note");
    } finally {
      setSavingNote(false);
    }
  };

  const openEditModal = (note, e) => {
    if (e) e.stopPropagation();
    setEditingNote({ ...note });
    setShowEditModal(true);
  };

  const saveEditedNote = async (e) => {
    if (e) e.preventDefault();
    if (!editingNote) return;

    setSavingNote(true);
    try {
      await api.put(`/notes/${editingNote._id}`, {
        title: editingNote.title?.trim() || "Sans titre",
        content: editingNote.content?.trim() || "",
      });
      setNotes((prevNotes) =>
        prevNotes.map((note) =>
          note._id === editingNote._id ? { ...note, ...editingNote } : note
        )
      );
      setShowEditModal(false);
      setEditingNote(null);
      toast.success("Note enregistrée avec succès");
    } catch (error) {
      console.error("Error updating note:", error);
      toast.error("Impossible d'enregistrer la note");
    } finally {
      setSavingNote(false);
    }
  };

  const viewQuestion = (note, e) => {
    if (e) e.stopPropagation();
    if (note.questionId) {
      setQuestionPreview({
        question: note.questionId,
        note: note,
      });
      setShowQuestionModal(true);
    }
  };

  const getUniqueModules = () => {
    const moduleNames = new Set();
    notes.forEach((note) => {
      if (note.moduleId?.name) {
        moduleNames.add(note.moduleId.name);
      }
    });
    return Array.from(moduleNames);
  };

  const getExamNames = () => {
    const examNames = new Set();
    notes.forEach((note) => {
      const exam = note.questionId?.examId;
      if (exam) {
        const name = exam.name || exam.title || (exam.year ? `Examen ${exam.year}` : null);
        if (name) examNames.add(name);
      }
    });
    return Array.from(examNames);
  };

  const filteredNotes = notes.filter((note) => {
    const searchLower = searchQuery.toLowerCase();
    if (searchQuery && 
        !note.content?.toLowerCase().includes(searchLower) &&
        !note.title?.toLowerCase().includes(searchLower)) {
      return false;
    }

    if (selectedModule !== "all") {
      if (!note.moduleId?.name || note.moduleId.name !== selectedModule) return false;
    }

    if (selectedExamName !== "all") {
      const examName = note.questionId?.examId?.name || 
                      note.questionId?.examId?.title || 
                      (note.questionId?.examId?.year ? `Examen ${note.questionId.examId.year}` : null);
      if (!examName || examName !== selectedExamName) return false;
    }

    if (filterType === "date" && dateFilter) {
      const noteDate = new Date(note.createdAt).toISOString().split('T')[0];
      if (noteDate !== dateFilter) return false;
    }

    return true;
  });

  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const pinnedNotes = sortedNotes.filter((note) => note.isPinned);
  const unpinnedNotes = sortedNotes.filter((note) => !note.isPinned);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 gap-3">
        <Skeleton className="h-12 w-64 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-7xl">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-indigo-500/15 via-card to-card p-6 sm:p-8 shadow-sm"
        >
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Carnet de notes personnel</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
                Mes Notes & Fiches
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Retrouvez l'ensemble des mémos, synthèses et annotations que vous avez pris pendant vos entraînements.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-background/80 border border-border text-xs font-medium backdrop-blur-sm">
                  <NotebookPen className="h-4 w-4 text-indigo-500" />
                  <span>{notes.length} note{notes.length !== 1 ? 's' : ''} au total</span>
                </div>
                {pinnedNotes.length > 0 && (
                  <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-background/80 border border-border text-xs font-medium backdrop-blur-sm">
                    <Pin className="h-4 w-4 text-amber-500 fill-amber-500" />
                    <span>{pinnedNotes.length} épinglée{pinnedNotes.length !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            </div>

            <Button
              onClick={openCreateModal}
              size="lg"
              className="gap-2 shadow-lg shadow-indigo-500/20 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 rounded-2xl h-12 shrink-0"
            >
              <Plus className="h-5 w-5" />
              <span>Nouvelle Note</span>
            </Button>
          </div>
        </motion.div>

        {/* Filter Bar */}
        <Card className="bg-card border-border rounded-3xl shadow-sm overflow-hidden">
          <CardContent className="p-4 sm:p-5 space-y-4">
            {/* Top row: search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par titre ou mot-clé..."
                className="pl-10 h-11 bg-background border-border text-foreground rounded-2xl shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Bottom row: Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {/* Module Filter */}
              <Select value={selectedModule} onValueChange={setSelectedModule}>
                <SelectTrigger className="w-full sm:w-[200px] h-10 bg-background border-border text-foreground rounded-xl">
                  <SelectValue placeholder="Tous les modules" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground rounded-xl">
                  <SelectItem value="all">Tous les modules</SelectItem>
                  {getUniqueModules().map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Exam Filter */}
              <Select value={selectedExamName} onValueChange={setSelectedExamName}>
                <SelectTrigger className="w-full sm:w-[200px] h-10 bg-background border-border text-foreground rounded-xl">
                  <SelectValue placeholder="Tous les examens" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground rounded-xl">
                  <SelectItem value="all">Tous les examens</SelectItem>
                  {getExamNames().map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date Filter option */}
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full sm:w-[160px] h-10 bg-background border-border text-foreground rounded-xl dark:[color-scheme:dark]"
              />

              {dateFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDateFilter("")}
                  className="h-10 text-xs text-muted-foreground hover:text-foreground"
                >
                  Effacer date
                </Button>
              )}

              <div className="ml-auto text-xs text-muted-foreground font-medium">
                {sortedNotes.length} note{sortedNotes.length !== 1 ? 's' : ''} trouvée{sortedNotes.length !== 1 ? 's' : ''}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes Grid */}
        {sortedNotes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl border border-dashed border-border bg-card/60 p-12 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-4 border border-indigo-500/20 text-indigo-500">
              <FileText className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">
              {searchQuery || selectedModule !== "all" || selectedExamName !== "all"
                ? "Aucune note ne correspond aux critères"
                : "Aucune note enregistrée"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Prenez des notes pendant vos sessions de QCM ou créez une fiche de révision dès maintenant.
            </p>
            <Button onClick={openCreateModal} className="gap-2 rounded-xl">
              <Plus className="h-4 w-4" />
              Créer une note
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {/* Pinned Notes Section */}
            {pinnedNotes.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-500 border border-amber-500/30">
                    <Pin className="h-4 w-4 fill-amber-500" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                    Notes épinglées ({pinnedNotes.length})
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  <AnimatePresence mode="popLayout">
                    {pinnedNotes.map((note, index) => (
                      <NoteCard
                        key={note._id}
                        note={note}
                        index={index}
                        onDelete={(e) => deleteNote(note._id, e)}
                        onViewQuestion={(e) => viewQuestion(note, e)}
                        onEdit={(e) => openEditModal(note, e)}
                        onTogglePin={(e) => togglePin(note._id, note.isPinned, e)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Unpinned Notes Section */}
            <div className="space-y-4">
              {pinnedNotes.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-muted text-muted-foreground border border-border">
                    <Folder className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                    Autres notes ({unpinnedNotes.length})
                  </h3>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <AnimatePresence mode="popLayout">
                  {unpinnedNotes.map((note, index) => (
                    <NoteCard
                      key={note._id}
                      note={note}
                      index={index}
                      onDelete={(e) => deleteNote(note._id, e)}
                      onViewQuestion={(e) => viewQuestion(note, e)}
                      onEdit={(e) => openEditModal(note, e)}
                      onTogglePin={(e) => togglePin(note._id, note.isPinned, e)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}

        {/* Create Note Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="bg-card text-card-foreground border border-border sm:max-w-lg rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                <NotebookPen className="h-5 w-5 text-indigo-500" />
                Nouvelle note
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={createNote} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="note-title" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Titre
                </Label>
                <Input
                  id="note-title"
                  placeholder="Ex: Formule clairance rénale..."
                  value={newNoteData.title}
                  onChange={(e) => setNewNoteData({ ...newNoteData, title: e.target.value })}
                  className="bg-background text-foreground border-border rounded-xl h-11"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note-content" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Contenu *
                </Label>
                <Textarea
                  id="note-content"
                  placeholder="Saisissez vos explications, rappels et astuces ici..."
                  value={newNoteData.content}
                  onChange={(e) => setNewNoteData({ ...newNoteData, content: e.target.value })}
                  className="min-h-[160px] bg-background text-foreground border-border rounded-xl resize-none leading-relaxed"
                  required
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} className="rounded-xl border-border">
                  Annuler
                </Button>
                <Button type="submit" disabled={savingNote || (!newNoteData.content.trim() && !newNoteData.title.trim())} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white">
                  {savingNote ? <Clock className="h-4 w-4 animate-spin mr-2" /> : null}
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Note Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="bg-card text-card-foreground border border-border sm:max-w-lg rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-indigo-500" />
                Modifier la note
              </DialogTitle>
            </DialogHeader>
            {editingNote && (
              <form onSubmit={saveEditedNote} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-title" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    Titre
                  </Label>
                  <Input
                    id="edit-title"
                    value={editingNote.title || ""}
                    onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                    placeholder="Titre..."
                    className="bg-background text-foreground border-border rounded-xl h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-content" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    Contenu
                  </Label>
                  <Textarea
                    id="edit-content"
                    value={editingNote.content || ""}
                    onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                    placeholder="Contenu..."
                    className="min-h-[180px] bg-background text-foreground border-border rounded-xl resize-none leading-relaxed"
                  />
                </div>
                <DialogFooter className="gap-2 sm:gap-0 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowEditModal(false)} className="rounded-xl border-border">
                    Annuler
                  </Button>
                  <Button type="submit" disabled={savingNote} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white">
                    {savingNote ? <Clock className="h-4 w-4 animate-spin mr-2" /> : null}
                    Sauvegarder
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Question Preview Modal */}
        <Dialog open={showQuestionModal} onOpenChange={setShowQuestionModal}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-card text-card-foreground border-border rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground text-lg">
                <BookOpen className="h-5 w-5 text-indigo-500" />
                Question liée à la note
              </DialogTitle>
            </DialogHeader>
            {questionPreview && (
              <div className="space-y-4 pt-2">
                <div className="p-4 bg-muted/40 rounded-2xl border border-border">
                  <p className="font-medium text-foreground text-sm sm:text-base leading-relaxed">
                    {questionPreview.question?.text || "Question non disponible"}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Options :</p>
                  {questionPreview.question?.options?.map((option, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "p-3 rounded-xl border transition-all text-xs sm:text-sm flex items-center gap-2.5",
                        option.isCorrect
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-950 dark:text-emerald-200 font-medium"
                          : "bg-background border-border text-foreground"
                      )}
                    >
                      <span className={cn(
                        "w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0",
                        option.isCorrect ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                      )}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="flex-1">{option.text}</span>
                      {option.isCorrect && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Attached Note */}
                <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                    <NotebookPen className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Votre note :</span>
                  </div>
                  <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {questionPreview.note?.content || "Aucun contenu"}
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

// Clean, Responsive NoteCard Component
const NoteCard = ({ note, index, onDelete, onViewQuestion, onEdit, onTogglePin }) => {
  const moduleInfo = note.moduleId?.name ? { name: note.moduleId.name, semester: note.moduleId.semester } : null;
  const examInfo = note.questionId?.examId ? (note.questionId.examId.name || note.questionId.examId.title || (note.questionId.examId.year ? `Examen ${note.questionId.examId.year}` : null)) : null;
  const questionNumber = note.questionId?.questionNumber || null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className="group h-full"
    >
      <Card className={cn(
        "h-full bg-card text-card-foreground border rounded-3xl overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col justify-between",
        note.isPinned 
          ? "border-amber-500/40 shadow-amber-500/5 bg-gradient-to-b from-amber-500/5 via-card to-card" 
          : "border-border hover:border-primary/40"
      )}>
        <div>
          {/* Header Bar */}
          <div className="px-5 py-3 bg-muted/30 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {new Date(note.createdAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>

            <button
              onClick={onTogglePin}
              title={note.isPinned ? "Désépingler" : "Épingler"}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                note.isPinned 
                  ? "text-amber-500 bg-amber-500/15" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Pin className={cn("h-3.5 w-3.5", note.isPinned && "fill-current")} />
            </button>
          </div>

          {/* Context Badges */}
          {(moduleInfo || examInfo || questionNumber) && (
            <div className="px-5 pt-3 pb-1 flex flex-wrap items-center gap-1.5">
              {moduleInfo && (
                <Badge variant="outline" className="text-[11px] bg-primary/10 text-primary border-primary/20 font-medium py-0.5 px-2">
                  <BookOpen className="h-3 w-3 mr-1" />
                  <span className="truncate max-w-[120px]">{moduleInfo.name}</span>
                </Badge>
              )}
              {examInfo && (
                <Badge variant="outline" className="text-[11px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 font-medium py-0.5 px-2">
                  <Tag className="h-3 w-3 mr-1" />
                  <span className="truncate max-w-[120px]">{examInfo}</span>
                </Badge>
              )}
              {questionNumber && (
                <Badge variant="outline" className="text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 font-medium py-0.5 px-2">
                  Q#{questionNumber}
                </Badge>
              )}
            </div>
          )}

          {/* Note Content */}
          <div className="p-5 space-y-2">
            <h3 className="font-bold text-base text-foreground line-clamp-1 group-hover:text-primary transition-colors">
              {note.title || "Sans titre"}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-4 min-h-[48px] leading-relaxed whitespace-pre-wrap">
              {note.content || "Aucun contenu rédigé."}
            </p>
          </div>
        </div>

        {/* Horizontal Action Bar */}
        <div className="px-5 py-3 border-t border-border/80 bg-muted/10 flex items-center justify-between gap-2">
          {note.questionId ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onViewQuestion}
              className="flex-1 h-8 text-xs gap-1.5 rounded-xl border-border hover:bg-muted text-foreground"
            >
              <Eye className="h-3.5 w-3.5 text-primary" />
              <span>Voir Question</span>
            </Button>
          ) : (
            <span className="text-[11px] text-muted-foreground italic">Note libre</span>
          )}

          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={onEdit}
              className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Modifier"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onDelete}
              className="h-8 w-8 rounded-xl text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10"
              title="Supprimer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default NotesPage;
