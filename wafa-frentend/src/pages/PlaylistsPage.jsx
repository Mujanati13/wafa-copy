import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Edit, Play, Album, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
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
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/playlists");
      console.log('Playlists response:', data);
      setPlaylists(data.data || data.playlists || []);
    } catch (error) {
      console.error("Error fetching playlists:", error);
      toast.error(t('common:error_loading'));
    } finally {
      setLoading(false);
    }
  };

  const createPlaylist = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) {
      toast.error(t('dashboard:name_required'));
      return;
    }

    try {
      await api.post("/playlists", {
        name: newPlaylistName,
        description: newPlaylistDescription,
      });
      setNewPlaylistName("");
      setNewPlaylistDescription("");
      setShowCreateModal(false);
      toast.success("Playlist créée avec succès");
      fetchPlaylists();
    } catch (error) {
      console.error("Error creating playlist:", error);
      toast.error("Échec de création de la playlist");
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
    "from-blue-500 to-indigo-600",
    "from-purple-500 to-pink-600",
    "from-green-500 to-teal-600",
    "from-orange-500 to-red-600",
    "from-cyan-500 to-blue-600",
    "from-pink-500 to-rose-600",
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <PageHeader
            title="Mes Playlists"
            description="Organisez vos questions favorites en playlists"
          />
          
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nouvelle Playlist
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer une nouvelle playlist</DialogTitle>
              </DialogHeader>
              <form onSubmit={createPlaylist} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom *</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Anatomie Générale"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Description de la playlist (optionnel)"
                    value={newPlaylistDescription}
                    onChange={(e) => setNewPlaylistDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                    Annuler
                  </Button>
                  <Button type="submit">Créer</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {playlists.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Album className="h-20 w-20 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Aucune playlist</h3>
              <p className="text-muted-foreground mb-6">
                Créez votre première playlist pour commencer
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                Créer une playlist
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {playlists.map((playlist, index) => (
              <motion.div
                key={playlist._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className={`h-32 bg-gradient-to-r ${playlistColors[index % playlistColors.length]} relative`}>
                    <div className="absolute inset-0 bg-black/10" />
                    <div className="absolute bottom-4 left-4">
                      <Album className="h-12 w-12 text-white/90" />
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold mb-2">{playlist.name || playlist.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {playlist.description || "Aucune description"}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Navigating to playlist:', playlist._id);
                          navigate(`/exam/${playlist._id}?type=playlist`);
                        }}
                      >
                        <Play className="h-4 w-4" />
                        Jouer
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => deletePlaylist(playlist._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaylistsPage;
