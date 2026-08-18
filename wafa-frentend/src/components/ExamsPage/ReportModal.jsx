import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes, FaFlag } from "react-icons/fa";
import { TriangleAlert } from "lucide-react";
import { api } from "@/lib/utils";
import { toast } from "sonner";

const ReportModal = ({ isOpen, onClose, questionId }) => {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const reportReasons = [
    "Question incorrecte",
    "Réponse incorrecte",
    "Erreur de frappe",
    "Image manquante",
    "Contenu inapproprié",
    "Autre",
  ];

  const handleSubmitClick = (e) => {
    e.preventDefault();
    if (!reason) return;
    setShowWarning(true);
  };

  const handleConfirmSubmit = async () => {
    setShowWarning(false);
    setLoading(true);

    try {
      // Build details string combining reason and description
      const details = description 
        ? `${reason}: ${description}` 
        : reason;
      
      await api.post("/report-questions/create", {
        questionId,
        details, // Backend expects 'details' field
      });
      setSuccess(true);
      toast.success("Signalement envoyé avec succès!");
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setReason("");
        setDescription("");
      }, 2000);
    } catch (error) {
      console.error("Error reporting question:", error);
      toast.error(error.response?.data?.message || "Échec du signalement. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
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
            className="bg-card text-card-foreground border border-border rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {success ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-2xl font-bold text-foreground">
                  Signalement envoyé!
                </h3>
                <p className="text-muted-foreground mt-2">
                  Merci de nous aider à améliorer la qualité
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                      <FaFlag className="text-red-600" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">
                      Signaler un problème
                    </h3>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <FaTimes size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmitClick} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Raison du signalement
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {reportReasons.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setReason(r)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${reason === r
                            ? "bg-red-500 text-white shadow-md"
                            : "bg-muted text-foreground hover:bg-muted/80"
                            }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Description (optionnel)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                      rows={4}
                      placeholder="Décrivez le problème..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!reason || loading}
                    className="w-full py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? "Envoi..." : "Envoyer le signalement"}
                  </button>
                </form>
              </>
            )}
          </motion.div>

          {/* Warning Confirmation Dialog */}
          <AnimatePresence>
            {showWarning && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
                onClick={() => setShowWarning(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl max-w-sm w-full overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Red Header */}
                  <div className="bg-red-500 px-6 py-6 relative">
                    <button
                      onClick={() => setShowWarning(false)}
                      className="absolute top-3 right-3 text-white/80 hover:text-white transition-colors"
                    >
                      <FaTimes size={18} />
                    </button>
                    <div className="flex flex-col items-center text-white">
                      <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center mb-3">
                        <TriangleAlert className="h-10 w-10 text-red-500" />
                      </div>
                      <h3 className="text-2xl font-bold">WARNING!</h3>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="px-6 py-5 text-center">
                    <p className="text-foreground font-medium mb-3">
                      Aucun contenu (text, image, pdf ...)
                    </p>
                    <p className="text-muted-foreground text-sm mb-4">
                      - illégal qui est n'est pas bien (pornographique ...) ou les chose qui est hors sujet, n'est autorisé.
                    </p>
                    <p className="text-red-600 font-semibold text-sm">
                      Le non-respect de cette règle entraînera la suppression définitive de votre compte.
                    </p>
                  </div>

                  {/* Buttons */}
                  <div className="px-6 pb-6 flex gap-3">
                    <button
                      onClick={handleConfirmSubmit}
                      disabled={loading}
                      className="flex-1 py-2.5 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 disabled:bg-gray-300 transition-colors"
                    >
                      {loading ? "Envoi..." : "ok"}
                    </button>
                    <button
                      onClick={() => setShowWarning(false)}
                      className="flex-1 py-2.5 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ReportModal;
