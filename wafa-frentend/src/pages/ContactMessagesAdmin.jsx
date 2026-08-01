import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Trash2, Eye, Calendar, Mail, User, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { api } from '@/lib/utils';

const ContactMessagesAdmin = () => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [showViewDialog, setShowViewDialog] = useState(false);

    useEffect(() => {
        fetchMessages();
    }, []);

    const fetchMessages = async () => {
        try {
            setLoading(true);
            const response = await api.get('/contact');
            setMessages(response.data?.data || response.data || []);
        } catch (error) {
            console.error('Error fetching messages:', error);
            toast.error('Erreur lors du chargement des messages');
        } finally {
            setLoading(false);
        }
    };

    const handleView = (message) => {
        setSelectedMessage(message);
        setShowViewDialog(true);
    };

    const handleUpdateStatus = async (id, status) => {
        try {
            await api.patch(`/contact/${id}/status`, { status });
            toast.success('Statut mis à jour avec succès');
            fetchMessages();
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Erreur lors de la mise à jour du statut');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Voulez-vous vraiment supprimer ce message ?')) return;

        try {
            await api.delete(`/contact/${id}`);
            toast.success('Message supprimé avec succès');
            fetchMessages();
        } catch (error) {
            console.error('Error deleting message:', error);
            toast.error('Erreur lors de la suppression du message');
        }
    };

    const filteredMessages = messages.filter(msg =>
        msg.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.message?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = {
        total: messages.length,
        pending: messages.filter(m => m.status === 'pending').length,
        answered: messages.filter(m => m.status === 'answered').length,
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-3 sm:p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="p-1.5 sm:p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                                <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
                            </div>
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Messages de Contact</h1>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">Gérez les messages reçus depuis le formulaire de contact</p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                    <Card>
                        <CardContent className="p-3 sm:p-4 md:pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] sm:text-xs md:text-sm font-medium text-muted-foreground">Total</p>
                                    <p className="text-lg sm:text-2xl md:text-3xl font-bold text-foreground">{stats.total}</p>
                                </div>
                                <MessageCircle className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-3 sm:p-4 md:pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] sm:text-xs md:text-sm font-medium text-muted-foreground">En Attente</p>
                                    <p className="text-lg sm:text-2xl md:text-3xl font-bold text-orange-600">{stats.pending}</p>
                                </div>
                                <XCircle className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-orange-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-3 sm:p-4 md:pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] sm:text-xs md:text-sm font-medium text-muted-foreground">Répondus</p>
                                    <p className="text-lg sm:text-2xl md:text-3xl font-bold text-green-600">{stats.answered}</p>
                                </div>
                                <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search */}
                <Card>
                    <CardHeader className="p-3 sm:p-4 md:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <CardTitle className="text-base sm:text-lg">Liste des Messages</CardTitle>
                            <Input
                                type="text"
                                placeholder="Rechercher..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full sm:max-w-sm text-sm"
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            </div>
                        ) : filteredMessages.length === 0 ? (
                            <div className="text-center py-12">
                                <MessageCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                <p className="text-muted-foreground">Aucun message trouvé</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Nom</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Message</TableHead>
                                            <TableHead>Statut</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredMessages.map((msg) => (
                                            <motion.tr
                                                key={msg._id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="border-b hover:bg-background transition-colors"
                                            >
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <Calendar className="h-4 w-4" />
                                                        {new Date(msg.createdAt).toLocaleDateString('fr-FR')}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <User className="h-4 w-4 text-slate-400" />
                                                        <span className="font-medium">{msg.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Mail className="h-4 w-4 text-slate-400" />
                                                        <a href={`mailto:${msg.email}`} className="text-blue-600 hover:underline">
                                                            {msg.email}
                                                        </a>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <p className="text-sm text-muted-foreground line-clamp-2 max-w-xs">
                                                        {msg.message}
                                                    </p>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        className={
                                                            msg.status === 'answered'
                                                                ? 'bg-green-100 text-green-700'
                                                                : 'bg-orange-100 text-orange-700'
                                                        }
                                                    >
                                                        {msg.status === 'answered' ? 'Répondu' : 'En attente'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleView(msg)}
                                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        {msg.status === 'pending' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleUpdateStatus(msg._id, 'answered')}
                                                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                title="Marquer comme répondu"
                                                            >
                                                                <CheckCircle2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(msg._id)}
                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </motion.tr>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* View Message Dialog */}
            <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MessageCircle className="h-5 w-5 text-blue-600" />
                            Détails du Message
                        </DialogTitle>
                        <DialogDescription>
                            Reçu le {selectedMessage && new Date(selectedMessage.createdAt).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                            })}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedMessage && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                                        <User className="h-4 w-4 text-blue-600" />
                                        Nom
                                    </label>
                                    <p className="text-foreground bg-background p-3 rounded-lg">{selectedMessage.name}</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-blue-600" />
                                        Email
                                    </label>
                                    <a
                                        href={`mailto:${selectedMessage.email}`}
                                        className="block text-blue-600 bg-background p-3 rounded-lg hover:underline"
                                    >
                                        {selectedMessage.email}
                                    </a>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                                    <MessageCircle className="h-4 w-4 text-blue-600" />
                                    Message
                                </label>
                                <div className="bg-background p-4 rounded-lg border border-border">
                                    <p className="text-foreground whitespace-pre-wrap">{selectedMessage.message}</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-border">
                                <Badge
                                    className={
                                        selectedMessage.status === 'answered'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-orange-100 text-orange-700'
                                    }
                                >
                                    {selectedMessage.status === 'answered' ? 'Répondu' : 'En attente'}
                                </Badge>

                                {selectedMessage.status === 'pending' && (
                                    <Button
                                        onClick={() => {
                                            handleUpdateStatus(selectedMessage._id, 'answered');
                                            setShowViewDialog(false);
                                        }}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        Marquer comme répondu
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ContactMessagesAdmin;
