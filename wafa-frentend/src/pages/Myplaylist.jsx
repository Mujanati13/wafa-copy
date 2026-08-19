import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Play, Pencil, Trash2, ListPlus, HelpCircle, Loader2, 
  BookOpen, Sparkles, FolderHeart, ArrowRight, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { playlistService } from '@/services/playlistService';

const PLAYLIST_GRADIENTS = [
  "from-blue-600 via-indigo-600 to-violet-600",
  "from-purple-600 via-fuchsia-600 to-pink-600",
  "from-emerald-600 via-teal-600 to-cyan-600",
  "from-amber-500 via-orange-600 to-rose-600",
  "from-cyan-600 via-blue-600 to-indigo-600",
  "from-rose-600 via-pink-600 to-purple-600",
];

const Myplaylist = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newPlaylist, setNewPlaylist] = useState({ title: '', description: '' });
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [editFormData, setEditFormData] = useState({ title: '', description: '' });
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      const response = await playlistService.getAll();
      setPlaylists(response.data || []);
    } catch (error) {
      console.error('Error fetching playlists:', error);
      toast.error('Impossible de charger vos playlists');
    } finally {
      setLoading(false);
    }
  };

  const filteredPlaylists = playlists.filter(playlist =>
    (playlist.title || playlist.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (playlist.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalQuestionsSaved = playlists.reduce((acc, p) => acc + (p.questionIds?.length || 0), 0);

  const handleCreatePlaylist = async (e) => {
    if (e) e.preventDefault();
    if (!newPlaylist.title.trim()) {
      toast.error('Le titre de la playlist est obligatoire');
      return;
    }

    try {
      setCreating(true);
      await playlistService.create({
        title: newPlaylist.title.trim(),
        description: newPlaylist.description.trim(),
        questionIds: [],
      });

      setNewPlaylist({ title: '', description: '' });
      setIsCreateDialogOpen(false);
      toast.success('Playlist créée avec succès');
      await fetchPlaylists();
    } catch (error) {
      console.error('Error creating playlist:', error);
      toast.error('Impossible de créer la playlist');
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePlaylist = async (id, e) => {
    if (e) e.stopPropagation();
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette playlist ?')) return;

    try {
      await playlistService.delete(id);
      setPlaylists(prev => prev.filter(p => p._id !== id));
      toast.success('Playlist supprimée');
    } catch (error) {
      console.error('Error deleting playlist:', error);
      toast.error('Impossible de supprimer la playlist');
    }
  };

  const handlePlayPlaylist = (playlist, e) => {
    if (e) e.stopPropagation();
    const questionsCount = playlist.questionIds?.length || 0;

    if (questionsCount === 0) {
      toast.info('Cette playlist est vide. Ajoutez des questions pendant vos révisions pour vous entraîner.');
      return;
    }

    navigate(`/exam/${playlist._id}?type=playlist`);
  };

  const handleEditPlaylist = (playlist, e) => {
    if (e) e.stopPropagation();
    setEditingPlaylist(playlist);
    setEditFormData({
      title: playlist.title || playlist.name || '',
      description: playlist.description || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdatePlaylist = async (e) => {
    if (e) e.preventDefault();
    if (!editFormData.title.trim()) {
      toast.error('Le titre est requis');
      return;
    }

    try {
      setUpdating(true);
      await playlistService.update(editingPlaylist._id, {
        title: editFormData.title.trim(),
        description: editFormData.description.trim()
      });

      setPlaylists(prev => prev.map(p =>
        p._id === editingPlaylist._id
          ? { ...p, title: editFormData.title.trim(), description: editFormData.description.trim() }
          : p
      ));

      setIsEditDialogOpen(false);
      setEditingPlaylist(null);
      setEditFormData({ title: '', description: '' });
      toast.success('Playlist mise à jour');
    } catch (error) {
      console.error('Error updating playlist:', error);
      toast.error('Impossible de mettre à jour la playlist');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Chargement de vos playlists...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        
        {/* Top Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-card to-card p-6 sm:p-8 shadow-sm"
        >
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Espace de révision personnalisée</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
                Mes Playlists
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Regroupez vos questions favorites ou difficiles par thématique pour créer des sessions d'entraînement sur-mesure.
              </p>

              {/* Stats Counters */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-background/80 border border-border text-xs font-medium backdrop-blur-sm">
                  <FolderHeart className="h-4 w-4 text-primary" />
                  <span>{playlists.length} playlist{playlists.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-background/80 border border-border text-xs font-medium backdrop-blur-sm">
                  <Layers className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{totalQuestionsSaved} questions enregistrées</span>
                </div>
              </div>
            </div>

            {/* Create CTA Button */}
            <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                size="lg"
                className="gap-2 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 rounded-2xl h-12"
              >
                <Plus className="h-5 w-5" />
                <span>Nouvelle Playlist</span>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Search Bar & Filter */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Rechercher par nom ou description..."
              className="pl-10 h-11 bg-card border-border text-foreground rounded-2xl shadow-sm focus-visible:ring-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <p className="text-xs text-muted-foreground self-end sm:self-center">
            {filteredPlaylists.length} playlist{filteredPlaylists.length !== 1 ? 's' : ''} affichée{filteredPlaylists.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Playlists Grid */}
        {filteredPlaylists.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl border border-dashed border-border bg-card/60 p-12 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 border border-primary/20 text-primary">
              <ListPlus className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">
              {searchQuery ? 'Aucun résultat trouvé' : 'Aucune playlist créée'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              {searchQuery 
                ? `Aucune playlist ne correspond à "${searchQuery}". Essayez un autre mot-clé.`
                : 'Créez votre première playlist ou ajoutez des questions depuis vos examens pour commencer.'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2 rounded-xl">
                <Plus className="h-4 w-4" />
                Créer une playlist
              </Button>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            <AnimatePresence mode="popLayout">
              {filteredPlaylists.map((playlist, index) => {
                const questionCount = playlist.questionIds?.length || 0;
                const title = playlist.title || playlist.name || "Sans titre";
                const gradient = PLAYLIST_GRADIENTS[index % PLAYLIST_GRADIENTS.length];

                return (
                  <motion.div
                    key={playlist._id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: index * 0.04 }}
                    className="group"
                  >
                    <Card className="h-full bg-card border-border rounded-3xl overflow-hidden hover:shadow-xl hover:border-primary/40 transition-all duration-300 flex flex-col">
                      {/* Top Gradient Banner */}
                      <div className={`h-28 bg-gradient-to-r ${gradient} relative p-4 flex flex-col justify-between overflow-hidden`}>
                        <div className="absolute inset-0 bg-black/15 dark:bg-black/40 backdrop-blur-[2px]" />
                        
                        {/* Header Badges */}
                        <div className="relative z-10 flex items-start justify-between">
                          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-sm border border-white/20">
                            <FolderHeart className="h-5 w-5" />
                          </div>
                          
                          <Badge className="bg-white/20 hover:bg-white/30 text-white border-white/20 text-xs backdrop-blur-md font-semibold">
                            {questionCount} question{questionCount !== 1 ? 's' : ''}
                          </Badge>
                        </div>

                        {/* Optional Module Label */}
                        {playlist.moduleId?.name && (
                          <div className="relative z-10 flex items-center gap-1.5 text-white/95 text-xs font-medium">
                            <BookOpen className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{playlist.moduleId.name}</span>
                          </div>
                        )}
                      </div>

                      {/* Body */}
                      <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <h3 className="text-base sm:text-lg font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                              {title}
                            </h3>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 min-h-[36px] leading-relaxed">
                            {playlist.description || "Aucune description renseignée."}
                          </p>
                        </div>

                        {/* Actions bar */}
                        <div className="flex items-center gap-2 pt-3 border-t border-border/80">
                          <Button
                            onClick={(e) => handlePlayPlaylist(playlist, e)}
                            className="flex-1 gap-2 rounded-xl shadow-sm text-xs sm:text-sm h-10 font-semibold"
                          >
                            <Play className="h-4 w-4 fill-current" />
                            <span>S'entraîner</span>
                          </Button>

                          <Button
                            size="icon"
                            variant="outline"
                            className="h-10 w-10 rounded-xl border-border hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
                            onClick={(e) => handleEditPlaylist(playlist, e)}
                            title="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <Button
                            size="icon"
                            variant="outline"
                            className="h-10 w-10 rounded-xl border-border text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-500/10 shrink-0"
                            onClick={(e) => handleDeletePlaylist(playlist._id, e)}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Tip / Help Card */}
        <div className="p-5 rounded-3xl bg-muted/40 border border-border flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-foreground">Astuce de révision</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Lors de n'importe quel examen ou entraînement, cliquez sur l'icône <strong>Playlist</strong> dans la barre d'outils de la question pour l'ajouter directement à une playlist existante ou en créer une nouvelle en un clic.
            </p>
          </div>
        </div>

        {/* Create Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="bg-card text-card-foreground border border-border sm:max-w-md rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-foreground">Créer une nouvelle playlist</DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs">
                Donnez un nom et une description pour organiser vos futures questions.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreatePlaylist} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-foreground text-xs font-semibold uppercase tracking-wider">Titre *</Label>
                <Input
                  id="title"
                  placeholder="Ex: Questions pièges - Cardiologie"
                  value={newPlaylist.title}
                  onChange={(e) => setNewPlaylist({ ...newPlaylist, title: e.target.value })}
                  className="bg-background text-foreground border-border rounded-xl h-11"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-foreground text-xs font-semibold uppercase tracking-wider">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Notez les points clés à réviser..."
                  value={newPlaylist.description}
                  onChange={(e) => setNewPlaylist({ ...newPlaylist, description: e.target.value })}
                  className="bg-background text-foreground border-border rounded-xl resize-none"
                  rows={3}
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="rounded-xl border-border">
                  Annuler
                </Button>
                <Button type="submit" disabled={creating || !newPlaylist.title.trim()} className="rounded-xl">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Créer la playlist
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-card text-card-foreground border border-border sm:max-w-md rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-foreground">Modifier la playlist</DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs">
                Mettez à jour le titre et la description de votre playlist.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdatePlaylist} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="edit-title" className="text-foreground text-xs font-semibold uppercase tracking-wider">Titre *</Label>
                <Input
                  id="edit-title"
                  placeholder="Titre de la playlist"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="bg-background text-foreground border-border rounded-xl h-11"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description" className="text-foreground text-xs font-semibold uppercase tracking-wider">Description</Label>
                <Textarea
                  id="edit-description"
                  placeholder="Description..."
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="bg-background text-foreground border-border rounded-xl resize-none"
                  rows={3}
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} className="rounded-xl border-border">
                  Annuler
                </Button>
                <Button type="submit" disabled={updating || !editFormData.title.trim()} className="rounded-xl">
                  {updating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Enregistrer les modifications
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

export default Myplaylist;
