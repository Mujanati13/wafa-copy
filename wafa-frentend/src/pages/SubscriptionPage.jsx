import React, { useState, useEffect } from "react";
import { motion as Motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import PlanModal from "@/components/admin/PlanModal";
import { DollarSign, SquareChartGantt, UserRoundCheck, Trash2, Edit, Plus, Users, TrendingUp, Loader, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { adminAnalyticsService } from "@/services/adminAnalyticsService";
import { subscriptionPlanService } from "@/services/subscriptionPlanService";
import { toast } from "sonner";
import { displaySubscriptionCopy, displaySubscriptionFeature, displaySubscriptionPlanName } from "@/utils/subscriptionDisplay";

const SubscriptionPage = () => {
  // Real subscription statistics
  const [subscriptionStats, setSubscriptionStats] = useState({
    free: 0,
    premium: 0,
    total: 0,
    conversionRate: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);
  
  // Real subscription plans from API
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Modal state for create/edit
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planModalTitle, setPlanModalTitle] = useState("Create Plan");
  const [planModalMode, setPlanModalMode] = useState("create");
  const [currentPlanId, setCurrentPlanId] = useState(null);
  const [planModalInitial, setPlanModalInitial] = useState(null);
  
  useEffect(() => {
    fetchSubscriptionStats();
    fetchSubscriptionPlans();
  }, []);
  
  const fetchSubscriptionStats = async () => {
    try {
      setStatsLoading(true);
      const response = await adminAnalyticsService.getSubscriptionAnalytics();
      // Handle both nested (response.data.data) and flat (response.data) structures
      const statsData = response.data?.data || response.data || response;
      setSubscriptionStats({
        free: statsData.free || 0,
        premium: statsData.premium || 0,
        total: statsData.total || 0,
        conversionRate: statsData.conversionRate || 0
      });
    } catch (error) {
      console.error('Error fetching subscription stats:', error);
      toast.error('Impossible de charger les statistiques d\'abonnement');
    } finally {
      setStatsLoading(false);
    }
  };
  
  const fetchSubscriptionPlans = async () => {
    try {
      setPlansLoading(true);
      const response = await subscriptionPlanService.getAllPlans();
      // Handle both nested (response.data) and direct array structures
      const plansData = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setSubscriptionPlans(plansData);
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
      toast.error('Impossible de charger les plans d\'abonnement');
    } finally {
      setPlansLoading(false);
    }
  };

  const openCreateModal = () => {
    setPlanModalTitle("Create Plan");
    setPlanModalMode("create");
    setCurrentPlanId(null);
    setPlanModalInitial({
      name: "",
      description: "",
      price: "",
      oldPrice: "",
      period: "Semester",
      features: [],
    });
    setIsPlanModalOpen(true);
  };

  const openEditModal = (plan) => {
    setPlanModalTitle("Edit Plan");
    setPlanModalMode("edit");
    setCurrentPlanId(plan._id);
    setPlanModalInitial({ ...plan });
    setIsPlanModalOpen(true);
  };

  const handleModalCancel = () => {
    setIsPlanModalOpen(false);
    setPlanModalInitial(null);
    setCurrentPlanId(null);
  };

  const handleModalSave = async (form) => {
    try {
      setIsSaving(true);
      const formData = {
        name: form.name?.trim() || "",
        description: form.description?.trim() || "",
        price: form.price === "" || form.price == null ? 0 : parseFloat(form.price),
        oldPrice: form.oldPrice === "" || form.oldPrice == null ? null : parseFloat(form.oldPrice),
        period: form.period || "Semester",
        features: Array.isArray(form.features) ? form.features.filter(Boolean) : [],
      };

      if (planModalMode === "create") {
        await subscriptionPlanService.createPlan(formData);
        toast.success('Succès', { description: 'Plan créé avec succès.' });
      } else {
        await subscriptionPlanService.updatePlan(currentPlanId, formData);
        toast.success('Succès', { description: 'Plan mis à jour avec succès.' });
      }

      // Refresh plans
      await fetchSubscriptionPlans();
      handleModalCancel();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Impossible de sauvegarder le plan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce plan ?')) {
      return;
    }

    try {
      setIsSaving(true);
      await subscriptionPlanService.deletePlan(id);
      toast.success('Succès', { description: 'Plan supprimé avec succès.' });
      await fetchSubscriptionPlans();
      if (currentPlanId === id) {
        handleModalCancel();
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Impossible de supprimer le plan');
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate totals
  const totalPlans = subscriptionPlans.length;
  const totalSubscribers = subscriptionPlans.reduce(
    (sum, plan) => sum + (plan.subscribers || 0),
    0
  );
  const monthlyRevenue = subscriptionPlans.reduce(
    (sum, plan) => sum + (plan.revenue || 0),
    0
  );
  const averageRevenuePerUser =
    totalSubscribers > 0 ? monthlyRevenue / totalSubscribers : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 p-6">
      <div className="w-full space-y-6">
        {/* Header with gradient background */}
        <Motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-400 p-6 text-white shadow-lg flex justify-between items-center"
        >
          <div>
            <h1 className="text-3xl font-bold mb-2">Subscription Plans</h1>
            <p className="text-indigo-100">
              Manage pricing plans and subscription tiers
            </p>
          </div>
          <Button
            onClick={openCreateModal}
            className="bg-card hover:bg-indigo-50 text-indigo-600 shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Plan
          </Button>
        </Motion.div>

        {/* Real Subscription Statistics */}
        <Motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
        >
          <Card className="shadow-lg border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {statsLoading ? '...' : subscriptionStats.total}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <UserRoundCheck className="w-4 h-4" />
                Premium Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {statsLoading ? '...' : subscriptionStats.premium}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-l-4 border-l-gray-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                Free Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">
                {statsLoading ? '...' : subscriptionStats.free}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Conversion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {statsLoading ? '...' : `${subscriptionStats.conversionRate}%`}
              </div>
            </CardContent>
          </Card>
        </Motion.div>

        {/* Metrics Cards Section */}
        <Motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {/* Total Plans Card */}
          <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Total Plans</p>
                  <p className="text-3xl font-bold text-foreground mt-2">{totalPlans}</p>
                  <p className="text-xs text-muted-foreground mt-1">Active subscription tiers</p>
                </div>
                <SquareChartGantt className="w-8 h-8 text-indigo-600" />
              </div>
            </CardContent>
          </Card>

          {/* Total Subscribers Card */}
          <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Total Subscribers</p>
                  <p className="text-3xl font-bold text-foreground mt-2">{isNaN(totalSubscribers) ? 0 : totalSubscribers.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Across all plans</p>
                </div>
                <UserRoundCheck className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          {/* Monthly Revenue Card */}
          <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Monthly Revenue</p>
                  <p className="text-3xl font-bold text-foreground mt-2">
                    ${isNaN(monthlyRevenue) ? '0.00' : monthlyRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Monthly recurring revenue</p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          {/* Average Revenue Per User Card */}
          <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Avg Revenue/User</p>
                  <p className="text-3xl font-bold text-foreground mt-2">${isNaN(averageRevenuePerUser) ? '0.00' : averageRevenuePerUser.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Per subscription</p>
                </div>
                <DollarSign className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </Motion.div>

        {/* Plans Grid */}
        <Motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {plansLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="bg-card rounded-lg shadow-lg p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))
          ) : subscriptionPlans.length === 0 ? (
            <div className="col-span-4 text-center py-12">
              <p className="text-muted-foreground">Aucun plan disponible</p>
            </div>
          ) : (
            subscriptionPlans.map((plan, index) => (
            <Motion.div
              key={plan._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
              className="group relative"
            >
              <Card className="shadow-lg border-0 hover:shadow-2xl transition-all duration-300 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 group-hover:h-2 transition-all duration-300" />
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Plan Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-foreground">{displaySubscriptionPlanName(plan.name)}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{displaySubscriptionCopy(plan.description)}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            disabled={isSaving}
                          >
                            <Edit className="h-4 w-4 text-indigo-600 hover:text-indigo-700" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openEditModal(plan)}
                            className="flex items-center gap-2"
                          >
                            <Edit className="h-4 w-4" />
                            Edit Plan
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(plan._id)}
                            className="flex items-center gap-2 text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete Plan
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Pricing */}
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-foreground">
                          {plan.price} MAD
                        </span>
                        <span className="text-sm text-muted-foreground">/month</span>
                      </div>
                      {plan.oldPrice != null && plan.oldPrice > plan.price && (
                        <p className="text-sm text-muted-foreground">
                          <span className="line-through">{plan.oldPrice} MAD</span>
                          <Badge className="ml-2 bg-red-100 text-red-800">
                            Save {(plan.oldPrice - plan.price).toFixed(2)} MAD
                          </Badge>
                        </p>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                      <div className="bg-indigo-50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground uppercase font-semibold">
                          Subscribers
                        </p>
                        <p className="text-lg font-bold text-foreground mt-1">
                          {(plan.subscribers || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground uppercase font-semibold">
                          Revenue
                        </p>
                        <p className="text-lg font-bold text-foreground mt-1">
                          ${(plan.revenue || 0).toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                        Features
                      </p>
                      <div className="space-y-2">
                        {/* Custom features based on plan name */}
                        {plan.name === 'GRATUIT' && (!Array.isArray(plan.features) || plan.features.length === 0) && (
                          <>
                            <div className="flex items-start gap-2">
                              <span className="text-xs">✔️</span>
                              <span className="text-xs text-foreground">1 module</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs">✔️</span>
                              <span className="text-xs text-foreground">Questions triées</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs">✔️</span>
                              <span className="text-xs text-foreground">Interface adaptée aux mobiles</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs">✔️</span>
                              <span className="text-xs text-foreground">Pourcentage des réponses</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs">❌</span>
                              <span className="text-xs text-gray-400">Accès aux classements</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs">❌</span>
                              <span className="text-xs text-gray-400">Accès aux statistiques</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs">❌</span>
                              <span className="text-xs text-gray-400">Explications des étudiants</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs">❌</span>
                              <span className="text-xs text-gray-400">Explication de l'IA</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs">❌</span>
                              <span className="text-xs text-gray-400">Accès à la communauté votes</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs">❌</span>
                              <span className="text-xs text-gray-400">Création de playlists</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs">❌</span>
                              <span className="text-xs text-gray-400">Notes personnalisées</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs">❌</span>
                              <span className="text-xs text-gray-400">Assistance prioritaire</span>
                            </div>
                          </>
                        )}

                        {plan.name === 'PREMIUM' && (!Array.isArray(plan.features) || plan.features.length === 0) && (
                          <>
                            <div className="flex items-start gap-2">
                              <span className="text-xs">✔️</span>
                              <span className="text-xs text-foreground">Tous les modules</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs">✔️</span>
                              <span className="text-xs text-foreground">Questions triées</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs">✔️</span>
                              <span className="text-xs text-foreground">Interface adaptée aux mobiles</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs">✔️</span>
                              <span className="text-xs text-foreground">Pourcentage des réponses</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs">✔️</span>
                              <span className="text-xs text-foreground">Accès aux classements</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs">✔️</span>
                              <span className="text-xs text-foreground">Accès aux statistiques</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs">✔️</span>
                              <span className="text-xs text-foreground">Explications des étudiants</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs">❌</span>
                              <span className="text-xs text-gray-400">Explication de l'IA</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs">❌</span>
                              <span className="text-xs text-gray-400">Accès à la communauté votes</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs">❌</span>
                              <span className="text-xs text-gray-400">Création de playlists</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs">❌</span>
                              <span className="text-xs text-gray-400">Notes personnalisées</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs">❌</span>
                              <span className="text-xs text-gray-400">Assistance prioritaire</span>
                            </div>
                          </>
                        )}

                        {plan.name === 'PREMIUM PRO' && (!Array.isArray(plan.features) || plan.features.length === 0) && (
                          <>
                            <div className="flex items-start gap-2">
                              <span className="text-xs">✔️</span>
                              <span className="text-xs text-foreground">Tous les modules</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs">✔️</span>
                              <span className="text-xs text-foreground">Questions triées</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs">✔️</span>
                              <span className="text-xs text-foreground">Interface adaptée aux mobiles</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs">✔️</span>
                              <span className="text-xs text-foreground">Pourcentage des réponses</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs">✔️</span>
                              <span className="text-xs text-foreground">Accès aux classements</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs">✔️</span>
                              <span className="text-xs text-foreground">Accès aux statistiques</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs">✔️</span>
                              <span className="text-xs text-foreground">Explications des étudiants</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs">✔️</span>
                              <span className="text-xs text-foreground">Explication de l'IA</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs">✔️</span>
                              <span className="text-xs text-foreground">Accès à la communauté votes</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs">✔️</span>
                              <span className="text-xs text-foreground">Création de playlists</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs">✔️</span>
                              <span className="text-xs text-foreground">Notes personnalisées</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs">✔️</span>
                              <span className="text-xs text-foreground">Assistance prioritaire</span>
                            </div>
                          </>
                        )}

                        {Array.isArray(plan.features) && plan.features.length > 0 && plan.features.map((feature, index) => {
                          const featureText = typeof feature === "string" ? feature : feature.text;
                          const isIncluded = typeof feature === "string" || feature.included !== false;

                          return (
                            <div key={`${plan._id}-feature-${index}`} className={`flex items-start gap-2 ${!isIncluded ? "opacity-60" : ""}`}>
                              {isIncluded
                                ? <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-600" />
                                : <X className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-600" />}
                              <span className={`text-xs ${isIncluded ? "text-foreground" : "text-muted-foreground line-through"}`}>{displaySubscriptionFeature(featureText)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                      <Badge
                        className={
                          plan.status === "Active"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }
                      >
                        {plan.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Motion.div>
            ))
          )}
        </Motion.div>

        <PlanModal
          open={isPlanModalOpen}
          title={planModalTitle}
          initialPlan={planModalInitial}
          onSave={handleModalSave}
          onCancel={handleModalCancel}
        />
      </div>
    </div>
  );
};

export default SubscriptionPage;
