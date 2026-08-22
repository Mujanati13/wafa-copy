import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Loader2,
  Layout,
  Timer,
  CreditCard,
  HelpCircle,
  Phone,
  Megaphone,
  Save,
  Plus,
  Trash2,
  Facebook,
  Instagram,
  Youtube,
  MessageCircle,
  Image,
  Globe
} from "lucide-react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const LandingPageAdmin = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("hero");
  const [settings, setSettings] = useState({
    // Branding
    siteName: "",
    siteVersion: "",
    logoUrl: "",

    // Hero Section
    heroTitle: "",
    heroSubtitle: "",
    heroDescription: "",

    // Timer Section
    timerEnabled: false,
    timerEndDate: "",
    timerTitle: "",

    // Pricing Section
    pricingTitle: "",
    pricingSubtitle: "",
    freePlanFeatures: [],
    premiumMonthlyPrice: 0,
    premiumMonthlyFeatures: [],
    premiumAnnualPrice: 0,
    premiumAnnualFeatures: [],

    // FAQ Section
    faqTitle: "",
    faqItems: [],

    // Contact Section
    contactEmail: "",
    contactPhone: "",
    whatsappNumber: "",
    facebookUrl: "",
    instagramUrl: "",
    youtubeUrl: "",

    // Promotion Banner
    promotionEnabled: false,
    promotionText: "",
    promotionLink: "",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/landing-settings`, {
        withCredentials: true,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        setSettings({
          siteName: data.siteName || "",
          siteVersion: data.siteVersion || "",
          logoUrl: data.logoUrl || "",
          heroTitle: data.heroTitle || "",
          heroSubtitle: data.heroSubtitle || "",
          heroDescription: data.heroDescription || "",
          timerEnabled: data.timerEnabled ?? false,
          timerEndDate: data.timerEndDate ? new Date(data.timerEndDate).toISOString().slice(0, 16) : "",
          timerTitle: data.timerTitle || "",
          pricingTitle: data.pricingTitle || "",
          pricingSubtitle: data.pricingSubtitle || "",
          freePlanFeatures: data.freePlanFeatures || [],
          premiumMonthlyPrice: data.premiumMonthlyPrice || 0,
          premiumMonthlyFeatures: data.premiumMonthlyFeatures || [],
          premiumAnnualPrice: data.premiumAnnualPrice || 0,
          premiumAnnualFeatures: data.premiumAnnualFeatures || [],
          faqTitle: data.faqTitle || "",
          faqItems: data.faqItems || [],
          contactEmail: data.contactEmail || "",
          contactPhone: data.contactPhone || "",
          whatsappNumber: data.whatsappNumber || "",
          facebookUrl: data.facebookUrl || "",
          instagramUrl: data.instagramUrl || "",
          youtubeUrl: data.youtubeUrl || "",
          promotionEnabled: data.promotionEnabled ?? false,
          promotionText: data.promotionText || "",
          promotionLink: data.promotionLink || "",
        });
      }
    } catch (error) {
      console.error("Error fetching landing page settings:", error);
      if (error.response?.status !== 404) {
        toast.error("Erreur lors du chargement des paramètres");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (section) => {
    try {
      setSaving(true);
      let endpoint = "/landing-settings";
      let data = settings;

      // Use specific endpoints for different sections
      switch (section) {
        case "branding":
          endpoint = "/landing-settings/branding";
          data = {
            siteName: settings.siteName,
            siteVersion: settings.siteVersion,
            logoUrl: settings.logoUrl,
          };
          break;
        case "hero":
          endpoint = "/landing-settings/hero";
          data = {
            heroTitle: settings.heroTitle,
            heroSubtitle: settings.heroSubtitle,
            heroDescription: settings.heroDescription,
          };
          break;
        case "timer":
          endpoint = "/landing-settings/timer";
          data = {
            timerEnabled: settings.timerEnabled,
            timerEndDate: settings.timerEndDate ? new Date(settings.timerEndDate) : null,
            timerTitle: settings.timerTitle,
          };
          break;
        case "pricing":
          endpoint = "/landing-settings/pricing";
          data = {
            pricingTitle: settings.pricingTitle,
            pricingSubtitle: settings.pricingSubtitle,
            freePlanFeatures: settings.freePlanFeatures,
            premiumMonthlyPrice: settings.premiumMonthlyPrice,
            premiumMonthlyFeatures: settings.premiumMonthlyFeatures,
            premiumAnnualPrice: settings.premiumAnnualPrice,
            premiumAnnualFeatures: settings.premiumAnnualFeatures,
          };
          break;
        case "faq":
          endpoint = "/landing-settings/faq";
          data = {
            faqTitle: settings.faqTitle,
            faqItems: settings.faqItems,
          };
          break;
        case "contact":
          endpoint = "/landing-settings/contact";
          data = {
            contactEmail: settings.contactEmail,
            contactPhone: settings.contactPhone,
            whatsappNumber: settings.whatsappNumber,
            facebookUrl: settings.facebookUrl,
            instagramUrl: settings.instagramUrl,
            youtubeUrl: settings.youtubeUrl,
          };
          break;
        case "promotion":
          endpoint = "/landing-settings/promotion";
          data = {
            promotionEnabled: settings.promotionEnabled,
            promotionText: settings.promotionText,
            promotionLink: settings.promotionLink,
          };
          break;
        default:
          endpoint = "/landing-settings";
      }

      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `${API_URL}${endpoint}`,
        data,
        {
          withCredentials: true,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      if (response.data.success) {
        toast.success(response.data.message || "Paramètres enregistrés avec succès");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error(error.response?.data?.error || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Feature array handlers
  const handleAddFeature = (field) => {
    setSettings((prev) => ({
      ...prev,
      [field]: [...prev[field], ""],
    }));
  };

  const handleRemoveFeature = (field, index) => {
    setSettings((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const handleFeatureChange = (field, index, value) => {
    setSettings((prev) => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? value : item)),
    }));
  };

  // FAQ handlers
  const handleAddFAQ = () => {
    setSettings((prev) => ({
      ...prev,
      faqItems: [...prev.faqItems, { question: "", answer: "" }],
    }));
  };

  const handleRemoveFAQ = (index) => {
    setSettings((prev) => ({
      ...prev,
      faqItems: prev.faqItems.filter((_, i) => i !== index),
    }));
  };

  const handleFAQChange = (index, field, value) => {
    setSettings((prev) => ({
      ...prev,
      faqItems: prev.faqItems.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleDeleteTimer = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `${API_URL}/landing-settings/timer`,
        {
          timerEnabled: false,
          timerEndDate: null,
          timerTitle: "",
        },
        {
          withCredentials: true,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      if (response.data.success) {
        setSettings((prev) => ({
          ...prev,
          timerEnabled: false,
          timerEndDate: "",
          timerTitle: "",
        }));
        toast.success("Timer supprimé avec succès");
      }
    } catch (error) {
      console.error("Error deleting timer:", error);
      toast.error(error.response?.data?.error || "Erreur lors de la suppression du timer");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Layout className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Paramètres de la Page d'Accueil</h1>
          <p className="text-muted-foreground">
            Personnalisez le contenu de votre landing page
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Marque</span>
          </TabsTrigger>
          <TabsTrigger value="hero" className="flex items-center gap-2">
            <Layout className="h-4 w-4" />
            <span className="hidden sm:inline">Hero</span>
          </TabsTrigger>
          <TabsTrigger value="timer" className="flex items-center gap-2">
            <Timer className="h-4 w-4" />
            <span className="hidden sm:inline">Timer</span>
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Tarifs</span>
          </TabsTrigger>
          <TabsTrigger value="faq" className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            <span className="hidden sm:inline">FAQ</span>
          </TabsTrigger>
          <TabsTrigger value="contact" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            <span className="hidden sm:inline">Contact</span>
          </TabsTrigger>
          <TabsTrigger value="promotion" className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            <span className="hidden sm:inline">Promo</span>
          </TabsTrigger>
        </TabsList>

        {/* Branding Tab */}
        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>Marque et Logo</CardTitle>
              <CardDescription>
                Personnalisez le nom du site et le logo affichés sur la page d'accueil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Nom du Site</Label>
                  <Input
                    id="siteName"
                    placeholder="Imrs-Qcma"
                    value={settings.siteName}
                    onChange={(e) => handleChange("siteName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siteVersion">Version</Label>
                  <Input
                    id="siteVersion"
                    placeholder="v1.1"
                    value={settings.siteVersion}
                    onChange={(e) => handleChange("siteVersion", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logoUrl">URL du Logo</Label>
                <Input
                  id="logoUrl"
                  placeholder="https://example.com/logo.png"
                  value={settings.logoUrl}
                  onChange={(e) => handleChange("logoUrl", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Entrez l'URL d'une image pour remplacer l'icône par défaut. Laissez vide pour utiliser l'icône par défaut.
                </p>
              </div>

              {settings.logoUrl && (
                <div className="space-y-2">
                  <Label>Aperçu du Logo</Label>
                  <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                    <img
                      src={settings.logoUrl}
                      alt="Logo preview"
                      className="h-12 w-12 object-contain rounded-lg"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <span className="text-lg font-bold">{settings.siteName || "Imrs-Qcma"}</span>
                    <span className="text-sm text-muted-foreground">{settings.siteVersion || "v1.1"}</span>
                  </div>
                </div>
              )}

              <Button onClick={() => handleSave("branding")} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Enregistrer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hero Section Tab */}
        <TabsContent value="hero">
          <Card>
            <CardHeader>
              <CardTitle>Section Hero</CardTitle>
              <CardDescription>
                Personnalisez le titre et la description principale de la page d'accueil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="heroTitle">Titre Principal</Label>
                <Input
                  id="heroTitle"
                  placeholder="Préparez vos examens avec Imrs-Qcma"
                  value={settings.heroTitle}
                  onChange={(e) => handleChange("heroTitle", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="heroSubtitle">Sous-titre</Label>
                <Input
                  id="heroSubtitle"
                  placeholder="La plateforme #1 pour les étudiants en médecine"
                  value={settings.heroSubtitle}
                  onChange={(e) => handleChange("heroSubtitle", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="heroDescription">Description</Label>
                <Textarea
                  id="heroDescription"
                  placeholder="Accédez à des milliers de QCM..."
                  value={settings.heroDescription}
                  onChange={(e) => handleChange("heroDescription", e.target.value)}
                  rows={3}
                />
              </div>

              <Button onClick={() => handleSave("hero")} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Enregistrer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timer Section Tab */}
        <TabsContent value="timer">
          <Card>
            <CardHeader>
              <CardTitle>Compte à Rebours</CardTitle>
              <CardDescription>
                Configurez un timer pour les offres promotionnelles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Activer le Timer</Label>
                  <p className="text-sm text-muted-foreground">
                    Affiche un compte à rebours sur la page d'accueil
                  </p>
                </div>
                <Switch
                  checked={settings.timerEnabled}
                  onCheckedChange={(checked) => handleChange("timerEnabled", checked)}
                />
              </div>

              {settings.timerEnabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="timerTitle">Titre du Timer</Label>
                    <Input
                      id="timerTitle"
                      placeholder="Offre spéciale se termine dans"
                      value={settings.timerTitle}
                      onChange={(e) => handleChange("timerTitle", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timerEndDate">Date de Fin</Label>
                    <Input
                      id="timerEndDate"
                      type="datetime-local"
                      value={settings.timerEndDate}
                      onChange={(e) => handleChange("timerEndDate", e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="flex gap-2">
                <Button onClick={() => handleSave("timer")} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Enregistrer
                </Button>

                {settings.timerEnabled && (
                  <Button
                    variant="destructive"
                    onClick={handleDeleteTimer}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Supprimer le Timer
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pricing Section Tab */}
        <TabsContent value="pricing">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Section Tarification</CardTitle>
                <CardDescription>
                  Modifiez les titres et les fonctionnalités des plans
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pricingTitle">Titre de la Section</Label>
                    <Input
                      id="pricingTitle"
                      placeholder="Nos Abonnements"
                      value={settings.pricingTitle}
                      onChange={(e) => handleChange("pricingTitle", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pricingSubtitle">Sous-titre</Label>
                    <Input
                      id="pricingSubtitle"
                      placeholder="Choisissez le plan qui vous convient"
                      value={settings.pricingSubtitle}
                      onChange={(e) => handleChange("pricingSubtitle", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Free Plan */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Plan Gratuit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Label>Fonctionnalités</Label>
                {settings.freePlanFeatures.map((feature, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={feature}
                      onChange={(e) => handleFeatureChange("freePlanFeatures", index, e.target.value)}
                      placeholder="Fonctionnalité..."
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleRemoveFeature("freePlanFeatures", index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() => handleAddFeature("freePlanFeatures")}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une fonctionnalité
                </Button>
              </CardContent>
            </Card>

            {/* Premium Monthly */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Premium Mensuel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="premiumMonthlyPrice">Prix (MAD)</Label>
                  <Input
                    id="premiumMonthlyPrice"
                    type="number"
                    value={settings.premiumMonthlyPrice}
                    onChange={(e) => handleChange("premiumMonthlyPrice", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <Label>Fonctionnalités</Label>
                {settings.premiumMonthlyFeatures.map((feature, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={feature}
                      onChange={(e) => handleFeatureChange("premiumMonthlyFeatures", index, e.target.value)}
                      placeholder="Fonctionnalité..."
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleRemoveFeature("premiumMonthlyFeatures", index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() => handleAddFeature("premiumMonthlyFeatures")}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une fonctionnalité
                </Button>
              </CardContent>
            </Card>

            {/* Premium Pro */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Premium Pro</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="premiumAnnualPrice">Prix (MAD)</Label>
                  <Input
                    id="premiumAnnualPrice"
                    type="number"
                    value={settings.premiumAnnualPrice}
                    onChange={(e) => handleChange("premiumAnnualPrice", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <Label>Fonctionnalités</Label>
                {settings.premiumAnnualFeatures.map((feature, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={feature}
                      onChange={(e) => handleFeatureChange("premiumAnnualFeatures", index, e.target.value)}
                      placeholder="Fonctionnalité..."
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleRemoveFeature("premiumAnnualFeatures", index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() => handleAddFeature("premiumAnnualFeatures")}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une fonctionnalité
                </Button>
              </CardContent>
            </Card>

            <Button onClick={() => handleSave("pricing")} disabled={saving} className="w-full">
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Enregistrer la Tarification
            </Button>
          </div>
        </TabsContent>

        {/* FAQ Section Tab */}
        <TabsContent value="faq">
          <Card>
            <CardHeader>
              <CardTitle>Questions Fréquentes</CardTitle>
              <CardDescription>
                Gérez les questions et réponses de la FAQ
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="faqTitle">Titre de la Section</Label>
                <Input
                  id="faqTitle"
                  placeholder="Questions Fréquentes"
                  value={settings.faqTitle}
                  onChange={(e) => handleChange("faqTitle", e.target.value)}
                />
              </div>

              <div className="space-y-4">
                <Label>Questions</Label>
                {settings.faqItems.map((item, index) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Question {index + 1}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFAQ(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <Input
                        placeholder="Question..."
                        value={item.question}
                        onChange={(e) => handleFAQChange(index, "question", e.target.value)}
                      />
                      <Textarea
                        placeholder="Réponse..."
                        value={item.answer}
                        onChange={(e) => handleFAQChange(index, "answer", e.target.value)}
                        rows={2}
                      />
                    </div>
                  </Card>
                ))}
                <Button
                  variant="outline"
                  onClick={handleAddFAQ}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une Question
                </Button>
              </div>

              <Button onClick={() => handleSave("faq")} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Enregistrer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Section Tab */}
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle>Informations de Contact</CardTitle>
              <CardDescription>
                Configurez vos coordonnées et liens sociaux
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="contact@atlas-qcm.online"
                    value={settings.contactEmail}
                    onChange={(e) => handleChange("contactEmail", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Téléphone</Label>
                  <Input
                    id="contactPhone"
                    placeholder="+212 6XX XXX XXX"
                    value={settings.contactPhone}
                    onChange={(e) => handleChange("contactPhone", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsappNumber" className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-green-500" />
                  Numéro WhatsApp
                </Label>
                <Input
                  id="whatsappNumber"
                  placeholder="+212600000000"
                  value={settings.whatsappNumber}
                  onChange={(e) => handleChange("whatsappNumber", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Format: +212XXXXXXXXX (sans espaces)
                </p>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-4">Réseaux Sociaux</h4>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="facebookUrl" className="flex items-center gap-2">
                      <Facebook className="h-4 w-4 text-blue-600" />
                      Facebook
                    </Label>
                    <Input
                      id="facebookUrl"
                      placeholder="https://facebook.com/imrs_qcma"
                      value={settings.facebookUrl}
                      onChange={(e) => handleChange("facebookUrl", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instagramUrl" className="flex items-center gap-2">
                      <Instagram className="h-4 w-4 text-pink-500" />
                      Instagram
                    </Label>
                    <Input
                      id="instagramUrl"
                      placeholder="https://instagram.com/imrs_qcma"
                      value={settings.instagramUrl}
                      onChange={(e) => handleChange("instagramUrl", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="youtubeUrl" className="flex items-center gap-2">
                      <Youtube className="h-4 w-4 text-red-500" />
                      YouTube
                    </Label>
                    <Input
                      id="youtubeUrl"
                      placeholder="https://youtube.com/@imrs_qcma"
                      value={settings.youtubeUrl}
                      onChange={(e) => handleChange("youtubeUrl", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Button onClick={() => handleSave("contact")} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Enregistrer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Promotion Banner Tab */}
        <TabsContent value="promotion">
          <Card>
            <CardHeader>
              <CardTitle>Bannière Promotionnelle</CardTitle>
              <CardDescription>
                Affichez une bannière promotionnelle en haut de la page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Activer la Bannière</Label>
                  <p className="text-sm text-muted-foreground">
                    Affiche une bannière promotionnelle sur toutes les pages
                  </p>
                </div>
                <Switch
                  checked={settings.promotionEnabled}
                  onCheckedChange={(checked) => handleChange("promotionEnabled", checked)}
                />
              </div>

              {settings.promotionEnabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="promotionText">Texte de la Promotion</Label>
                    <Textarea
                      id="promotionText"
                      placeholder="🎉 Offre spéciale: -20% sur tous les abonnements!"
                      value={settings.promotionText}
                      onChange={(e) => handleChange("promotionText", e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="promotionLink">Lien (optionnel)</Label>
                    <Input
                      id="promotionLink"
                      placeholder="https://..."
                      value={settings.promotionLink}
                      onChange={(e) => handleChange("promotionLink", e.target.value)}
                    />
                  </div>
                </>
              )}

              <Button onClick={() => handleSave("promotion")} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Enregistrer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LandingPageAdmin;
