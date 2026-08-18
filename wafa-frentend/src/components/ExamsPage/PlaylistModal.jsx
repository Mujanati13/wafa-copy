import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes, FaPlus, FaCheck } from "react-icons/fa";
import { Album, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/utils";

const PlaylistModal = ({ isOpen, onClose, questionId }) => {
  const [playlists, setPlaylists] = useState([]);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingPlaylists, setFetchingPlaylists] = useState(false);
  const [updatingPlaylistId, setUpdatingPlaylistId] = useState(null);

  useEffect(() => {
    if (isOpen && questionId) {
      fetchPlaylists();
    }
  }, [isOpen, questionId]);

  const fetchPlaylists = async () => {
    setFetchingPlaylists(true);
    try {
      const { data } = await api.get("/playlists");
      setPlaylists(data.data || data.playlists || []);
    } catch (error) {
      console.error("Error fetching playlists:", error);
      toast.error("Impossible de charger les playlists");
    } finally {
      setFetchingPlaylists(false);
    }
  };

  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) {
      toast.error("Le nom de la playlist est requis");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/playlists", {
        title: newPlaylistName,
        questionIds: [questionId],
      });
      const newPlaylist = data.data || data.playlist;
      setPlaylists([...playlists, newPlaylist]);
      setNewPlaylistName("");
      setShowCreateForm(false);
      toast.success("Playlist créée et question ajoutée", {
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />
      });
    } catch (error) {
      console.error("Error creating playlist:", error);
      toast.error(error.response?.data?.message || "Échec de création de la playlist");
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestion = async (playlistId, currentlyContains) => {
    setUpdatingPlaylistId(playlistId);
    try {
      if (currentlyContains) {
        await api.delete(
          `/playlists/${playlistId}/questions/${questionId}`
        );
        toast.success("Question retirée de la playlist");
        // Optimistically update UI
        setPlaylists(playlists.map(p => 
          p._id === playlistId 
            ? { ...p, questionIds: p.questionIds.filter(id => id !== questionId) }
            : p
        ));
      } else {
        await api.post(
          `/playlists/${playlistId}/questions`,
          { questionId }
        );
        toast.success("Question ajoutée à la playlist", {
          icon: <CheckCircle2 className="h-4 w-4 text-green-500" />
        });
        // Optimistically update UI
        setPlaylists(playlists.map(p => 
          p._id === playlistId 
            ? { ...p, questionIds: [...(p.questionIds || []), questionId] }
            : p
        ));
      }
    } catch (error) {
      console.error("Error updating playlist:", error);
      toast.error(error.response?.data?.message || "Échec de la mise à jour");
      // Revert on error
      fetchPlaylists();
    } finally {
      setUpdatingPlaylistId(null);
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
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <Album className="text-purple-600" size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    Mes Playlists
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {playlists.length} playlist{playlists.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted p-2"
              >
                <FaTimes size={20} />
              </button>
            </div>

            {fetchingPlaylists ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              </div>
            ) : playlists.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Album className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                <p className="font-medium mb-1">Aucune playlist</p>
                <p className="text-sm">Créez votre première playlist</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {playlists.map((playlist) => {
                  const contains = playlist.questionIds?.includes(questionId);
                  const isUpdating = updatingPlaylistId === playlist._id;
                  return (
                    <button
                      key={playlist._id}
                      onClick={() => !isUpdating && toggleQuestion(playlist._id, contains)}
                      disabled={isUpdating}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                        contains
                          ? "bg-purple-50 border-purple-400 shadow-sm"
                          : "bg-gray-50 border-gray-200 hover:border-purple-300 hover:shadow-sm"
                      } ${isUpdating ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.02]"}`}
                    >
                      <div className="flex items-center gap-3">
                        {isUpdating ? (
                          <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                        ) : (
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            contains ? "bg-purple-500/20" : "bg-muted border border-border"
                          }`}>
                            <Album size={18} className={contains ? "text-purple-600" : "text-gray-400"} />
                          </div>
                        )}
                        <div className="text-left">
                          <p className="font-semibold text-foreground text-sm">
                            {playlist.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {playlist.questionIds?.length || 0} question{(playlist.questionIds?.length || 0) !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      {contains && !isUpdating && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="text-purple-600 h-5 w-5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {showCreateForm ? (
              <div className="mt-4 p-4 bg-muted/30 rounded-xl border border-border">
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Nom de la playlist
                </label>
                <input
                  type="text"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !loading && newPlaylistName.trim() && createPlaylist()}
                  placeholder="Ex: Mes questions difficiles"
                  className="w-full px-4 py-2.5 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent mb-3 text-sm"
                  autoFocus
                  maxLength={50}
                />
                <div className="flex gap-2">
                  <button
                    onClick={createPlaylist}
                    disabled={loading || !newPlaylistName.trim()}
                    className="flex-1 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-indigo-600 disabled:from-gray-300 disabled:to-gray-300 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Création...
                      </>
                    ) : (
                      <>
                        <FaPlus />
                        Créer
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewPlaylistName("");
                    }}
                    disabled={loading}
                    className="px-4 py-2.5 bg-card text-foreground rounded-lg hover:bg-muted transition-colors border border-border font-medium"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full mt-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-indigo-600 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                <FaPlus />
                Créer une nouvelle playlist
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PlaylistModal;
