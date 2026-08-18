import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes, FaSave, FaTrash } from "react-icons/fa";
import { NotebookPen } from "lucide-react";
import { api } from "@/lib/utils";
import { toast } from "sonner";

const NoteModal = ({ isOpen, onClose, questionId, moduleId, examData }) => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingNoteId, setExistingNoteId] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchNote();
    }
  }, [isOpen, questionId]);

  const fetchNote = async () => {
    try {
      const { data } = await api.get("/notes", {
        params: { questionId },
      });
      // Backend returns {success, data: [...]} not {notes: [...]}
      if (data.data && data.data.length > 0) {
        const note = data.data[0];
        setContent(note.content);
        setExistingNoteId(note._id);
      }
    } catch (error) {
      console.error("Error fetching note:", error);
    }
  };

  const saveNote = async () => {
    if (!content.trim()) {
      toast.warning("Veuillez ajouter du contenu à votre note");
      return;
    }

    setLoading(true);
    try {
      if (existingNoteId) {
        await api.put(`/notes/${existingNoteId}`, { content });
        toast.success("Note mise à jour");
      } else {
        const { data } = await api.post("/notes", {
          questionId,
          content,
          moduleId: moduleId || null,
          title: `Note Q${questionId?.slice(-6) || 'Question'}`,
        });
        setExistingNoteId(data.data?._id || data.note?._id);
        toast.success("Note créée avec succès");
      }
      setLastSaved(new Date());
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("Échec de l'enregistrement de la note");
    } finally {
      setLoading(false);
    }
  };

  const deleteNote = async () => {
    if (!existingNoteId) return;

    if (!confirm("Êtes-vous sûr de vouloir supprimer cette note ?")) return;

    setLoading(true);
    try {
      await api.delete(`/notes/${existingNoteId}`);
      setContent("");
      setExistingNoteId(null);
      setLastSaved(null);
      toast.success("Note supprimée");
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Échec de la suppression de la note");
    } finally {
      setLoading(false);
    }
  };

  // Get context info for display
  const getContextInfo = () => {
    if (examData) {
      const parts = [];
      if (examData.moduleName) parts.push(examData.moduleName);
      if (examData.examName || examData.name) parts.push(examData.examName || examData.name);
      if (examData.year) parts.push(`(${examData.year})`);
      return parts.join(" > ");
    }
    return "Question";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-card text-card-foreground border border-border rounded-2xl shadow-2xl max-w-2xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950/50 rounded-full flex items-center justify-center flex-shrink-0">
                  <NotebookPen className="text-blue-600 dark:text-blue-400" size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-bold text-foreground">
                    Ma note personnelle
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {getContextInfo()}
                  </p>
                  {lastSaved && (
                    <p className="text-xs text-muted-foreground">
                      Dernière sauvegarde: {lastSaved.toLocaleTimeString("fr-FR")}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 p-2"
              >
                <FaTimes size={20} />
              </button>
            </div>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-64 px-4 py-3 border-2 border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Écrivez votre note ici..."
            />

            <div className="flex gap-3 mt-4">
              <button
                onClick={saveNote}
                disabled={loading || !content.trim()}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <FaSave />
                {loading ? "Enregistrement..." : "Enregistrer"}
              </button>

              {existingNoteId && (
                <button
                  onClick={deleteNote}
                  disabled={loading}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  <FaTrash />
                  Supprimer
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NoteModal;
