import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Bell,
  Send,
  Users,
  User,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  MessageSquare,
  Megaphone,
  Filter,
  X,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { userService } from '@/services/userService';

const NotificationAdmin = () => {
  const { t } = useTranslation(['admin', 'common']);
  const [activeTab, setActiveTab] = useState('broadcast');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [notificationHistory, setNotificationHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'system',
    priority: 'normal',
  });

  // Notification types
  const notificationTypes = [
    { value: 'system', label: 'Système', icon: Bell },
    { value: 'announcement', label: 'Annonce', icon: Megaphone },
    { value: 'reminder', label: 'Rappel', icon: Clock },
    { value: 'alert', label: 'Alerte', icon: AlertCircle },
  ];

  // Fetch users for individual notifications
  useEffect(() => {
    if (activeTab === 'individual') {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await userService.getAllUsers(1, 100);
      // Backend returns { success, data: { users, pagination } }
      const usersData = response.data?.users || response.users || [];
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
      setUsers([]); // Ensure users is always an array
    } finally {
      setLoading(false);
    }
  };

  const fetchNotificationHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await api.get('/notifications/admin/history');
      setNotificationHistory(response.data.data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchNotificationHistory();
    }
  }, [activeTab]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBroadcast = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setSending(true);
    try {
      const response = await api.post('/notifications/admin/send-broadcast', {
        title: formData.title,
        message: formData.message,
        type: formData.type,
        priority: formData.priority,
      });

      if (response.data.success) {
        toast.success('Notification envoyée !', {
          description: `Envoyée à ${response.data.count || 'tous les'} utilisateurs.`,
        });
        setFormData({ title: '', message: '', type: 'system', priority: 'normal' });
      }
    } catch (error) {
      console.error('Broadcast error:', error);
      toast.error('Erreur lors de l\'envoi', {
        description: error.response?.data?.message || 'Veuillez réessayer.',
      });
    } finally {
      setSending(false);
    }
  };

  const handleIndividualSend = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    if (selectedUsers.length === 0) {
      toast.error('Veuillez sélectionner au moins un utilisateur');
      return;
    }

    setSending(true);
    try {
      const response = await api.post('/notifications/admin/send-system', {
        userIds: selectedUsers.map(u => u._id),
        title: formData.title,
        message: formData.message,
        type: formData.type,
        priority: formData.priority,
      });

      if (response.data.success) {
        toast.success('Notifications envoyées !', {
          description: `Envoyées à ${selectedUsers.length} utilisateur(s).`,
        });
        setFormData({ title: '', message: '', type: 'system', priority: 'normal' });
        setSelectedUsers([]);
      }
    } catch (error) {
      console.error('Individual send error:', error);
      toast.error('Erreur lors de l\'envoi', {
        description: error.response?.data?.message || 'Veuillez réessayer.',
      });
    } finally {
      setSending(false);
    }
  };

  const toggleUserSelection = (user) => {
    setSelectedUsers(prev => {
      const exists = prev.find(u => u._id === user._id);
      if (exists) {
        return prev.filter(u => u._id !== user._id);
      }
      return [...prev, user];
    });
  };

  const removeSelectedUser = (userId) => {
    setSelectedUsers(prev => prev.filter(u => u._id !== userId));
  };

  const filteredUsers = Array.isArray(users) ? users.filter(user =>
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  // Select All / Deselect All
  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers([...filteredUsers]);
    }
  };

  // Check if all filtered users are selected
  const allSelected = filteredUsers.length > 0 && selectedUsers.length === filteredUsers.length;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
            <span className="truncate">Gestion des Notifications</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
            Envoyez des notifications à tous les utilisateurs ou individuellement
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <Card className="min-h-[100px]">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Utilisateurs Total</p>
                <p className="text-xl sm:text-2xl font-bold">{users.length || '...'}</p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-100 rounded-lg flex-shrink-0">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="min-h-[100px]">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Sélectionnés</p>
                <p className="text-xl sm:text-2xl font-bold">{selectedUsers.length}</p>
              </div>
              <div className="p-2 sm:p-3 bg-green-100 rounded-lg flex-shrink-0">
                <User className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="min-h-[100px] sm:col-span-2 md:col-span-1">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Envoyées (30j)</p>
                <p className="text-xl sm:text-2xl font-bold">{notificationHistory.length || '...'}</p>
              </div>
              <div className="p-2 sm:p-3 bg-purple-100 rounded-lg flex-shrink-0">
                <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 gap-1 sm:gap-2 h-auto p-1 sm:p-1">
          <TabsTrigger value="broadcast" className="text-xs sm:text-sm p-2 sm:p-2.5 flex items-center gap-1 truncate">
            <Megaphone className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="hidden xs:inline truncate">Diffusion</span>
            <span className="xs:hidden">Diff.</span>
          </TabsTrigger>
          <TabsTrigger value="individual" className="text-xs sm:text-sm p-2 sm:p-2.5 flex items-center gap-1 truncate">
            <User className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="hidden xs:inline truncate">Individuel</span>
            <span className="xs:hidden">Ind.</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs sm:text-sm p-2 sm:p-2.5 flex items-center gap-1 truncate">
            <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="hidden xs:inline truncate">Historique</span>
            <span className="xs:hidden">Hist.</span>
          </TabsTrigger>
        </TabsList>

        {/* Broadcast Tab */}
        <TabsContent value="broadcast" className="space-y-3 sm:space-y-4">
          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Megaphone className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 flex-shrink-0" />
                <span className="truncate">Tous les utilisateurs</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-1">
                Notification envoyée à tous les utilisateurs actifs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type" className="text-xs sm:text-sm">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger className="text-xs sm:text-sm h-9 sm:h-10">
                      <SelectValue placeholder="Sélectionner le type" />
                    </SelectTrigger>
                    <SelectContent>
                      {notificationTypes.map((nt) => (
                        <SelectItem key={nt.value} value={nt.value}>
                          <div className="flex items-center gap-2">
                            <nt.icon className="w-4 h-4" />
                            {nt.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority" className="text-xs sm:text-sm">Priorité</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger className="text-xs sm:text-sm h-9 sm:h-10">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Basse</SelectItem>
                      <SelectItem value="normal">Normale</SelectItem>
                      <SelectItem value="high">Haute</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title" className="text-xs sm:text-sm">Titre *</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Titre de la notification"
                  className="text-xs sm:text-sm h-9 sm:h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-xs sm:text-sm">Message *</Label>
                <Textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder="Contenu de la notification..."
                  rows={3}
                  className="text-xs sm:text-sm resize-none"
                />
              </div>

              <Button
                onClick={handleBroadcast}
                disabled={sending}
                className="w-full bg-orange-500 hover:bg-orange-600 text-xs sm:text-sm h-9 sm:h-10"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                    Envoyer à tous
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Individual Tab */}
        <TabsContent value="individual" className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {/* User Selection */}
            <Card className="flex flex-col max-h-[600px] sm:max-h-[700px]">
              <CardHeader className="pb-3 sm:pb-4 flex-shrink-0">
                <CardTitle className="text-base sm:text-lg flex items-center justify-between gap-2 mb-2">
                  <span className="flex items-center gap-2 truncate">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    <span className="truncate">Utilisateurs</span>
                  </span>
                  <Button variant="outline" size="sm" onClick={fetchUsers} className="flex-shrink-0 h-8 sm:h-9 px-2">
                    <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 flex-1 flex flex-col min-w-0">
                {/* Search */}
                <div className="relative flex-shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 text-xs sm:text-sm h-9 sm:h-10"
                  />
                </div>

                {/* Select All / Clear Selection */}
                <div className="flex items-center justify-between bg-background p-2 rounded-lg flex-shrink-0 text-xs sm:text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      id="selectAll"
                      checked={allSelected}
                      onChange={handleSelectAll}
                      className="w-4 h-4 flex-shrink-0"
                    />
                    <Label htmlFor="selectAll" className="text-xs sm:text-sm cursor-pointer truncate">
                      {allSelected ? 'Désélectionner' : 'Sélectionner'}
                    </Label>
                  </div>
                  {selectedUsers.length > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedUsers([])}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs h-7 px-1.5 flex-shrink-0"
                    >
                      <X className="w-3 h-3 mr-0.5" />
                      {selectedUsers.length}
                    </Button>
                  )}
                </div>

                {/* Selected Users */}
                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-blue-50 rounded-lg flex-shrink-0 max-h-[80px] overflow-y-auto">
                    {selectedUsers.map((user) => (
                      <Badge
                        key={user._id}
                        variant="secondary"
                        className="flex items-center gap-0.5 pr-0.5 text-xs"
                      >
                        <span className="truncate max-w-[100px]">{user.name || user.email}</span>
                        <button
                          onClick={() => removeSelectedUser(user._id)}
                          className="hover:bg-gray-300 rounded-full p-0.5 flex-shrink-0"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* User List */}
                <ScrollArea className="flex-1 border rounded-lg">
                  {loading ? (
                    <div className="flex items-center justify-center h-full py-8">
                      <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-gray-400" />
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8 px-4">
                      <Users className="w-8 h-8 sm:w-10 sm:h-10 mb-2" />
                      <p className="text-xs sm:text-sm text-center">Aucun utilisateur trouvé</p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {filteredUsers.map((user) => {
                        const isSelected = selectedUsers.find(u => u._id === user._id);
                        return (
                          <button
                            key={user._id}
                            onClick={() => toggleUserSelection(user)}
                            className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors text-xs sm:text-sm ${
                              isSelected
                                ? 'bg-blue-100 border-blue-300'
                                : 'hover:bg-muted'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={!!isSelected}
                              onChange={() => {}}
                              className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0"
                            />
                            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0 ${
                              isSelected ? 'bg-blue-500' : 'bg-gray-400'
                            }`}>
                              {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{user.name || 'Sans nom'}</p>
                              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Notification Form */}
            <Card className="flex flex-col max-h-[600px] sm:max-h-[700px]">
              <CardHeader className="pb-3 sm:pb-4 flex-shrink-0">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
                  <span className="truncate">Message</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {selectedUsers.length > 0
                    ? `${selectedUsers.length} utilisateur(s) sélectionné(s)`
                    : 'Sélectionnez des utilisateurs'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 flex-1 flex flex-col min-w-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-shrink-0">
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger className="text-xs sm:text-sm h-9 sm:h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {notificationTypes.map((nt) => (
                          <SelectItem key={nt.value} value={nt.value}>
                            {nt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Priorité</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                    >
                      <SelectTrigger className="text-xs sm:text-sm h-9 sm:h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Basse</SelectItem>
                        <SelectItem value="normal">Normale</SelectItem>
                        <SelectItem value="high">Haute</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2 flex-shrink-0">
                  <Label className="text-xs sm:text-sm">Titre *</Label>
                  <Input
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Titre"
                    className="text-xs sm:text-sm h-9 sm:h-10"
                  />
                </div>

                <div className="space-y-2 flex-1 flex flex-col min-w-0">
                  <Label className="text-xs sm:text-sm flex-shrink-0">Message *</Label>
                  <Textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder="Contenu..."
                    rows={4}
                    className="text-xs sm:text-sm resize-none flex-1"
                  />
                </div>

                <Button
                  onClick={handleIndividualSend}
                  disabled={sending || selectedUsers.length === 0}
                  className="w-full flex-shrink-0 text-xs sm:text-sm h-9 sm:h-10"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <Send className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                      Envoyer ({selectedUsers.length})
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card className="flex flex-col max-h-[600px] sm:max-h-[700px]">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 sm:pb-4 flex-shrink-0">
              <div>
                <CardTitle className="text-base sm:text-lg">Historique</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Dernières notifications</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchNotificationHistory} className="w-full sm:w-auto h-8 sm:h-9 text-xs sm:text-sm">
                <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 mr-2 ${loadingHistory ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-w-0">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : notificationHistory.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Bell className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-xs sm:text-sm">Aucune notification</p>
                </div>
              ) : (
                <ScrollArea className="flex-1">
                  <div className="space-y-2 pr-4">
                    {notificationHistory.map((notif, index) => (
                      <motion.div
                        key={notif._id || index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-3 sm:p-4 border rounded-lg hover:bg-background text-xs sm:text-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 gap-1 sm:gap-2 flex-wrap">
                              <h4 className="font-semibold truncate text-xs sm:text-sm">{notif.title}</h4>
                              <Badge variant="outline" className="text-xs">{notif.type}</Badge>
                              {notif.broadcast && (
                                <Badge className="bg-orange-100 text-orange-700 text-xs">
                                  Diffusion
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                              {notif.message}
                            </p>
                            <div className="flex items-center gap-2 sm:gap-4 mt-2 text-xs text-muted-foreground gap-2 flex-wrap">
                              <span className="flex items-center gap-1 whitespace-nowrap">
                                <Clock className="w-3 h-3" />
                                <span className="truncate">{formatDate(notif.createdAt)}</span>
                              </span>
                              <span className="flex items-center gap-1 whitespace-nowrap">
                                <Users className="w-3 h-3" />
                                {notif.recipientCount || 1}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationAdmin;
