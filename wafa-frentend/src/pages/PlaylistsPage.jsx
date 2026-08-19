import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Edit, Play, Album, Loader2, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { api } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const PlaylistsPage = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("");
  const [editPlaylistName, setEditPlaylistName] = useState("");
  const [editPlaylistDescription, setEditPlaylistDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/playlists");
      setPlaylists(data.data || data.playlists || []);
    } catch (error) {
      console.error("Error fetching playlists:", error);
      toast.error(t('common:error_loading', "Erreur lors du chargement"));
    } finally {
      setLoading(false);
    }
  };

  const createPlaylist = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) {
      toast.error(t('dashboard:name_required', "Le titre est requis"));
      return;
    }

    setSaving(true);
    try {
      await api.post("/playlists", {
        title: newPlaylistName.trim(),
        description: newPlaylistDescription.trim(),
      });
      setNewPlaylistName("");
      setNewPlaylistDescription("");
      setShowCreateModal(false);
      toast.success("Playlist créée avec succès");
      fetchPlaylists();
    } catch (error) {
      console.error("Error creating playlist:", error);
      toast.error("Échec de création de la playlist");
    } finally {
      setSaving(false);
    }
  };

  const startEditPlaylist = (playlist) => {
    setEditingPlaylist(playlist);
    setEditPlaylistName(playlist.title || playlist.name || "");
    setEditPlaylistDescription(playlist.description || "");
    setShowEditModal(true);
  };

  const updatePlaylist = async (e) => {
    e.preventDefault();
    if (!editingPlaylist) return;
    if (!editPlaylistName.trim()) {
      toast.error(t('dashboard:name_required', "Le titre est requis"));
      return;
    }

    setSaving(true);
    try {
      await api.put(`/playlists/${editingPlaylist._id}`, {
        title: editPlaylistName.trim(),
        description: editPlaylistDescription.trim(),
      });
      setShowEditModal(false);
      setEditingPlaylist(null);
      toast.success("Playlist modifiée avec succès");
      fetchPlaylists();
    } catch (error) {
      console.error("Error updating playlist:", error);
      toast.error("Échec de la modification de la playlist");
    } finally {
      setSaving(false);
    }
  };

  const deletePlaylist = async (id) => {
    try {
      await api.delete(`/playlists/${id}`);
      toast.success("Playlist supprimée");
      fetchPlaylists();
    } catch (error) {
      console.error("Error deleting playlist:", error);
      toast.error("Échec de suppression de la playlist");
    }
  };

  const playlistColors = [
    "from-blue-600 to-indigo-700",
    "from-purple-600 to-pink-700",
    "from-emerald-600 to-teal-700",
    "from-amber-600 to-orange-700",
    "from-cyan-600 to-blue-700",
    "from-pink-600 to-rose-700",
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <PageHeader
            title="Mes Playlists"
            description="Organisez vos questions favorites en playlists"
          />
          
          <Button onClick={() => setShowCreateModal(true)} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            Nouvelle Playlist
          </Button>
        </div>

        {/* Create Playlist Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="bg-card text-card-foreground border border-border sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-foreground">Créer une nouvelle playlist</DialogTitle>
            </DialogHeader>
            <form onSubmit={createPlaylist} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">Nom *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Anatomie Générale"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  className="bg-background text-foreground border-border"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-foreground">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Description de la playlist (optionnel)"
                  value={newPlaylistDescription}
                  onChange={(e) => setNewPlaylistDescription(e.target.value)}
                  className="bg-background text-foreground border-border resize-none"
                  rows={3}
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} className="border-border">
                  Annuler
                </Button>
                <Button type="submit" disabled={saving || !newPlaylistName.trim()}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Créer
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Playlist Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="bg-card text-card-foreground border border-border sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-foreground">Modifier la playlist</DialogTitle>
            </DialogHeader>
            <form onSubmit={updatePlaylist} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-foreground">Nom *</Label>
                <Input
                  id="edit-name"
                  placeholder="Ex: Anatomie Générale"
                  value={editPlaylistName}
                  onChange={(e) => setEditPlaylistName(e.target.value)}
                  className="bg-background text-foreground border-border"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description" className="text-foreground">Description</Label>
                <Textarea
                  id="edit-description"
                  placeholder="Description de la playlist (optionnel)"
                  value={editPlaylistDescription}
                  onChange={(e) => setEditPlaylistDescription(e.target.value)}
                  className="bg-background text-foreground border-border resize-none"
                  rows={3}
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)} className="border-border">
                  Annuler
                </Button>
                <Button type="submit" disabled={saving || !editPlaylistName.trim()}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {playlists.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Album className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">Aucune playlist</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Créez votre première playlist pour regrouper vos questions favorites et réviser efficacement.
              </p>
              <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Créer une playlist
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {playlists.map((playlist, index) => {
              const questionCount = playlist.questionIds?.length || playlist.questions?.length || 0;
              const title = playlist.title || playlist.name || "Sans titre";

              return (
                <motion.div
                  key={playlist._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="bg-card text-card-foreground border border-border overflow-hidden hover:shadow-lg hover:border-primary/40 transition-all group flex flex-col h-full">
                    {/* Header Banner */}
                    <div className={`h-28 bg-gradient-to-r ${playlistColors[index % playlistColors.length]} relative p-4 flex flex-col justify-between`}>
                      <div className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-[1px]" />
                      <div className="relative z-10 flex items-start justify-between">
                        <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-sm">
                          <Album className="h-5 w-5" />
                        </div>
                        <Badge className="bg-white/20 hover:bg-white/30 text-white border-white/20 text-xs backdrop-blur-sm">
                          {questionCount} question{questionCount !== 1 ? 's' : ''}
                        </Badge>
                      </div>

                      {playlist.moduleId?.name && (
                        <div className="relative z-10 flex items-center gap-1.5 text-white/90 text-xs font-medium">
                          <BookOpen className="h-3.5 w-3.5" />
                          <span className="truncate">{playlist.moduleId.name}</span>
                        </div>
                      )}
                    </div>

                    {/* Card Content */}
                    <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <h3 className="text-lg font-bold text-foreground mb-1.5 line-clamp-1 group-hover:text-primary transition-colors">
                          {title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                          {playlist.description || "Aucune description"}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                        <Button 
                          size="sm" 
                          className="flex-1 gap-1.5 shadow-sm"
                          onClick={() => navigate(`/exam/${playlist._id}?type=playlist`)}
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          <span>S'entraîner</span>
                        </Button>
                        <Button 
                          size="icon" 
                          variant="outline"
                          className="h-9 w-9 border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                          onClick={() => startEditPlaylist(playlist)}
                          title="Modifier"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="outline" 
                          className="h-9 w-9 border-border text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-500/10"
                          onClick={() => deletePlaylist(playlist._id)}
                          title="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaylistsPage;
