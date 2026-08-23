import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle,
  MessageSquare,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Search,
  Ticket,
  Mail,
  Phone,
  MessageCircle,
  ExternalLink,
  RefreshCw,
  User,
  Calendar,
} from 'lucide-react';
import axios from 'axios';
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { toast } from 'sonner';
import { userService } from '@/services/userService';

const SupportPage = () => {
  const { t } = useTranslation(['common', 'dashboard']);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('faq');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  // FAQ Data
  const faqCategories = [
    {
      id: 'account',
      title: 'Compte & Profil',
      icon: User,
      faqs: [
        {
          question: 'Comment modifier mon profil ?',
          answer: 'Accédez à la page Profil depuis le menu. Vos modifications sont sauvegardées automatiquement.',
        },
        {
          question: 'Comment changer mon mot de passe ?',
          answer: 'Allez dans Paramètres > Sécurité, puis cliquez sur "Modifier le mot de passe". Vous recevrez un email de confirmation.',
        },
        {
          question: 'Comment supprimer mon compte ?',
          answer: 'Contactez notre support via le formulaire ci-dessous. La suppression sera effectuée sous 48h.',
        },
      ],
    },
    {
      id: 'exams',
      title: 'Examens & Questions',
      icon: HelpCircle,
      faqs: [
        {
          question: 'Comment signaler une erreur dans une question ?',
          answer: 'Pendant un examen, cliquez sur le bouton "Signaler" (alerte) pour reporter une question problématique.',
        },
        {
          question: 'Ma progression est-elle sauvegardée automatiquement ?',
          answer: 'Oui, votre progression est sauvegardée automatiquement toutes les 30 secondes pendant un examen.',
        },
        {
          question: 'Comment voir mes statistiques de performance ?',
          answer: 'Accédez à la page "Progrès" depuis le tableau de bord pour voir vos statistiques détaillées par module.',
        },
      ],
    },
    {
      id: 'technical',
      title: 'Problèmes Techniques',
      icon: AlertCircle,
      faqs: [
        {
          question: 'L\'application ne charge pas correctement',
          answer: 'Essayez de vider le cache de votre navigateur (Ctrl+Shift+Delete) et de rafraîchir la page. Si le problème persiste, essayez un autre navigateur.',
        },
        {
          question: 'Je ne reçois pas les emails de confirmation',
          answer: 'Vérifiez votre dossier spam/courrier indésirable. Ajoutez contact@yourqcm.online à vos contacts pour éviter ce problème.',
        },
        {
          question: 'Mon score ne s\'affiche pas correctement',
          answer: 'Rafraîchissez la page et attendez quelques secondes. Si le problème persiste, déconnectez-vous et reconnectez-vous.',
        },
      ],
    },
  ];

  // Load user's tickets
  const fetchTickets = async () => {
    if (!currentUser) return;
    
    setIsLoadingTickets(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/contact/my-messages`,
        { withCredentials: true }
      );
      if (response.data.success) {
        setTickets(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      // Silent fail - user might not have any tickets
    } finally {
      setIsLoadingTickets(false);
    }
  };

  // Fetch current user profile
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await userService.getUserProfile();
        setCurrentUser(userData);
        setFormData(prev => ({
          ...prev,
          name: userData.name || '',
          email: userData.email || ''
        }));
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    
    fetchUser();
  }, []);

  useEffect(() => {
    if (activeTab === 'tickets') {
      fetchTickets();
    }
  }, [activeTab, currentUser]);

  // Check if URL has tab query param
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, []);

  // Filter FAQs based on search
  const filteredFAQs = faqCategories.map(category => ({
    ...category,
    faqs: category.faqs.filter(
      faq =>
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(category => category.faqs.length > 0);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    
    if (!formData.subject.trim() || !formData.message.trim()) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Show confirmation dialog
    const isConfirmed = window.confirm(
      `Avant de soumettre votre question, assurez-vous que:\n\n` +
      `✓ Votre question est claire et précise\n` +
      `✓ Vous n'incluez pas de contenu inapproprié ou offensant\n` +
      `✓ Vous décrivez le problème de manière constructive\n\n` +
      `Êtes-vous sûr que votre question respecte ces critères?`
    );

    if (!isConfirmed) {
      toast.info('Submission cancelled. Please review your message.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/contact`,
        formData,
        { withCredentials: true }
      );

      if (response.data.success) {
        toast.success('Ticket envoyé avec succès !', {
          description: 'Nous vous répondrons dans les plus brefs délais.',
        });
        setFormData(prev => ({ ...prev, subject: '', message: '' }));
        setActiveTab('tickets');
        fetchTickets();
      }
    } catch (error) {
      toast.error('Erreur lors de l\'envoi', {
        description: error.response?.data?.message || 'Veuillez réessayer plus tard.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'En attente', variant: 'secondary', icon: Clock },
      read: { label: 'Lu', variant: 'default', icon: CheckCircle2 },
      replied: { label: 'Répondu', variant: 'success', icon: MessageSquare },
      closed: { label: 'Fermé', variant: 'outline', icon: CheckCircle2 },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

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
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
          <HelpCircle className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Centre d'Aide</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Trouvez des réponses à vos questions ou contactez notre équipe de support
        </p>
      </motion.div>

      {/* Quick Contact Options */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8"
      >
        <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
          <CardContent className="pt-6 text-center">
            <a
              href="https://www.instagram.com/imrsqcm.rabat?igsh=ZHR3aDU0OHN2OWV4"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <ExternalLink className="w-6 h-6 text-pink-600" />
              </div>
              <h3 className="font-semibold mb-1">Instagram</h3>
              <p className="text-sm text-muted-foreground">@imrsqcm.rabat</p>
            </a>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="faq" className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">FAQ</span>
            </TabsTrigger>
            <TabsTrigger value="contact" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">Nous Contacter</span>
            </TabsTrigger>
            <TabsTrigger value="tickets" className="flex items-center gap-2">
              <Ticket className="w-4 h-4" />
              <span className="hidden sm:inline">Mes Tickets</span>
            </TabsTrigger>
          </TabsList>

          {/* FAQ Tab */}
          <TabsContent value="faq">
            <div className="space-y-4">
              <div className="bg-card text-card-foreground rounded-2xl border-2 border-border shadow-lg overflow-hidden">
                <Accordion type="single" collapsible className="w-full">
                  {faqCategories.flatMap(category => 
                    category.faqs.map((item, idx) => {
                      const colorScheme = [
                        { bg: "bg-blue-100", icon: "text-blue-600" },
                        { bg: "bg-green-100", icon: "text-green-600" },
                        { bg: "bg-purple-100", icon: "text-purple-600" },
                        { bg: "bg-teal-100", icon: "text-teal-600" },
                        { bg: "bg-orange-100", icon: "text-orange-600" },
                        { bg: "bg-indigo-100", icon: "text-indigo-600" },
                      ][idx % 6];
                      
                      return (
                        <AccordionItem key={`${category.id}-${idx}`} value={`${category.id}-${idx}`} className="border-b border-blue-100 last:border-0">
                          <AccordionTrigger className="hover:no-underline py-4 sm:py-6 px-4 sm:px-6 md:px-8 group">
                            <div className="flex items-center gap-2 sm:gap-4 text-left flex-1">
                              <div className={`p-1.5 sm:p-2 ${colorScheme.bg} rounded-lg group-hover:opacity-80 transition-opacity flex-shrink-0`}>
                                <HelpCircle className={`h-4 w-4 sm:h-5 sm:w-5 ${colorScheme.icon}`} />
                              </div>
                              <span className="font-semibold text-foreground text-sm sm:text-base">{item.question}</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground pb-4 sm:pb-6 px-4 sm:px-6 md:px-8 pl-10 sm:pl-16 text-sm sm:text-base">
                            {item.answer}
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })
                  )}
                </Accordion>
              </div>
            </div>
          </TabsContent>

          {/* Contact Form Tab */}
          <TabsContent value="contact">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-primary" />
                  Formulaire de Contact
                </CardTitle>
                <CardDescription>
                  Envoyez-nous votre message et nous vous répondrons dans les plus brefs délais
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitTicket} className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nom *</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Votre nom"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="Votre email"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Sujet *</Label>
                    <Input
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      placeholder="Sujet de votre message"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="Décrivez votre problème ou question..."
                      rows={6}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Envoyer le message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tickets Tab */}
          <TabsContent value="tickets">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-primary" />
                  Mes Tickets de Support
                </CardTitle>
                <CardDescription>
                  Suivi de vos demandes d'assistance
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingTickets ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Ticket className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Vous n'avez pas encore de tickets</p>
                    <p className="text-sm mt-2">
                      Créez un nouveau ticket en utilisant le formulaire ci-dessus
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-4">
                      {tickets.map((ticket) => (
                        <Card key={ticket._id} className="overflow-hidden">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <div className="flex-1">
                                <h4 className="font-semibold">{ticket.subject}</h4>
                                <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                  <Calendar className="w-4 h-4" />
                                  {formatDate(ticket.createdAt)}
                                </p>
                              </div>
                              {getStatusBadge(ticket.status)}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {ticket.message}
                            </p>
                            {ticket.reply && (
                              <div className="mt-3 pt-3 border-t">
                                <p className="text-sm font-medium text-green-700">Réponse:</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {ticket.reply}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default SupportPage;
