import React, { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Check, AlertCircle, Zap, Loader2, CreditCard, ShieldCheck, BookOpen, Building2, Clock, MessageCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { dashboardService } from "@/services/dashboardService";
import { subscriptionPlanService } from "@/services/subscriptionPlanService";
import { toast } from "sonner";
import { api } from "@/lib/utils";

const API_URL = import.meta.env.VITE_API_URL;

const ClientSubscriptionPage = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const location = useLocation();

  const [userSubscription, setUserSubscription] = useState(null);
  const [allPlans, setAllPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedSemesters, setSelectedSemesters] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState(null); // 'card' or 'transfer'
  const [showConfirmDialog, setShowConfirmDialog] = useState(false); // Confirmation dialog for bank transfer
  const [requestLoading, setRequestLoading] = useState(false);

  // WhatsApp contact number
  const WHATSAPP_NUMBER = "0699204386";

  // All available semesters
  const allSemesters = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10"];

  // Get the maximum number of semesters user can select based on plan
  const getMaxSemesters = (plan) => {
    if (!plan) return 0;
    // Premium (Semester) allows 1 semester, Premium Annuel allows 2 semesters
    if (plan.period === "Annee") return 2;
    return 1;
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  // Pre-select plan if passed from landing page
  useEffect(() => {
    if (location.state?.selectedPlan && allPlans.length > 0) {
      const preSelectedPlan = allPlans.find(p => p._id === location.state.selectedPlan._id);
      if (preSelectedPlan && preSelectedPlan.price > 0) {
        setSelectedPlan(preSelectedPlan);
        setShowPaymentDialog(true);
        toast.info(`Plan ${preSelectedPlan.name} sélectionné`);
      }
    }
  }, [location.state, allPlans]);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);

      // Fetch user's current subscription
      const subResponse = await dashboardService.getUserSubscriptionInfo();
      setUserSubscription(subResponse.data || {});

      // Fetch all available plans
      const plansResponse = await subscriptionPlanService.getAllPlans();
      const plansData = Array.isArray(plansResponse.data)
        ? plansResponse.data
        : plansResponse.data?.data || [];
      setAllPlans(plansData);
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      toast.error('Impossible de charger les données d\'abonnement');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan) => {
    // Don't allow selecting current plan
    if (userSubscription?.plan === plan.name) {
      toast.info('Vous avez déjà ce plan');
      return;
    }

    // Don't allow selecting free plan
    if (plan.price === 0) {
      toast.info('Vous êtes déjà sur le plan gratuit');
      return;
    }

    setSelectedPlan(plan);
    setSelectedSemesters([]); // Reset selected semesters
    setPaymentMethod('transfer'); // Auto-select transfer method
    setShowPaymentDialog(true);
  };

  // Handle semester selection
  const handleSemesterChange = (semester, checked) => {
    const maxSemesters = getMaxSemesters(selectedPlan);

    if (checked) {
      if (selectedSemesters.length < maxSemesters) {
        setSelectedSemesters([...selectedSemesters, semester]);
      } else {
        toast.warning(`Vous pouvez sélectionner maximum ${maxSemesters} semestre${maxSemesters > 1 ? 's' : ''} avec ce plan`);
      }
    } else {
      setSelectedSemesters(selectedSemesters.filter(s => s !== semester));
    }
  };

  // Handle WhatsApp contact - Show confirmation dialog first
  const handleContactWhatsApp = () => {
    if (!selectedPlan) return;

    const maxSemesters = getMaxSemesters(selectedPlan);
    if (selectedSemesters.length !== maxSemesters) {
      toast.error(`Veuillez sélectionner ${maxSemesters} semestre${maxSemesters > 1 ? 's' : ''}`);
      return;
    }

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  // Create payment request and contact WhatsApp
  const handleConfirmBankTransfer = async () => {
    if (!selectedPlan) return;

    try {
      setRequestLoading(true);

      // Create payment request in the backend
      const semestersList = selectedSemesters.sort().join(', ');

      const requestData = {
        planId: selectedPlan._id,
        planName: selectedPlan.name,
        amount: selectedPlan.price,
        semesters: selectedSemesters,
        paymentMode: "Bank Transfer"
      };

      // Call API to create payment request
      const response = await api.post(
        `/payments/bank-transfer-request`,
        requestData
      );

      if (response.data.success) {
        toast.success('Demande créée!', {
          description: 'Votre demande a été enregistrée. Contactez-nous sur WhatsApp pour finaliser.'
        });

        // Create WhatsApp message with subscription details
        const message = encodeURIComponent(
          `Bonjour! Je souhaite souscrire au plan ${selectedPlan.name} (${selectedPlan.price} MAD).\n\nSemestres choisis: ${semestersList}\n\nJ'ai créé une demande de paiement (#${response.data.requestId || 'N/A'}).\n\nMerci de me contacter pour finaliser mon abonnement.`
        );

        // Open WhatsApp with pre-filled message
        const whatsappUrl = `https://wa.me/212${WHATSAPP_NUMBER.replace(/^0/, '')}?text=${message}`;
        window.open(whatsappUrl, '_blank');

        // Close dialogs
        setShowConfirmDialog(false);
        setShowPaymentDialog(false);
        setSelectedSemesters([]);
        setPaymentMethod(null);
      }
    } catch (error) {
      console.error('Error creating bank transfer request:', error);
      toast.error('Erreur lors de la création de la demande');
    } finally {
      setRequestLoading(false);
    }
  };

  const handlePayWithPayPal = async () => {
    if (!selectedPlan) return;

    const maxSemesters = getMaxSemesters(selectedPlan);
    if (selectedSemesters.length !== maxSemesters) {
      toast.error(`Veuillez sélectionner ${maxSemesters} semestre${maxSemesters > 1 ? 's' : ''}`);
      return;
    }

    try {
      setPaymentLoading(true);

      // Map plan duration to backend format
      const durationMap = {
        '1 Mois': '1month',
        '3 Mois': '3months',
        '6 Mois': '6months',
        '1 An': '1year',
        '12 Mois': '1year',
      };

      const duration = selectedPlan.period === "Annee" ? '1year' : '6months';

      // Create PayPal order with selected semesters
      const response = await api.post(
        `/payments/create-order`,
        {
          duration,
          semesters: selectedSemesters,
          planId: selectedPlan._id
        }
      );

      if (response.data.success && response.data.orderId) {
        // Store selected semesters in localStorage to use after payment
        localStorage.setItem('pendingSubscriptionSemesters', JSON.stringify(selectedSemesters));

        // Redirect to PayPal
        const paypalUrl = `https://www.sandbox.paypal.com/checkoutnow?token=${response.data.orderId}`;
        window.location.href = paypalUrl;
      } else {
        throw new Error('Erreur lors de la création de la commande PayPal');
      }
    } catch (error) {
      console.error('PayPal payment error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Erreur lors du paiement PayPal';
      toast.error(errorMessage);
    } finally {
      setPaymentLoading(false);
      setShowPaymentDialog(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 p-3 sm:p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4"
        >
          <h1 className="text-4xl font-bold text-foreground">Mes Abonnements</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Gérez votre plan d'abonnement et accédez à toutes les fonctionnalités premium
          </p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="h-96 animate-pulse">
                <CardContent className="p-6 space-y-4">
                  <div className="h-8 bg-slate-200 rounded w-3/4" />
                  <div className="h-4 bg-slate-200 rounded w-full" />
                  <div className="h-4 bg-slate-200 rounded w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Current Subscription Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-blue-600" />
                    Votre Plan Actuel
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Plan d'abonnement</p>
                    <Badge className="text-lg px-4 py-2" variant={userSubscription?.plan === 'Premium' ? 'default' : 'secondary'}>
                      {userSubscription?.plan === 'Premium Annuel' ? 'Premium Pro' : (userSubscription?.plan || 'Plan Gratuit')}
                    </Badge>
                  </div>
                  {userSubscription?.subscription && (
                    <>
                      <div>
                        <p className="text-sm text-muted-foreground">Date d'expiration</p>
                        <p className="font-semibold">
                          {new Date(userSubscription.subscription.expiryDate).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Statut</p>
                        <Badge variant="outline" className="gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          Actif
                        </Badge>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Available Plans */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Plans Disponibles</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {allPlans.map((plan, index) => {
                  const isCurrentPlan = userSubscription?.plan === plan.name;
                  const isFree = plan.price === 0;

                  return (
                    <motion.div
                      key={plan._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 * (index + 1) }}
                    >
                      <Card
                        className={`flex flex-col h-full relative ${isCurrentPlan
                            ? 'ring-2 ring-blue-500 shadow-lg'
                            : ''
                          }`}
                      >
                        {/* Current Plan Badge */}
                        {isCurrentPlan && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                            <Badge className="bg-blue-500 text-white px-4 py-1 shadow-md">
                              <ShieldCheck className="w-4 h-4 mr-1" />
                              Plan Actuel
                            </Badge>
                          </div>
                        )}

                        <CardHeader className={isCurrentPlan ? 'pt-8' : ''}>
                          <CardTitle className="text-2xl">{plan.name === 'Premium Annuel' ? 'Premium Pro' : plan.name}</CardTitle>
                          <CardDescription>{plan.description}</CardDescription>
                          <div className="mt-4">
                            <span className="text-3xl font-bold text-foreground">
                              {plan.price === 0 ? 'Gratuit' : `${plan.price} MAD`}
                            </span>
                            {plan.oldPrice && (
                              <span className="text-sm text-muted-foreground line-through ml-2">
                                {plan.oldPrice} MAD
                              </span>
                            )}
                            {plan.duration && !isFree && (
                              <span className="text-sm text-muted-foreground ml-2">
                                / {plan.duration}
                              </span>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-6">
                          {/* Features */}
                          <div className="space-y-3">
                            {/* Render custom features based on plan name */}
                            {plan.name === 'GRATUIT' && (
                              <>
                                <div className="flex items-start gap-3">
                                  <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                  <span className="text-sm text-muted-foreground">1 module</span>
                                </div>
                                <div className="flex items-start gap-3">
                                  <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                  <span className="text-sm text-muted-foreground">Questions triées (question par question, toutes les questions)</span>
                                </div>
                                <div className="flex items-start gap-3">
                                  <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                  <span className="text-sm text-muted-foreground">Interface adaptée aux mobiles</span>
                                </div>
                                <div className="flex items-start gap-3 opacity-50">
                                  <span className="text-red-500 flex-shrink-0 mt-0.5">❌</span>
                                  <span className="text-sm text-slate-400 line-through">Accès aux classements</span>
                                </div>
                                <div className="flex items-start gap-3 opacity-50">
                                  <span className="text-red-500 flex-shrink-0 mt-0.5">❌</span>
                                  <span className="text-sm text-slate-400 line-through">Accès aux statistiques</span>
                                </div>
                                <div className="flex items-start gap-3 opacity-50">
                                  <span className="text-red-500 flex-shrink-0 mt-0.5">❌</span>
                                  <span className="text-sm text-slate-400 line-through">Explication des étudiants</span>
                                </div>
                                <div className="flex items-start gap-3 opacity-50">
                                  <span className="text-red-500 flex-shrink-0 mt-0.5">❌</span>
                                  <span className="text-sm text-slate-400 line-through">Explication de l'IA</span>
                                </div>
                                <div className="flex items-start gap-3 opacity-50">
                                  <span className="text-red-500 flex-shrink-0 mt-0.5">❌</span>
                                  <span className="text-sm text-slate-400 line-through">Accès à la communauté votes</span>
                                </div>
                                <div className="flex items-start gap-3 opacity-50">
                                  <span className="text-red-500 flex-shrink-0 mt-0.5">❌</span>
                                  <span className="text-sm text-slate-400 line-through">Création de playlists</span>
                                </div>
                                <div className="flex items-start gap-3 opacity-50">
                                  <span className="text-red-500 flex-shrink-0 mt-0.5">❌</span>
                                  <span className="text-sm text-slate-400 line-through">Notes personnalisées</span>
                                </div>
                                <div className="flex items-start gap-3 opacity-50">
                                  <span className="text-red-500 flex-shrink-0 mt-0.5">❌</span>
                                  <span className="text-sm text-slate-400 line-through">Assistance prioritaire</span>
                                </div>
                              </>
                            )}

                            {plan.name === 'PREMIUM' && (
                              <>
                                <div className="flex items-start gap-3">
                                  <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                  <span className="text-sm text-muted-foreground">Tous les modules</span>
                                </div>
                                <div className="flex items-start gap-3">
                                  <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                  <span className="text-sm text-muted-foreground">Questions triées (question par question, toutes les questions)</span>
                                </div>
                                <div className="flex items-start gap-3">
                                  <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                  <span className="text-sm text-muted-foreground">Interface adaptée aux mobiles</span>
                                </div>
                                <div className="flex items-start gap-3">
                                  <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                  <span className="text-sm text-muted-foreground">Accès aux classements</span>
                                </div>
                                <div className="flex items-start gap-3">
                                  <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                  <span className="text-sm text-muted-foreground">Accès aux statistiques</span>
                                </div>
                                <div className="flex items-start gap-3">
                                  <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                  <span className="text-sm text-muted-foreground">Explication des étudiants</span>
                                </div>
                                <div className="flex items-start gap-3 opacity-50">
                                  <span className="text-red-500 flex-shrink-0 mt-0.5">❌</span>
                                  <span className="text-sm text-slate-400 line-through">Explication de l'IA</span>
                                </div>
                                <div className="flex items-start gap-3 opacity-50">
                                  <span className="text-red-500 flex-shrink-0 mt-0.5">❌</span>
                                  <span className="text-sm text-slate-400 line-through">Accès à la communauté votes</span>
                                </div>
                                <div className="flex items-start gap-3 opacity-50">
                                  <span className="text-red-500 flex-shrink-0 mt-0.5">❌</span>
                                  <span className="text-sm text-slate-400 line-through">Création de playlists</span>
                                </div>
                                <div className="flex items-start gap-3 opacity-50">
                                  <span className="text-red-500 flex-shrink-0 mt-0.5">❌</span>
                                  <span className="text-sm text-slate-400 line-through">Notes personnalisées</span>
                                </div>
                                <div className="flex items-start gap-3 opacity-50">
                                  <span className="text-red-500 flex-shrink-0 mt-0.5">❌</span>
                                  <span className="text-sm text-slate-400 line-through">Assistance prioritaire</span>
                                </div>
                              </>
                            )}

                            {plan.name === 'PREMIUM PRO' && (
                              <>
                                <div className="flex items-start gap-3">
                                  <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                  <span className="text-sm text-muted-foreground">Tous les modules</span>
                                </div>
                                <div className="flex items-start gap-3">
                                  <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                  <span className="text-sm text-muted-foreground">Questions triées (question par question, toutes les questions)</span>
                                </div>
                                <div className="flex items-start gap-3">
                                  <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                  <span className="text-sm text-muted-foreground">Interface adaptée aux mobiles</span>
                                </div>
                                <div className="flex items-start gap-3">
                                  <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                  <span className="text-sm text-muted-foreground">Pourcentage des réponses</span>
                                </div>
                                <div className="flex items-start gap-3">
                                  <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                  <span className="text-sm text-muted-foreground">Accès aux classements</span>
                                </div>
                                <div className="flex items-start gap-3">
                                  <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                  <span className="text-sm text-muted-foreground">Accès aux statistiques</span>
                                </div>
                                <div className="flex items-start gap-3">
                                  <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                  <span className="text-sm text-muted-foreground">Explication des étudiants</span>
                                </div>
                                <div className="flex items-start gap-3">
                                  <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                  <span className="text-sm text-muted-foreground">Explication de l'IA</span>
                                </div>
                                <div className="flex items-start gap-3">
                                  <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                  <span className="text-sm text-muted-foreground">Accès à la communauté votes</span>
                                </div>
                                <div className="flex items-start gap-3">
                                  <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                  <span className="text-sm text-muted-foreground">Création de playlists</span>
                                </div>
                                <div className="flex items-start gap-3">
                                  <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                  <span className="text-sm text-muted-foreground">Notes personnalisées</span>
                                </div>
                                <div className="flex items-start gap-3">
                                  <span className="text-green-500 flex-shrink-0 mt-0.5">✔️</span>
                                  <span className="text-sm text-muted-foreground">Assistance prioritaire</span>
                                </div>
                              </>
                            )}

                            {/* Fallback: if none of the above plan names match, show original features */}
                            {!['GRATUIT', 'PREMIUM', 'PREMIUM PRO'].includes(plan.name) && plan.features && plan.features.map((feature, idx) => {
                              const featureText = typeof feature === 'string' ? feature : feature.text;
                              const isIncluded = typeof feature === 'string' ? true : feature.included;

                              return (
                                <div key={idx} className={`flex items-start gap-3 ${!isIncluded ? 'opacity-50' : ''}`}>
                                  <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isIncluded ? 'text-green-500' : 'text-slate-400'}`} />
                                  <span className={`text-sm ${isIncluded ? 'text-muted-foreground' : 'text-slate-400 line-through'}`}>{featureText}</span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Current Plan Indicator */}
                          {isCurrentPlan && (
                            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <AlertCircle className="w-4 h-4 text-blue-600" />
                              <span className="text-sm text-blue-700 font-medium">
                                Votre plan actuel
                              </span>
                            </div>
                          )}

                          {/* Action Button */}
                          <Button
                            onClick={() => handleSelectPlan(plan)}
                            disabled={isCurrentPlan || isFree}
                            className={`w-full ${isCurrentPlan || isFree
                                ? 'opacity-50 cursor-default'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                              }`}
                            variant={isCurrentPlan ? 'outline' : 'default'}
                          >
                            {isCurrentPlan ? (
                              'Plan Actuel'
                            ) : isFree ? (
                              'Plan Gratuit'
                            ) : (
                              <>
                                <CreditCard className="w-4 h-4 mr-2" />
                                Choisir ce plan
                              </>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">
              Choisissez votre mode de paiement <span className="text-blue-600">préféré</span>
            </DialogTitle>
          </DialogHeader>

          {selectedPlan && (
            <div className="space-y-6 py-4">
              {/* Plan Summary */}
              <div className="p-4 bg-card rounded-lg border">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">{selectedPlan.name}</span>
                  <span className="font-bold text-lg">{selectedPlan.price} MAD</span>
                </div>
                {selectedPlan.period && (
                  <p className="text-sm text-muted-foreground">
                    Durée: {selectedPlan.period === "Annee" ? "1 Année" : "1 Semestre"}
                  </p>
                )}
              </div>

              {/* Semester Selection */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold">
                    Sélectionnez {getMaxSemesters(selectedPlan)} semestre{getMaxSemesters(selectedPlan) > 1 ? 's' : ''}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Choisissez les semestres auxquels vous souhaitez accéder avec votre abonnement
                </p>

                <div className="space-y-4 mt-3">
                  {/* Year 1 - S1, S2 */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">1ère Année</p>
                    <div className="grid grid-cols-2 gap-3">
                      {["S1", "S2"].map((semester) => {
                        const isSelected = selectedSemesters.includes(semester);
                        const isDisabled = !isSelected && selectedSemesters.length >= getMaxSemesters(selectedPlan);

                        return (
                          <div
                            key={semester}
                            className={`
                              relative flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all
                              ${isSelected
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : isDisabled
                                  ? 'border-border bg-muted text-slate-400 cursor-not-allowed opacity-50'
                                  : 'border-border hover:border-blue-300 hover:bg-blue-50'
                              }
                            `}
                            onClick={() => !isDisabled && handleSemesterChange(semester, !isSelected)}
                          >
                            <Checkbox
                              id={semester}
                              checked={isSelected}
                              disabled={isDisabled}
                              onCheckedChange={(checked) => handleSemesterChange(semester, checked)}
                              className="hidden"
                            />
                            <span className="text-sm font-bold">{semester}</span>
                            {isSelected && (
                              <div className="absolute -top-1 -right-1">
                                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                  <Check className="w-3 h-3 text-white" />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Year 2 - S3, S4 */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">2ème Année</p>
                    <div className="grid grid-cols-2 gap-3">
                      {["S3", "S4"].map((semester) => {
                        const isSelected = selectedSemesters.includes(semester);
                        const isDisabled = !isSelected && selectedSemesters.length >= getMaxSemesters(selectedPlan);

                        return (
                          <div
                            key={semester}
                            className={`
                              relative flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all
                              ${isSelected
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : isDisabled
                                  ? 'border-border bg-muted text-slate-400 cursor-not-allowed opacity-50'
                                  : 'border-border hover:border-blue-300 hover:bg-blue-50'
                              }
                            `}
                            onClick={() => !isDisabled && handleSemesterChange(semester, !isSelected)}
                          >
                            <Checkbox
                              id={semester}
                              checked={isSelected}
                              disabled={isDisabled}
                              onCheckedChange={(checked) => handleSemesterChange(semester, checked)}
                              className="hidden"
                            />
                            <span className="text-sm font-bold">{semester}</span>
                            {isSelected && (
                              <div className="absolute -top-1 -right-1">
                                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                  <Check className="w-3 h-3 text-white" />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Year 3 - S5, S6 */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">3ème Année</p>
                    <div className="grid grid-cols-2 gap-3">
                      {["S5", "S6"].map((semester) => {
                        const isSelected = selectedSemesters.includes(semester);
                        const isDisabled = !isSelected && selectedSemesters.length >= getMaxSemesters(selectedPlan);

                        return (
                          <div
                            key={semester}
                            className={`
                              relative flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all
                              ${isSelected
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : isDisabled
                                  ? 'border-border bg-muted text-slate-400 cursor-not-allowed opacity-50'
                                  : 'border-border hover:border-blue-300 hover:bg-blue-50'
                              }
                            `}
                            onClick={() => !isDisabled && handleSemesterChange(semester, !isSelected)}
                          >
                            <Checkbox
                              id={semester}
                              checked={isSelected}
                              disabled={isDisabled}
                              onCheckedChange={(checked) => handleSemesterChange(semester, checked)}
                              className="hidden"
                            />
                            <span className="text-sm font-bold">{semester}</span>
                            {isSelected && (
                              <div className="absolute -top-1 -right-1">
                                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                  <Check className="w-3 h-3 text-white" />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Year 4 - S7, S8 */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">4ème Année</p>
                    <div className="grid grid-cols-2 gap-3">
                      {["S7", "S8"].map((semester) => {
                        const isSelected = selectedSemesters.includes(semester);
                        const isDisabled = !isSelected && selectedSemesters.length >= getMaxSemesters(selectedPlan);

                        return (
                          <div
                            key={semester}
                            className={`
                              relative flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all
                              ${isSelected
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : isDisabled
                                  ? 'border-border bg-muted text-slate-400 cursor-not-allowed opacity-50'
                                  : 'border-border hover:border-blue-300 hover:bg-blue-50'
                              }
                            `}
                            onClick={() => !isDisabled && handleSemesterChange(semester, !isSelected)}
                          >
                            <Checkbox
                              id={semester}
                              checked={isSelected}
                              disabled={isDisabled}
                              onCheckedChange={(checked) => handleSemesterChange(semester, checked)}
                              className="hidden"
                            />
                            <span className="text-sm font-bold">{semester}</span>
                            {isSelected && (
                              <div className="absolute -top-1 -right-1">
                                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                  <Check className="w-3 h-3 text-white" />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Year 5 - S9, S10 */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">5ème Année</p>
                    <div className="grid grid-cols-2 gap-3">
                      {["S9", "S10"].map((semester) => {
                        const isSelected = selectedSemesters.includes(semester);
                        const isDisabled = !isSelected && selectedSemesters.length >= getMaxSemesters(selectedPlan);

                        return (
                          <div
                            key={semester}
                            className={`
                              relative flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all
                              ${isSelected
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : isDisabled
                                  ? 'border-border bg-muted text-slate-400 cursor-not-allowed opacity-50'
                                  : 'border-border hover:border-blue-300 hover:bg-blue-50'
                              }
                            `}
                            onClick={() => !isDisabled && handleSemesterChange(semester, !isSelected)}
                          >
                            <Checkbox
                              id={semester}
                              checked={isSelected}
                              disabled={isDisabled}
                              onCheckedChange={(checked) => handleSemesterChange(semester, checked)}
                              className="hidden"
                            />
                            <span className="text-sm font-bold">{semester}</span>
                            {isSelected && (
                              <div className="absolute -top-1 -right-1">
                                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                  <Check className="w-3 h-3 text-white" />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Selection summary */}
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700">
                    <strong>Semestres sélectionnés:</strong>{' '}
                    {selectedSemesters.length > 0
                      ? selectedSemesters.sort().join(', ')
                      : 'Aucun sélectionné'
                    }
                    {' '}({selectedSemesters.length}/{getMaxSemesters(selectedPlan)})
                  </p>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mt-6">
                {/* Bank Transfer Option */}
                <div
                  onClick={() => setPaymentMethod('transfer')}
                  className={`
                    relative p-5 rounded-xl border-2 cursor-pointer transition-all
                    ${paymentMethod === 'transfer'
                      ? 'border-blue-500 bg-blue-50 shadow-lg'
                      : 'border-border hover:border-blue-300 hover:bg-blue-50/50'
                    }
                  `}
                >
                  {paymentMethod === 'transfer' && (
                    <div className="absolute -top-2 -right-2">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="font-bold text-lg text-foreground">Contact puis Transfert</h4>
                  </div>

                  <p className="text-sm text-muted-foreground mb-2">
                    Contactez-nous sur WhatsApp pour finaliser votre commande et obtenir tous les détails
                  </p>
                  <p className="text-xl font-bold text-blue-600 mb-4">{WHATSAPP_NUMBER}</p>

                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      Contactez-nous sur WhatsApp pour finaliser votre commande
                    </li>
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      Procédez au paiement pour valider et expédier votre commande
                    </li>
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      Activation sous 24H Inchallah (délai étendu à 48H lors des fortes sollicitations)
                    </li>
                  </ul>

                  <div className="mt-4 flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">24-48H</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-3 sm:justify-between mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowPaymentDialog(false);
                setSelectedSemesters([]);
                setPaymentMethod(null);
              }}
              disabled={paymentLoading}
            >
              Annuler
            </Button>

            {paymentMethod === 'transfer' && (
              <Button
                onClick={handleContactWhatsApp}
                disabled={selectedSemesters.length !== getMaxSemesters(selectedPlan)}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Demande
              </Button>
            )}

            {!paymentMethod && (
              <Button
                disabled
                className="bg-slate-300 text-muted-foreground cursor-not-allowed"
              >
                Sélectionnez un mode de paiement
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bank Transfer Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              Confirmer la demande de transfert bancaire
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Êtes-vous sûr de vouloir continuer avec le transfert bancaire ?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-foreground mb-2">Détails de votre commande</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan:</span>
                  <span className="font-medium text-foreground">{selectedPlan?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prix:</span>
                  <span className="font-medium text-foreground">{selectedPlan?.price} MAD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Semestres:</span>
                  <span className="font-medium text-foreground">{selectedSemesters.join(', ')}</span>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900">
                  <p className="font-semibold mb-1">Prochaines étapes:</p>
                  <ol className="list-decimal list-inside space-y-1 text-amber-800">
                    <li>Une demande sera créée dans le panneau admin</li>
                    <li>Vous serez redirigé vers WhatsApp</li>
                    <li><strong>Contactez le support via WhatsApp</strong> pour finaliser le paiement</li>
                    <li>Activation sous 24-48H après confirmation du paiement</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <p className="text-sm text-green-800 font-medium">
                📱 Après confirmation, contactez-nous sur WhatsApp au <strong>{WHATSAPP_NUMBER}</strong>
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={requestLoading}
            >
              Annuler
            </Button>
            <Button
              onClick={handleConfirmBankTransfer}
              disabled={requestLoading}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
            >
              {requestLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Confirmer et Contacter
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientSubscriptionPage;
