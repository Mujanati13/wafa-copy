import React, { useState, useEffect } from "react";
import { useLocation } from 'react-router-dom';
import { motion as Motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Check, X, AlertCircle, Zap, Loader2, CreditCard, ShieldCheck, BookOpen, Building2, Clock, MessageCircle, Sparkles } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { dashboardService } from "@/services/dashboardService";
import { subscriptionPlanService } from "@/services/subscriptionPlanService";
import { toast } from "sonner";
import { api, cn } from "@/lib/utils";
import { displaySubscriptionCopy, displaySubscriptionPlanName, editableUserPlan } from "@/utils/subscriptionDisplay";

const API_URL = import.meta.env.VITE_API_URL;

const ClientSubscriptionPage = () => {
  const location = useLocation();

  const [userSubscription, setUserSubscription] = useState(null);
  const [allPlans, setAllPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedSemesters, setSelectedSemesters] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);

  // WhatsApp contact number
  const WHATSAPP_NUMBER = "0699204386";

  const getMaxSemesters = (plan) => (plan ? 1 : 0);
  const isCurrentSubscriptionPlan = (plan) => {
    return editableUserPlan(userSubscription?.plan) === editableUserPlan(plan?.name);
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

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
      const subResponse = await dashboardService.getUserSubscriptionInfo();
      setUserSubscription(subResponse.data || {});

      const plansResponse = await subscriptionPlanService.getAvailablePlans();
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
    if (isCurrentSubscriptionPlan(plan)) {
      toast.info('Vous avez déjà ce plan');
      return;
    }

    if (plan.price === 0) {
      toast.info('Vous êtes déjà sur le plan gratuit');
      return;
    }

    setSelectedPlan(plan);
    setSelectedSemesters([]);
    setPaymentMethod('transfer');
    setShowPaymentDialog(true);
  };

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

  const handleContactWhatsApp = () => {
    if (!selectedPlan) return;

    const maxSemesters = getMaxSemesters(selectedPlan);
    if (selectedSemesters.length !== maxSemesters) {
      toast.error(`Veuillez sélectionner ${maxSemesters} semestre${maxSemesters > 1 ? 's' : ''}`);
      return;
    }

    setShowConfirmDialog(true);
  };

  const handleConfirmBankTransfer = async () => {
    if (!selectedPlan) return;

    try {
      setRequestLoading(true);
      const semestersList = selectedSemesters.sort().join(', ');

      const requestData = {
        planId: selectedPlan._id,
        planName: displaySubscriptionPlanName(selectedPlan.name),
        amount: selectedPlan.price,
        semesters: selectedSemesters,
        paymentMode: "Bank Transfer"
      };

      const response = await api.post(
        `/payments/bank-transfer-request`,
        requestData
      );

      if (response.data.success) {
        toast.success('Demande créée !', {
          description: 'Votre demande a été enregistrée. Contactez-nous sur WhatsApp pour finaliser.'
        });

        const message = encodeURIComponent(
          `Bonjour ! Je souhaite souscrire au plan ${displaySubscriptionPlanName(selectedPlan.name)} (${selectedPlan.price} MAD).\n\nSemestres choisis : ${semestersList}\n\nJ'ai créé une demande de paiement (#${response.data.requestId || 'N/A'}).\n\nMerci de me contacter pour finaliser mon abonnement.`
        );

        const whatsappUrl = `https://wa.me/212${WHATSAPP_NUMBER.replace(/^0/, '')}?text=${message}`;
        window.open(whatsappUrl, '_blank');

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

  return (
    <div className="min-h-screen bg-background text-foreground p-3 sm:p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <Motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-3"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Offres & Abonnements</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">Mes Abonnements</h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            Gérez votre plan d'abonnement et débloquez l'intégralité des modules, banques de QCM et explications avancées.
          </p>
        </Motion.div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="h-96 animate-pulse bg-card border-border">
                <CardContent className="p-6 space-y-4">
                  <div className="h-8 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Current Subscription Status */}
            <Motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Card className="border-l-4 border-l-primary bg-card border-border text-card-foreground shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-bold">
                    <Zap className="w-5 h-5 text-primary" />
                    Votre Plan Actuel
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Plan d'abonnement</p>
                    <Badge className="text-sm sm:text-base px-3.5 py-1.5" variant={userSubscription?.plan === 'Premium' ? 'default' : 'secondary'}>
                      {displaySubscriptionPlanName(userSubscription?.plan, 'Plan Gratuit')}
                    </Badge>
                  </div>
                  {userSubscription?.subscription && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Date d'expiration</p>
                        <p className="font-semibold text-sm">
                          {new Date(userSubscription.subscription.expiryDate).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Statut</p>
                        <Badge variant="outline" className="gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                          Actif
                        </Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Motion.div>

            {/* Available Plans */}
            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-6 text-foreground">Plans Disponibles</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {allPlans.map((plan, index) => {
                  const isCurrentPlan = isCurrentSubscriptionPlan(plan);
                  const isFree = plan.price === 0;

                  return (
                    <Motion.div
                      key={plan._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 * (index + 1) }}
                    >
                      <Card
                        className={cn(
                          "flex flex-col h-full relative rounded-2xl bg-card border-border text-card-foreground hover:shadow-lg transition-all duration-300",
                          isCurrentPlan
                            ? "ring-2 ring-primary border-primary shadow-md shadow-primary/10"
                            : ""
                        )}
                      >
                        {/* Current Plan Badge */}
                        {isCurrentPlan && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                            <Badge className="bg-primary text-primary-foreground px-3.5 py-1 shadow-md text-xs font-semibold">
                              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                              Plan Actuel
                            </Badge>
                          </div>
                        )}

                        <CardHeader className={isCurrentPlan ? 'pt-8' : ''}>
                          <CardTitle className="text-2xl font-bold text-foreground">{displaySubscriptionPlanName(plan.name)}</CardTitle>
                          <CardDescription className="text-muted-foreground text-xs leading-relaxed min-h-[32px]">
                            {displaySubscriptionCopy(plan.description)}
                          </CardDescription>
                          <div className="mt-4">
                            <span className="text-3xl font-extrabold text-foreground">
                              {plan.price === 0 ? 'Gratuit' : `${plan.price} MAD`}
                            </span>
                            {plan.oldPrice && (
                              <span className="text-sm text-muted-foreground/60 line-through ml-2">
                                {plan.oldPrice} MAD
                              </span>
                            )}
                            {plan.period && !isFree && (
                              <span className="text-xs text-muted-foreground ml-2">
                                / semestre
                              </span>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-6 flex flex-col justify-between">
                          {/* Features */}
                          <div className="space-y-3">
                            {plan.name === 'GRATUIT' && (!Array.isArray(plan.features) || plan.features.length === 0) && (
                              <>
                                <div className="flex items-start gap-2.5">
                                  <span className="text-emerald-500 font-bold text-xs shrink-0 mt-0.5">✔️</span>
                                  <span className="text-xs text-foreground">1 examen dans 1 module</span>
                                </div>
                                <div className="flex items-start gap-2.5">
                                  <span className="text-emerald-500 font-bold text-xs shrink-0 mt-0.5">✔️</span>
                                  <span className="text-xs text-foreground">Questions triées (question par question, toutes)</span>
                                </div>
                                <div className="flex items-start gap-2.5">
                                  <span className="text-emerald-500 font-bold text-xs shrink-0 mt-0.5">✔️</span>
                                  <span className="text-xs text-foreground">Interface adaptée aux mobiles</span>
                                </div>
                                <div className="flex items-start gap-2.5 opacity-40">
                                  <span className="text-rose-500 font-bold text-xs shrink-0 mt-0.5">❌</span>
                                  <span className="text-xs text-muted-foreground line-through">Accès aux classements</span>
                                </div>
                                <div className="flex items-start gap-2.5 opacity-40">
                                  <span className="text-rose-500 font-bold text-xs shrink-0 mt-0.5">❌</span>
                                  <span className="text-xs text-muted-foreground line-through">Accès aux statistiques</span>
                                </div>
                                <div className="flex items-start gap-2.5 opacity-40">
                                  <span className="text-rose-500 font-bold text-xs shrink-0 mt-0.5">❌</span>
                                  <span className="text-xs text-muted-foreground line-through">Explication des étudiants</span>
                                </div>
                                <div className="flex items-start gap-2.5 opacity-40">
                                  <span className="text-rose-500 font-bold text-xs shrink-0 mt-0.5">❌</span>
                                  <span className="text-xs text-muted-foreground line-through">Explication de l'IA</span>
                                </div>
                                <div className="flex items-start gap-2.5 opacity-40">
                                  <span className="text-rose-500 font-bold text-xs shrink-0 mt-0.5">❌</span>
                                  <span className="text-xs text-muted-foreground line-through">Accès à la communauté votes</span>
                                </div>
                                <div className="flex items-start gap-2.5 opacity-40">
                                  <span className="text-rose-500 font-bold text-xs shrink-0 mt-0.5">❌</span>
                                  <span className="text-xs text-muted-foreground line-through">Création de playlists</span>
                                </div>
                                <div className="flex items-start gap-2.5 opacity-40">
                                  <span className="text-rose-500 font-bold text-xs shrink-0 mt-0.5">❌</span>
                                  <span className="text-xs text-muted-foreground line-through">Notes personnalisées</span>
                                </div>
                                <div className="flex items-start gap-2.5 opacity-40">
                                  <span className="text-rose-500 font-bold text-xs shrink-0 mt-0.5">❌</span>
                                  <span className="text-xs text-muted-foreground line-through">Assistance prioritaire</span>
                                </div>
                              </>
                            )}

                            {plan.name === 'PREMIUM' && (!Array.isArray(plan.features) || plan.features.length === 0) && (
                              <>
                                <div className="flex items-start gap-2.5">
                                  <span className="text-emerald-500 font-bold text-xs shrink-0 mt-0.5">✔️</span>
                                  <span className="text-xs text-foreground">Tous les modules</span>
                                </div>
                                <div className="flex items-start gap-2.5">
                                  <span className="text-emerald-500 font-bold text-xs shrink-0 mt-0.5">✔️</span>
                                  <span className="text-xs text-foreground">Questions triées (question par question, toutes)</span>
                                </div>
                                <div className="flex items-start gap-2.5">
                                  <span className="text-emerald-500 font-bold text-xs shrink-0 mt-0.5">✔️</span>
                                  <span className="text-xs text-foreground">Interface adaptée aux mobiles</span>
                                </div>
                                <div className="flex items-start gap-2.5">
                                  <span className="text-emerald-500 font-bold text-xs shrink-0 mt-0.5">✔️</span>
                                  <span className="text-xs text-foreground">Accès aux classements</span>
                                </div>
                                <div className="flex items-start gap-2.5">
                                  <span className="text-emerald-500 font-bold text-xs shrink-0 mt-0.5">✔️</span>
                                  <span className="text-xs text-foreground">Accès aux statistiques</span>
                                </div>
                                <div className="flex items-start gap-2.5">
                                  <span className="text-emerald-500 font-bold text-xs shrink-0 mt-0.5">✔️</span>
                                  <span className="text-xs text-foreground">Explication des étudiants</span>
                                </div>
                                <div className="flex items-start gap-2.5 opacity-40">
                                  <span className="text-rose-500 font-bold text-xs shrink-0 mt-0.5">❌</span>
                                  <span className="text-xs text-muted-foreground line-through">Explication de l'IA</span>
                                </div>
                                <div className="flex items-start gap-2.5 opacity-40">
                                  <span className="text-rose-500 font-bold text-xs shrink-0 mt-0.5">❌</span>
                                  <span className="text-xs text-muted-foreground line-through">Accès à la communauté votes</span>
                                </div>
                                <div className="flex items-start gap-2.5 opacity-40">
                                  <span className="text-rose-500 font-bold text-xs shrink-0 mt-0.5">❌</span>
                                  <span className="text-xs text-muted-foreground line-through">Création de playlists</span>
                                </div>
                                <div className="flex items-start gap-2.5 opacity-40">
                                  <span className="text-rose-500 font-bold text-xs shrink-0 mt-0.5">❌</span>
                                  <span className="text-xs text-muted-foreground line-through">Notes personnalisées</span>
                                </div>
                                <div className="flex items-start gap-2.5 opacity-40">
                                  <span className="text-rose-500 font-bold text-xs shrink-0 mt-0.5">❌</span>
                                  <span className="text-xs text-muted-foreground line-through">Assistance prioritaire</span>
                                </div>
                              </>
                            )}

                            {plan.name === 'PREMIUM PRO' && (!Array.isArray(plan.features) || plan.features.length === 0) && (
                              <>
                                <div className="flex items-start gap-2.5">
                                  <span className="text-emerald-500 font-bold text-xs shrink-0 mt-0.5">✔️</span>
                                  <span className="text-xs text-foreground">Tous les modules</span>
                                </div>
                                <div className="flex items-start gap-2.5">
                                  <span className="text-emerald-500 font-bold text-xs shrink-0 mt-0.5">✔️</span>
                                  <span className="text-xs text-foreground">Questions triées (question par question, toutes)</span>
                                </div>
                                <div className="flex items-start gap-2.5">
                                  <span className="text-emerald-500 font-bold text-xs shrink-0 mt-0.5">✔️</span>
                                  <span className="text-xs text-foreground">Interface adaptée aux mobiles</span>
                                </div>
                                <div className="flex items-start gap-2.5">
                                  <span className="text-emerald-500 font-bold text-xs shrink-0 mt-0.5">✔️</span>
                                  <span className="text-xs text-foreground">Pourcentage des réponses</span>
                                </div>
                                <div className="flex items-start gap-2.5">
                                  <span className="text-emerald-500 font-bold text-xs shrink-0 mt-0.5">✔️</span>
                                  <span className="text-xs text-foreground">Accès aux classements</span>
                                </div>
                                <div className="flex items-start gap-2.5">
                                  <span className="text-emerald-500 font-bold text-xs shrink-0 mt-0.5">✔️</span>
                                  <span className="text-xs text-foreground">Accès aux statistiques</span>
                                </div>
                                <div className="flex items-start gap-2.5">
                                  <span className="text-emerald-500 font-bold text-xs shrink-0 mt-0.5">✔️</span>
                                  <span className="text-xs text-foreground">Explication des étudiants</span>
                                </div>
                                <div className="flex items-start gap-2.5">
                                  <span className="text-emerald-500 font-bold text-xs shrink-0 mt-0.5">✔️</span>
                                  <span className="text-xs text-foreground">Explication de l'IA</span>
                                </div>
                                <div className="flex items-start gap-2.5">
                                  <span className="text-emerald-500 font-bold text-xs shrink-0 mt-0.5">✔️</span>
                                  <span className="text-xs text-foreground">Accès à la communauté votes</span>
                                </div>
                                <div className="flex items-start gap-2.5">
                                  <span className="text-emerald-500 font-bold text-xs shrink-0 mt-0.5">✔️</span>
                                  <span className="text-xs text-foreground">Création de playlists</span>
                                </div>
                                <div className="flex items-start gap-2.5">
                                  <span className="text-emerald-500 font-bold text-xs shrink-0 mt-0.5">✔️</span>
                                  <span className="text-xs text-foreground">Notes personnalisées</span>
                                </div>
                                <div className="flex items-start gap-2.5">
                                  <span className="text-emerald-500 font-bold text-xs shrink-0 mt-0.5">✔️</span>
                                  <span className="text-xs text-foreground">Assistance prioritaire</span>
                                </div>
                              </>
                            )}

                            {Array.isArray(plan.features) && plan.features.length > 0 && plan.features.map((feature, idx) => {
                              const featureText = typeof feature === 'string' ? feature : feature.text;
                              const isIncluded = typeof feature === 'string' || feature.included !== false;

                              return (
                                <div key={idx} className={cn("flex items-start gap-2.5", !isIncluded && "opacity-40")}>
                                  {isIncluded
                                    ? <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                                    : <X className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />}
                                  <span className={cn("text-xs", isIncluded ? "text-foreground" : "text-muted-foreground line-through")}>{displaySubscriptionCopy(featureText)}</span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Current Plan Indicator */}
                          {isCurrentPlan && (
                            <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-xl border border-primary/20">
                              <AlertCircle className="w-4 h-4 text-primary shrink-0" />
                              <span className="text-xs text-primary font-medium">
                                Votre plan actuel
                              </span>
                            </div>
                          )}

                          {/* Action Button */}
                          <Button
                            onClick={() => handleSelectPlan(plan)}
                            disabled={isCurrentPlan || isFree}
                            className={cn(
                              "w-full rounded-xl font-semibold h-11 text-xs sm:text-sm",
                              isCurrentPlan || isFree
                                ? 'opacity-50 cursor-default'
                                : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm'
                            )}
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
                    </Motion.div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-card text-card-foreground border-border rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-bold text-center text-foreground">
              Choisissez votre mode de paiement <span className="text-primary">préféré</span>
            </DialogTitle>
          </DialogHeader>

          {selectedPlan && (
            <div className="space-y-6 py-4">
              {/* Plan Summary */}
              <div className="p-4 bg-muted/40 rounded-2xl border border-border">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-foreground">{displaySubscriptionPlanName(selectedPlan.name)}</span>
                  <span className="font-extrabold text-lg text-primary">{selectedPlan.price} MAD</span>
                </div>
                {selectedPlan.period && (
                  <p className="text-xs text-muted-foreground">
                    Durée: 1 Semestre
                  </p>
                )}
              </div>

              {/* Semester Selection */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-foreground font-semibold text-sm sm:text-base">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <h3>
                    Sélectionnez {getMaxSemesters(selectedPlan)} semestre{getMaxSemesters(selectedPlan) > 1 ? 's' : ''}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Choisissez les semestres auxquels vous souhaitez accéder avec votre abonnement
                </p>

                <div className="space-y-4 mt-3">
                  {[
                    { year: "1ère Année", sems: ["S1", "S2"] },
                    { year: "2ème Année", sems: ["S3", "S4"] },
                    { year: "3ème Année", sems: ["S5", "S6"] },
                    { year: "4ème Année", sems: ["S7", "S8"] },
                    { year: "5ème Année", sems: ["S9", "S10"] },
                  ].map((group) => (
                    <div key={group.year} className="space-y-1.5">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{group.year}</p>
                      <div className="grid grid-cols-2 gap-3">
                        {group.sems.map((semester) => {
                          const isSelected = selectedSemesters.includes(semester);
                          const isDisabled = !isSelected && selectedSemesters.length >= getMaxSemesters(selectedPlan);

                          return (
                            <div
                              key={semester}
                              className={cn(
                                "relative flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all text-xs font-bold",
                                isSelected
                                  ? "border-primary bg-primary/10 text-primary dark:bg-primary/20"
                                  : isDisabled
                                    ? "border-border bg-muted text-muted-foreground/40 cursor-not-allowed opacity-50"
                                    : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/40"
                              )}
                              onClick={() => !isDisabled && handleSemesterChange(semester, !isSelected)}
                            >
                              <Checkbox
                                id={semester}
                                checked={isSelected}
                                disabled={isDisabled}
                                onCheckedChange={(checked) => handleSemesterChange(semester, checked)}
                                className="hidden"
                              />
                              <span>{semester}</span>
                              {isSelected && (
                                <div className="absolute -top-1 -right-1">
                                  <div className="w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-sm">
                                    <Check className="w-3 h-3" />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Selection summary */}
                <div className="mt-3 p-3 bg-primary/10 rounded-xl border border-primary/20">
                  <p className="text-xs text-foreground font-medium">
                    <strong className="text-primary">Semestres sélectionnés:</strong>{' '}
                    {selectedSemesters.length > 0
                      ? selectedSemesters.sort().join(', ')
                      : 'Aucun sélectionné'
                    }
                    {' '}({selectedSemesters.length}/{getMaxSemesters(selectedPlan)})
                  </p>
                </div>
              </div>

              {/* Payment Method */}
              <div className="grid grid-cols-1 gap-4 mt-6">
                <div
                  onClick={() => setPaymentMethod('transfer')}
                  className={cn(
                    "relative p-5 rounded-2xl border-2 cursor-pointer transition-all",
                    paymentMethod === 'transfer'
                      ? "border-primary bg-primary/10 dark:bg-primary/20 shadow-md text-foreground"
                      : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                  )}
                >
                  {paymentMethod === 'transfer' && (
                    <div className="absolute -top-2 -right-2">
                      <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-sm">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-base sm:text-lg text-foreground">Contact puis Transfert</h4>
                  </div>

                  <p className="text-xs sm:text-sm text-muted-foreground mb-2 leading-relaxed">
                    Contactez-nous sur WhatsApp pour finaliser votre commande et obtenir tous les détails.
                  </p>
                  <p className="text-lg sm:text-xl font-extrabold text-primary mb-4">{WHATSAPP_NUMBER}</p>

                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Contactez-nous sur WhatsApp pour finaliser votre commande
                    </li>
                    <li className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Procédez au paiement pour valider votre commande
                    </li>
                    <li className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Activation sous 24H (délai étendu à 48H lors des fortes sollicitations)
                    </li>
                  </ul>

                  <div className="mt-4 flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold">Délai d'activation : 24-48H</span>
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
              className="rounded-xl border-border"
            >
              Annuler
            </Button>

            {paymentMethod === 'transfer' && (
              <Button
                onClick={handleContactWhatsApp}
                disabled={selectedSemesters.length !== getMaxSemesters(selectedPlan)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Demande de paiement</span>
              </Button>
            )}

            {!paymentMethod && (
              <Button
                disabled
                className="bg-muted text-muted-foreground cursor-not-allowed rounded-xl"
              >
                Sélectionnez un mode de paiement
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bank Transfer Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md bg-card text-card-foreground border-border rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              Confirmer la demande de transfert
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Êtes-vous sûr de vouloir continuer avec le transfert bancaire ?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4">
              <h4 className="font-bold text-foreground text-xs uppercase tracking-wider mb-2">Détails de votre commande</h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan :</span>
                  <span className="font-semibold text-foreground">{selectedPlan?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prix :</span>
                  <span className="font-semibold text-primary">{selectedPlan?.price} MAD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Semestres :</span>
                  <span className="font-semibold text-foreground">{selectedSemesters.join(', ')}</span>
                </div>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 dark:text-amber-200">
                  <p className="font-bold mb-1">Prochaines étapes :</p>
                  <ol className="list-decimal list-inside space-y-1 text-amber-800 dark:text-amber-300/90 leading-relaxed">
                    <li>Une demande sera créée dans le panneau admin</li>
                    <li>Vous serez redirigé vers WhatsApp</li>
                    <li><strong>Contactez le support via WhatsApp</strong> pour finaliser le paiement</li>
                    <li>Activation sous 24-48H après confirmation</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3 text-center">
              <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                📱 Après confirmation, contactez-nous sur WhatsApp au <strong>{WHATSAPP_NUMBER}</strong>
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={requestLoading}
              className="rounded-xl border-border"
            >
              Annuler
            </Button>
            <Button
              onClick={handleConfirmBankTransfer}
              disabled={requestLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold"
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
