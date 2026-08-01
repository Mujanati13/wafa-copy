import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Play, Pencil, Trash2, ListPlus, HelpCircle, Loader } from 'lucide-react';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/shared';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { playlistService } from '@/services/playlistService';

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
      console.log('Fetching playlists...');
      const response = await playlistService.getAll();
      console.log('Playlists response:', response);
      setPlaylists(response.data || []);
      console.log('Playlists set:', response.data?.length || 0);
    } catch (error) {
      console.error('Error fetching playlists:', error);
      toast.error('Erreur', {
        description: 'Impossible de charger vos playlists'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredPlaylists = playlists.filter(playlist =>
    playlist.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreatePlaylist = async () => {
    if (!newPlaylist.title.trim()) {
      toast.error(t('dashboard:title_required'));
      return;
    }
    
    try {
      setCreating(true);
      await playlistService.create({
        title: newPlaylist.title,
        description: newPlaylist.description,
        questionIds: [],
      });
      
      setNewPlaylist({ title: '', description: '' });
      setIsCreateDialogOpen(false);
      toast.success(t('dashboard:playlist_created_success'));
      await fetchPlaylists();
    } catch (error) {
      console.error('Error creating playlist:', error);
      toast.error('Erreur', {
        description: 'Impossible de créer la playlist'
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePlaylist = async (id) => {
    try {
      await playlistService.delete(id);
      setPlaylists(playlists.filter(p => p._id !== id));
      toast.success(t('dashboard:playlist_deleted'));
    } catch (error) {
      console.error('Error deleting playlist:', error);
      toast.error('Erreur', {
        description: 'Impossible de supprimer la playlist'
      });
    }
  };

  const handlePlayPlaylist = (playlist) => {
    console.log('=== PLAY PLAYLIST CLICKED ===');
    console.log('Playlist:', playlist);
    console.log('Playlist ID:', playlist._id);
    
    const questionsCount = playlist.questionIds?.length || 0;
    console.log('Questions count:', questionsCount);
    
    if (questionsCount === 0) {
      console.log('Playlist is empty, showing toast');
      toast.error(t('dashboard:playlist_is_empty'));
      return;
    }
    
    const targetUrl = `/exam/${playlist._id}?type=playlist`;
    console.log('Navigating to:', targetUrl);
    
    navigate(targetUrl);
    console.log('Navigation triggered');
  };

  const handleEditPlaylist = (playlist) => {
    setEditingPlaylist(playlist);
    setEditFormData({
      title: playlist.title,
      description: playlist.description
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdatePlaylist = async () => {
    if (!editFormData.title.trim()) {
      toast.error(t('dashboard:title_required'));
      return;
    }

    try {
      setUpdating(true);
      await playlistService.update(editingPlaylist._id, {
        title: editFormData.title,
        description: editFormData.description
      });

      // Update local state
      setPlaylists(playlists.map(p => 
        p._id === editingPlaylist._id 
          ? { ...p, ...editFormData }
          : p
      ));

      setIsEditDialogOpen(false);
      setEditingPlaylist(null);
      setEditFormData({ title: '', description: '' });
      toast.success('Playlist mise à jour avec succès');
    } catch (error) {
      console.error('Error updating playlist:', error);
      toast.error('Erreur', {
        description: 'Impossible de mettre à jour la playlist'
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 md:p-6 flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hero Section */}
        <Card className="bg-gradient-to-br from-blue-500 to-teal-500 border-none text-white overflow-hidden">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ListPlus className="h-8 w-8" />
                  <h1 className="text-3xl md:text-4xl font-bold">{t('dashboard:my_playlists')}</h1>
                </div>
                <p className="text-white/90 text-lg">
                  {t('dashboard:organize_favorite_questions')}
                </p>
                <Badge variant="secondary" className="bg-background text-blue-700 hover:bg-background/90">
                  {playlists.length} {t('dashboard:playlist')}{playlists.length > 1 ? 's' : ''} {t('dashboard:in_total')}
                </Badge>
              </div>
              
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-background text-blue-700 hover:bg-background/90 gap-2 text-base px-6">
                    <Plus className="h-5 w-5" />
                    {t('dashboard:new_playlist')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('dashboard:create_new_playlist')}</DialogTitle>
                    <DialogDescription>
                      {t('dashboard:give_playlist_name')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Titre *</Label>
                      <Input
                        id="title"
                        placeholder="Ex: Anatomie Générale"
                        value={newPlaylist.title}
                        onChange={(e) => setNewPlaylist({ ...newPlaylist, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Description de la playlist (optionnel)"
                        value={newPlaylist.description}
                        onChange={(e) => setNewPlaylist({ ...newPlaylist, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button onClick={handleCreatePlaylist} disabled={creating}>
                      {creating ? <Loader className="h-4 w-4 animate-spin mr-2" /> : null}
                      Créer
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Edit Dialog */}
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Modifier la playlist</DialogTitle>
                    <DialogDescription>
                      Mettez à jour les informations de votre playlist
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-title">Titre *</Label>
                      <Input
                        id="edit-title"
                        placeholder="Titre de la playlist"
                        value={editFormData.title}
                        onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-description">Description</Label>
                      <Textarea
                        id="edit-description"
                        placeholder="Description (optionnel)"
                        value={editFormData.description}
                        onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button onClick={handleUpdatePlaylist} disabled={updating}>
                      {updating ? <Loader className="h-4 w-4 animate-spin mr-2" /> : null}
                      Mettre à jour
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Search Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                placeholder="Rechercher une playlist..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Playlists Grid */}
        {filteredPlaylists.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-blue-50 flex items-center justify-center">
                  <ListPlus className="h-10 w-10 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">
                    {searchQuery ? 'Aucune playlist trouvée' : 'Aucune playlist'}
                  </h3>
                  <p className="text-muted-foreground">
                    {searchQuery 
                      ? 'Essayez avec un autre terme de recherche'
                      : 'Créez votre première playlist pour commencer'
                    }
                  </p>
                </div>
                {!searchQuery && (
                  <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Créer une playlist
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlaylists.map((playlist, index) => {
              const questionsCount = playlist.questionIds?.length || 0;
              return (
                <motion.div
                  key={playlist._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <p className="text-xs text-muted-foreground">
                              {new Date(playlist.createdAt).toLocaleDateString('fr-FR', { 
                                day: 'numeric', 
                                month: 'short', 
                                year: 'numeric' 
                              })}
                            </p>
                            <h3 className="text-xl font-semibold">{playlist.title}</h3>
                            {playlist.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {playlist.description}
                              </p>
                            )}
                          </div>
                          <Badge variant={questionsCount > 0 ? "default" : "secondary"}>
                            {questionsCount} question{questionsCount > 1 ? 's' : ''}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            onClick={() => handlePlayPlaylist(playlist)}
                            disabled={questionsCount === 0}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handleEditPlaylist(playlist)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeletePlaylist(playlist._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Help Card */}
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <HelpCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Comment utiliser les playlists?</h3>
                <p className="text-sm text-muted-foreground">
                  Les playlists vous permettent de regrouper vos questions favorites. 
                  Lors d'un examen, vous pouvez ajouter des questions à vos playlists pour les réviser plus tard.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Myplaylist;
