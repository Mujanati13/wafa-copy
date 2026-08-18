import { X, Sparkles, Users, Plus, Bot, User, Send, AlertCircle, Upload, FileImage, FileText, Loader2, TriangleAlert, Check } from "lucide-react";
import React, { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { api } from "@/lib/utils";

const MAX_EXPLANATIONS = 3;
const MAX_IMAGES = 5;
const MAX_PDF = 1;

const ExplicationModel = ({ question, setShowExplanation, userPlan = "Free" }) => {
  const [activeTab, setActiveTab] = useState("ai"); // 'ai' or 'user'
  const [activeExplanationIndex, setActiveExplanationIndex] = useState(0);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [submissionText, setSubmissionText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]); // Max 5 images
  const [uploadedPdf, setUploadedPdf] = useState(null); // Max 1 PDF
  const imageInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  
  // State for fetched user explanations
  const [fetchedExplanations, setFetchedExplanations] = useState([]);
  const [loadingExplanations, setLoadingExplanations] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [currentUserSubmission, setCurrentUserSubmission] = useState(null); // Track current user's own submission
  
  // State for AI generation
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiExplanationData, setAiExplanationData] = useState(null);
  const [isDeletingAI, setIsDeletingAI] = useState(false);

  // Check access levels - AI explanations only for PREMIUM PRO
  const hasPremiumAccess = userPlan === "PREMIUM" || userPlan === "PREMIUM PRO" || userPlan === "Premium" || userPlan === "Premium Annuel";
  const hasPremiumProAccess = userPlan === "PREMIUM PRO" || userPlan === "Premium Annuel";

  // If user doesn't have premium access, default to user tab
  useEffect(() => {
    if (!hasPremiumAccess && activeTab === "ai") {
      setActiveTab("user");
    }
  }, [hasPremiumAccess, activeTab]);

  // Fetch user explanations from API
  useEffect(() => {
    const fetchUserExplanations = async () => {
      if (!question?._id) return;
      
      setLoadingExplanations(true);
      try {
        const response = await api.get(`/explanations/question/${question._id}`);
        const explanations = response.data?.data || [];
        
        // Filter AI explanation separately
        const aiExplanation = explanations.find(e => e.isAiGenerated && e.status === 'approved');
        if (aiExplanation) {
          setAiExplanationData(aiExplanation);
        }
        
        // Detect if the current user already has a user (non-AI) submission
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        const currentUserId = storedUser._id || storedUser.id;
        if (currentUserId) {
          const mySubmission = explanations.find(
            e => !e.isAiGenerated && (e.userId?._id === currentUserId || e.userId?.id === currentUserId || e.userId === currentUserId)
          );
          if (mySubmission) setCurrentUserSubmission(mySubmission);
        }

        // Filter to only approved user explanations and map to proper format
        const approvedExplanations = explanations
          .filter(e => e.status === 'approved' && !e.isAiGenerated)
          .map(e => ({
            id: e._id,
            text: e.contentText || "",
            author: e.userId?.name || e.userId?.email || "Étudiant anonyme",
            verified: true,
            images: e.imageUrls || (e.imageUrl ? [e.imageUrl] : []),
            pdfUrl: e.pdfUrl,
            title: e.title
          }));
        setFetchedExplanations(approvedExplanations);
      } catch (error) {
        console.error("Error fetching explanations:", error);
      } finally {
        setLoadingExplanations(false);
      }
    };
    
    fetchUserExplanations();
  }, [question?._id]);

  // Combine fetched explanations with any from question prop
  const userExplanations = useMemo(() => {
    const propExplanations = question?.userExplanations || [];
    // Merge and deduplicate
    const allExplanations = [...fetchedExplanations];
    propExplanations.forEach(e => {
      if (!allExplanations.find(fe => fe.id === e.id)) {
        allExplanations.push(e);
      }
    });
    return allExplanations.slice(0, MAX_EXPLANATIONS);
  }, [question?.userExplanations, fetchedExplanations]);

  // Check if user can add more explanations
  const canAddExplanation = userExplanations.length < MAX_EXPLANATIONS;
  const remainingSlots = MAX_EXPLANATIONS - userExplanations.length;

  // AI explanation (always slot 0)
  const aiExplanation = {
    text: aiExplanationData?.contentText || question?.explanation || null,
    images: (() => {
      const images = Array.isArray(question?.explanationImages)
        ? question.explanationImages
        : [];
      if (!images.length && question?.explanationImage) {
        images.push(question.explanationImage);
      }
      return images;
    })(),
    title: question?.explicationTitle || "Explication IA"
  };

  const hasAIExplanation = aiExplanation.text || aiExplanation.images.length > 0;
  
  // Function to generate AI explanation with Gemini
  const handleGenerateAIExplanation = async () => {
    if (!question?._id) {
      toast.error("ID de question invalide");
      return;
    }

    setIsGeneratingAI(true);
    try {
      // Backend will automatically fetch module ID from the question's exam
      // No need to get module ID on frontend
      const response = await api.post('/explanations/generate-gemini', {
        questionId: question._id,
        language: 'fr',
        useModuleConfig: true // Signal to backend to use module config
      });

      if (response.data?.success && response.data?.data) {
        setAiExplanationData(response.data.data);
        const usedModuleConfig = response.data.debug?.usedModulePrompt || response.data.debug?.usedModuleContext;
        toast.success("Explication IA générée avec succès !", {
          description: usedModuleConfig
            ? "Générée avec la configuration du module" 
            : "L'explication a été sauvegardée pour cette question.",
          duration: 4000
        });
      }
    } catch (error) {
      console.error("Error generating AI explanation:", error);
      
      const errorMessage = error.response?.data?.message;
      const errorData = error.response?.data;
      
      // Check for rate limit error (429 or quota exceeded)
      if (error.response?.status === 429 || errorMessage?.includes("quota") || errorMessage?.includes("rate") || errorMessage?.includes("limit") || errorMessage?.includes("too many")) {
        toast.error("Limite de génération atteinte", {
          description: "Vous avez atteint la limite de génération d'explications IA pour le moment. Veuillez réessayer dans quelques heures.",
          duration: 8000,
          icon: <AlertCircle className="h-5 w-5" />
        });
      } else if (errorMessage?.includes("existe déjà")) {
        toast.info("Explication IA déjà disponible", {
          description: "Une explication existe déjà pour cette question."
        });
        // Try to fetch the existing one
        try {
          const existingResponse = await api.get(`/explanations/question/${question._id}`);
          const aiExplanation = existingResponse.data?.data?.find(e => e.isAiGenerated);
          if (aiExplanation) {
            setAiExplanationData(aiExplanation);
          }
        } catch (fetchError) {
          console.error("Error fetching existing AI explanation:", fetchError);
        }
      } else {
        toast.error("Erreur lors de la génération", {
          description: errorMessage || "Impossible de générer l'explication IA. Veuillez réessayer plus tard.",
          duration: 5000
        });
      }
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Function to delete AI explanation and regenerate
  const handleDeleteAndRegenerateAI = async () => {
    if (!aiExplanationData?._id) {
      toast.error("Aucune explication IA à supprimer");
      return;
    }

    const confirmDelete = window.confirm(
      "Cette explication semble mal formatée. Voulez-vous la supprimer et en générer une nouvelle avec le prompt par défaut amélioré ?"
    );
    
    if (!confirmDelete) return;

    setIsDeletingAI(true);
    try {
      // Delete the old AI explanation
      await api.delete(`/explanations/${aiExplanationData._id}`);
      
      // Clear the AI explanation data
      setAiExplanationData(null);
      
      toast.success("Ancienne explication supprimée", {
        description: "Génération d'une nouvelle explication en cours..."
      });
      
      // Generate new explanation WITHOUT module config (use default prompt)
      const response = await api.post('/explanations/generate-gemini', {
        questionId: question._id,
        language: 'fr',
        useModuleConfig: false // Use default prompt instead of module prompt
      });

      if (response.data?.success && response.data?.data) {
        setAiExplanationData(response.data.data);
        toast.success("Nouvelle explication générée avec succès !", {
          description: "Utilisé le prompt par défaut amélioré",
          duration: 4000
        });
      }
    } catch (error) {
      console.error("Error deleting/regenerating AI explanation:", error);
      const errorMessage = error.response?.data?.message;
      toast.error("Erreur lors de la régénération", {
        description: errorMessage || "Impossible de regénérer l'explication."
      });
    } finally {
      setIsDeletingAI(false);
    }
  };

  const handleSubmitClick = () => {
    // At least one content type required: text, images, or PDF
    const hasText = submissionText.trim().length > 0;
    const hasImages = uploadedImages.length > 0;
    const hasPdf = uploadedPdf !== null;
    
    if (!hasText && !hasImages && !hasPdf) {
      toast.warning("Veuillez ajouter du texte, des images ou un PDF");
      return;
    }

    setShowWarning(true);
  };

  const handleSubmitExplanation = async () => {
    setShowWarning(false);
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('contentText', submissionText);
      formData.append('questionId', question._id);

      // Add images (max 5)
      console.log("Uploading images count:", uploadedImages.length);
      uploadedImages.forEach((img, idx) => {
        console.log(`Adding image ${idx + 1}:`, img.name, img.size, img.type);
        formData.append('images', img);
      });

      // Add PDF (max 1)
      if (uploadedPdf) {
        console.log("Adding PDF:", uploadedPdf.name);
        formData.append('pdf', uploadedPdf);
      }

      // Log FormData entries for debugging
      console.log("FormData entries:");
      for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: File(${value.name}, ${value.size} bytes)`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      }

      // Note: Don't set Content-Type for FormData - axios will set it automatically with boundary
      const response = await api.post('/explanations/create', formData);
      console.log("Upload response:", response.data);

      toast.success("Votre explication a été soumise pour révision !", {
        description: "Elle sera publiée après validation par notre équipe. Vous gagnerez 1 point bleu si approuvée!"
      });
      setSubmissionText("");
      setUploadedImages([]);
      setUploadedPdf(null);
      setShowSubmitForm(false);
    } catch (error) {
      console.error("Error submitting explanation:", error);
      
      // Handle specific error cases
      const errorMessage = error.response?.data?.message;
      let userFriendlyMessage = "Erreur lors de la soumission";
      let description = "";

      if (errorMessage?.includes("déjà soumis")) {
        userFriendlyMessage = "Explication déjà soumise";
        description = "Vous avez déjà proposé une explication pour cette question. Une personne ne peut soumettre qu'une seule explication par question.";
      } else if (errorMessage?.includes("maximum") || errorMessage?.includes("limité")) {
        userFriendlyMessage = "Limite atteinte";
        description = errorMessage;
      } else if (errorMessage?.includes("authentif")) {
        userFriendlyMessage = "Session expirée";
        description = "Veuillez vous reconnecter pour soumettre une explication.";
      } else if (errorMessage) {
        description = errorMessage;
      } else {
        description = "Veuillez vérifier votre connexion et réessayer.";
      }

      toast.error(userFriendlyMessage, {
        description: description,
        duration: 5000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const validImages = files.filter(file => file.type.startsWith('image/'));

    if (validImages.length === 0) {
      toast.error("Seuls les fichiers image sont acceptés");
      return;
    }

    const remainingSlots = MAX_IMAGES - uploadedImages.length;
    if (remainingSlots <= 0) {
      toast.error(`Maximum ${MAX_IMAGES} images autorisées`);
      return;
    }

    const toAdd = validImages.slice(0, remainingSlots);

    // Check file sizes (max 5MB each)
    for (const file of toAdd) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} dépasse 5 Mo`);
        return;
      }
    }

    setUploadedImages(prev => [...prev, ...toAdd]);
    toast.success(`${toAdd.length} image(s) ajoutée(s)`);
    e.target.value = ''; // Reset input
  };

  const handlePdfUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (!validTypes.includes(file.type)) {
      toast.error("Acceptés: PDF, PPTX, DOC, DOCX");
      return;
    }

    setUploadedPdf(file);
    toast.success(`Fichier ajouté: ${file.name}`);
    e.target.value = ''; // Reset input
  };

  const removeImage = (index) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const currentUserExplanation = userExplanations[activeExplanationIndex];

  // Calculate correct answers count
  const correctAnswersCount = question?.options?.filter(opt => opt.isCorrect).length || 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" aria-label="Explications de la question" className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl sm:max-h-[85vh] sm:rounded-3xl relative flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-primary px-5 py-4 text-primary-foreground">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-cyan-200" />
            <h3 className="text-lg font-semibold">
              Explications
            </h3>
            <Badge variant="outline" className="ml-2 border-white/25 bg-white/10 text-white">
              {(hasAIExplanation ? 1 : 0) + userExplanations.length} / {MAX_EXPLANATIONS + 1}
            </Badge>
          </div>
          <button
            onClick={() => setShowExplanation(false)}
            className="imrs-focus-ring rounded-full p-2 text-white/75 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Main Tabs */}
        <div className="flex overflow-x-auto border-b border-border bg-muted/50">
          <button
            onClick={() => hasPremiumProAccess && setActiveTab("ai")}
            disabled={!hasPremiumProAccess}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-all relative ${activeTab === "ai"
              ? "border-b-2 border-primary text-primary bg-card"
              : "text-muted-foreground hover:bg-muted"
              } ${!hasPremiumProAccess ? "opacity-50 cursor-not-allowed" : ""}`}
            title={!hasPremiumProAccess ? "Explication IA disponible uniquement pour Premium Pro" : ""}
          >
            <Bot className="h-4 w-4" />
            Explication IA
            {!hasPremiumProAccess && (
              <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5">
                Pro
              </Badge>
            )}
            {hasAIExplanation && hasPremiumProAccess && (
              <span className="w-2 h-2 rounded-full bg-green-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("user")}
            disabled={!hasPremiumAccess}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-all ${activeTab === "user"
              ? "border-b-2 border-primary text-primary bg-card"
              : "text-muted-foreground hover:bg-muted"
              } ${!hasPremiumAccess ? "opacity-50 cursor-not-allowed" : ""}`}
            title={!hasPremiumAccess ? "Explications disponibles à partir de Premium" : ""}
          >
            <Users className="h-4 w-4" />
            Explications Communauté
            {!hasPremiumAccess && (
              <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5">
                Premium
              </Badge>
            )}
            {userExplanations.length > 0 && hasPremiumAccess && (
              <Badge variant="secondary" className="ml-1 bg-purple-100 text-purple-700">
                {userExplanations.length}
              </Badge>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {/* Show upgrade prompt for GRATUIT users */}
          {!hasPremiumAccess ? (
            <div className="flex items-center justify-center h-full py-12">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-10 w-10 text-blue-600" />
                </div>
                <h4 className="text-xl font-bold text-foreground mb-2">
                  Explications Premium
                </h4>
                <p className="text-muted-foreground mb-6">
                  Les explications d\u00e9taill\u00e9es sont disponibles \u00e0 partir du plan <strong>Premium</strong>.
                  <br />
                  Passez \u00e0 Premium pour acc\u00e9der aux explications des \u00e9tudiants et \u00e0 Premium Pro pour l'IA.
                </p>
                <Button
                  onClick={() => {
                    setShowExplanation(false);
                    window.location.href = '/dashboard/subscription';
                  }}
                  className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  <Sparkles className="h-4 w-4" />
                  Mettre \u00e0 niveau
                </Button>
              </div>
            </div>
          ) : activeTab === "ai" ? (
            // AI Explanation Tab
            <div className="space-y-4">
              {hasAIExplanation ? (
                <>
                  {/* AI Text */}
                  {aiExplanation.text && (
                    <div className="border border-blue-500/30 rounded-lg bg-blue-500/5 p-4 space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-semibold text-blue-700">Généré par IA</span>
                      </div>
                      <div className="prose prose-sm prose-slate max-w-none">
                        <div 
                          className="text-foreground text-sm leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: aiExplanation.text
                              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                              .replace(/\*(.*?)\*/g, '<em>$1</em>')
                              .replace(/^### (.*$)/gim, '<h3 class="text-base font-bold mt-3 mb-2">$1</h3>')
                              .replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold mt-4 mb-2">$1</h2>')
                              .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold mt-4 mb-3">$1</h1>')
                              .replace(/^\* (.*$)/gim, '<li class="ml-4">$1</li>')
                              .replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>')
                              .replace(/^(\d+)\. (.*$)/gim, '<li class="ml-4" style="list-style-type: decimal;">$2</li>')
                              .replace(/\n\n/g, '</p><p class="mt-2">')
                              .replace(/^(?!<[h|l|p])/gim, '<p>')
                              .replace(/(?<![>])$/gim, '</p>')
                              .replace(/<\/li>\n<li/g, '</li><li')
                              .replace(/(<li.*<\/li>)/s, '<ul class="list-disc space-y-1 my-2">$1</ul>')
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* AI Images */}
                  {aiExplanation.images.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-foreground">Il doit etre comme ça :</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {aiExplanation.images.map((src, idx) => {
                          let fullImgUrl = src;
                          if (!src.startsWith('http')) {
                            const baseUrl = import.meta.env.VITE_BASED_URL?.replace('/api/v1', '') || window.location.origin;
                            // Try multiple path formats
                            if (src.startsWith('/uploads/')) {
                              fullImgUrl = `${baseUrl}${src}`;
                            } else if (src.includes('/uploads/')) {
                              // Extract uploads path from middle of string
                              const uploadsIndex = src.indexOf('/uploads/');
                              fullImgUrl = `${baseUrl}${src.substring(uploadsIndex)}`;
                            } else {
                              // Assume it's just filename or relative path
                              fullImgUrl = `${baseUrl}/uploads${src.startsWith('/') ? src : `/${src}`}`;
                            }
                            console.log(`[AI Image ${idx}] Raw: "${src}" -> URL: "${fullImgUrl}" (Base: "${baseUrl}")`);
                          } else {
                            console.log(`[AI Image ${idx}] Already HTTP: "${fullImgUrl}"`);
                          }
                          return (
                          <button
                            key={`${src}-${idx}`}
                            type="button"
                            className="group relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-muted/30 hover:border-blue-400 transition-all shadow-sm hover:shadow-md"
                            onClick={() => window.open(fullImgUrl, "_blank", "noopener,noreferrer")}
                            title="Lors de la click d'image : agrandir"
                          >
                            <img
                              src={fullImgUrl}
                              alt={`explication ${idx + 1}`}
                              className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
                              loading="lazy"
                              onError={(e) => {
                                console.error(`Failed to load AI explanation image: ${fullImgUrl}`);
                                e.target.style.backgroundColor = '#f3f4f6';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                          </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-gray-500 italic">💡 Lors de la click d'image : ouvrir en plein écran</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Bot className="h-8 w-8 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-medium text-foreground mb-2">
                    Pas d'explication IA disponible
                  </h4>
                  <p className="text-muted-foreground text-sm mb-4">
                    Cliquez sur le bouton ci-dessous pour générer une explication<br />
                    avec l'intelligence artificielle Gemini.
                  </p>
                  <Button
                    onClick={handleGenerateAIExplanation}
                    disabled={isGeneratingAI}
                    className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    {isGeneratingAI ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Génération en cours...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Générer avec Gemini AI
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            // User Explanations Tab
            <div className="space-y-4">
              {/* User Explanation Pills */}
              {userExplanations.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {userExplanations.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveExplanationIndex(idx)}
                      className={`px-4 py-1.5 rounded-full font-medium transition-all ${activeExplanationIndex === idx
                        ? "bg-purple-100 text-purple-700 border-2 border-purple-300"
                        : "bg-muted text-muted-foreground border border-border hover:bg-muted/80"
                        }`}
                    >
                      <User className="inline h-3 w-3 mr-1" />
                      Explication {idx + 1}
                    </button>
                  ))}

                  {/* Add button if slots available and user hasn't already submitted */}
                  {canAddExplanation && !currentUserSubmission && (
                    <button
                      onClick={() => setShowSubmitForm(true)}
                      className="px-4 py-1.5 rounded-full bg-green-50 text-green-700 font-medium border border-green-200 hover:bg-green-100 transition-all flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Ajouter ({remainingSlots} restant{remainingSlots > 1 ? 's' : ''})
                    </button>
                  )}
                  {currentUserSubmission && (
                    <span className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                      currentUserSubmission.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                      currentUserSubmission.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                      'bg-green-50 text-green-700 border-green-200'
                    }`}>
                      {currentUserSubmission.status === 'pending' ? '⏳ Votre explication est en attente de validation' :
                       currentUserSubmission.status === 'rejected' ? '❌ Votre explication a été rejetée' :
                       '✅ Votre explication a été approuvée'}
                    </span>
                  )}
                </div>
              )}

              {/* Correct Answers Count */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  Réponses correctes : {correctAnswersCount}
                </span>
              </div>

              {/* Loading state */}
              {loadingExplanations && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                  <span className="ml-2 text-gray-600">Chargement des explications...</span>
                </div>
              )}

              {/* Current User Explanation */}
              {!loadingExplanations && currentUserExplanation ? (
                <div className="border border-purple-200 rounded-lg bg-gradient-to-br from-purple-50/30 to-white p-5 space-y-4">
                  {/* Author Info */}
                  <div className="flex items-center gap-2 pb-3 border-b">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm">
                        {currentUserExplanation.author?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {currentUserExplanation.author || 'Utilisateur'}
                        </p>
                        {currentUserExplanation.verified && (
                          <Badge variant="outline" className="mt-0.5 text-xs border-green-500 text-green-700 bg-green-50">
                            <Check className="h-3 w-3 mr-1" />
                            Vérifié
                          </Badge>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {currentUserExplanation.createdAt 
                        ? new Date(currentUserExplanation.createdAt).toLocaleDateString('fr-FR')
                        : ''}
                    </span>
                  </div>

                  {/* Explanation Text */}
                  {currentUserExplanation.text && (
                    <div className="prose prose-sm max-w-none">
                      <p className="text-foreground text-sm leading-relaxed whitespace-pre-line">
                        {currentUserExplanation.text}
                      </p>
                    </div>
                  )}
                  
                  {/* Display images if any */}
                  {currentUserExplanation.images?.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-foreground">Il doit etre comme ça :</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {currentUserExplanation.images.map((imgUrl, idx) => {
                          let fullImgUrl = imgUrl;
                          if (!imgUrl.startsWith('http')) {
                            const baseUrl = import.meta.env.VITE_BASED_URL?.replace('/api/v1', '') || window.location.origin;
                            // Try multiple path formats
                            if (imgUrl.startsWith('/uploads/')) {
                              fullImgUrl = `${baseUrl}${imgUrl}`;
                            } else if (imgUrl.includes('/uploads/')) {
                              // Extract uploads path from middle of string
                              const uploadsIndex = imgUrl.indexOf('/uploads/');
                              fullImgUrl = `${baseUrl}${imgUrl.substring(uploadsIndex)}`;
                            } else {
                              // Assume it's just filename or relative path
                              fullImgUrl = `${baseUrl}/uploads${imgUrl.startsWith('/') ? imgUrl : `/${imgUrl}`}`;
                            }
                            console.log(`[User Image ${idx}] Raw: "${imgUrl}" -> URL: "${fullImgUrl}" (Base: "${baseUrl}")`);
                          } else {
                            console.log(`[User Image ${idx}] Already HTTP: "${fullImgUrl}"`);
                          }
                          return (
                          <button
                            key={idx}
                            type="button"
                            className="group relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-muted/30 hover:border-purple-400 transition-all shadow-sm hover:shadow-md"
                            onClick={() => window.open(fullImgUrl, "_blank", "noopener,noreferrer")}
                            title="Lors de la click d'image : agrandir"
                          >
                            <img
                              src={fullImgUrl}
                              alt={`Image ${idx + 1}`}
                              className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
                              loading="lazy"
                              onError={(e) => {
                                console.error(`Failed to load user explanation image: ${fullImgUrl}`);
                                e.target.style.backgroundColor = '#f3f4f6';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                          </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-gray-500 italic">💡 Lors de la click d'image : ouvrir en plein écran</p>
                    </div>
                  )}
                  
                  {/* Display PDF if any */}
                  {currentUserExplanation.pdfUrl && (
                    <a
                      href={(() => {
                        const pdfUrl = currentUserExplanation.pdfUrl;
                        if (pdfUrl.startsWith('http')) return pdfUrl;
                        const baseUrl = import.meta.env.VITE_BASED_URL?.replace('/api/v1', '') || 'http://localhost:5010';
                        return pdfUrl.startsWith('/uploads/') ? `${baseUrl}${pdfUrl}` : `${baseUrl}/uploads${pdfUrl.startsWith('/') ? pdfUrl : `/${pdfUrl}`}`;
                      })()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-sm"
                    >
                      <FileText className="h-4 w-4" />
                      Voir le PDF
                    </a>
                  )}
                </div>
              ) : !loadingExplanations && userExplanations.length === 0 ? (
                // Empty state - encourage submission
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-purple-400" />
                  </div>
                  <h4 className="text-lg font-medium text-foreground mb-2">
                    Aucune explication de la communauté
                  </h4>
                  <p className="text-muted-foreground text-sm mb-4">
                    Soyez le premier à partager votre compréhension !
                  </p>
                  {currentUserSubmission ? (
                    <span className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                      currentUserSubmission.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                      currentUserSubmission.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                      'bg-green-50 text-green-700 border-green-200'
                    }`}>
                      {currentUserSubmission.status === 'pending' ? '⏳ Votre explication est en attente de validation' :
                       currentUserSubmission.status === 'rejected' ? '❌ Votre explication a été rejetée' :
                       '✅ Votre explication a été approuvée'}
                    </span>
                  ) : (
                    <Button
                      onClick={() => setShowSubmitForm(true)}
                      className="gap-2 bg-purple-600 hover:bg-purple-700"
                    >
                      <Plus className="h-4 w-4" />
                      Proposer une explication
                    </Button>
                  )}
                </div>
              ) : null}

              {/* Submit Form */}
              {showSubmitForm && (
                <div className="border-2 border-dashed border-purple-300 rounded-lg p-4 bg-purple-50/50">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-700">
                      Proposer une explication (texte, images ou PDF - au moins un requis)
                    </span>
                  </div>
                  <Textarea
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    placeholder="Votre explication (optionnel). Vous pouvez aussi ajouter des images ou un PDF."
                    className="min-h-[120px] mb-3"
                  />

                  {/* File Upload Section */}
                  <div className="mb-3 space-y-3">
                    {/* Hidden file inputs */}
                    <input
                      type="file"
                      ref={imageInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      multiple
                      className="hidden"
                    />
                    <input
                      type="file"
                      ref={pdfInputRef}
                      onChange={handlePdfUpload}
                      accept=".pdf,.pptx,.ppt,.doc,.docx"
                      className="hidden"
                    />

                    {/* Images Section */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-600">
                          Images ({uploadedImages.length}/{MAX_IMAGES})
                        </span>
                        {uploadedImages.length < MAX_IMAGES && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => imageInputRef.current?.click()}
                            className="gap-1 h-7 text-xs border-purple-200 text-purple-700 hover:bg-purple-50"
                          >
                            <FileImage className="h-3 w-3" />
                            Ajouter
                          </Button>
                        )}
                      </div>
                      {uploadedImages.length > 0 && (
                        <div className="grid grid-cols-5 gap-2">
                          {uploadedImages.map((img, idx) => (
                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-purple-200 bg-white dark:bg-slate-900">
                              <img
                                src={URL.createObjectURL(img)}
                                alt={`Upload ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => removeImage(idx)}
                                className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* PDF Section */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-600">
                          Document ({uploadedPdf ? 1 : 0}/{MAX_PDF})
                        </span>
                        {!uploadedPdf && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => pdfInputRef.current?.click()}
                            className="gap-1 h-7 text-xs border-purple-200 text-purple-700 hover:bg-purple-50"
                          >
                            <FileText className="h-3 w-3" />
                            Ajouter Fichier
                          </Button>
                        )}
                      </div>
                      {uploadedPdf && (
                        <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-purple-200">
                          <FileText className="h-5 w-5 text-purple-600" />
                          <span className="flex-1 text-sm text-foreground truncate">{uploadedPdf.name}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setUploadedPdf(null)}
                            className="text-red-500 hover:text-red-600 h-7 w-7 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowSubmitForm(false);
                        setUploadedImages([]);
                        setUploadedPdf(null);
                      }}
                    >
                      Annuler
                    </Button>
                    <Button
                      onClick={handleSubmitClick}
                      disabled={isSubmitting || (!submissionText.trim() && uploadedImages.length === 0 && !uploadedPdf)}
                      className="gap-2 bg-purple-600 hover:bg-purple-700"
                    >
                      <Send className="h-4 w-4" />
                      {isSubmitting ? "Envoi..." : "Soumettre"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Correct Answers Footer */}
        {question?.options && (
          <div className="border-t border-border bg-muted/40 p-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-muted-foreground">Réponses correctes:</span>
              <div className="flex gap-1">
                {question.options.map((opt, idx) =>
                  opt.isCorrect && (
                    <Badge key={idx} className="bg-emerald-100 text-emerald-700">
                      {String.fromCharCode(65 + idx)}
                    </Badge>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* Warning Confirmation Dialog */}
        {showWarning && (
          <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
            <div
              className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl max-w-sm w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Red Header */}
              <div className="bg-red-500 px-6 py-6 relative">
                <button
                  onClick={() => setShowWarning(false)}
                  className="absolute top-3 right-3 text-white/80 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="flex flex-col items-center text-white">
                  <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center mb-3">
                    <TriangleAlert className="h-10 w-10 text-red-500" />
                  </div>
                  <h3 className="text-2xl font-bold">WARNING!</h3>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-5 text-center">
                <p className="text-foreground font-medium mb-3">
                  Aucun contenu (text, image, pdf ...)
                </p>
                <p className="text-muted-foreground text-sm mb-4">
                  - illégal qui est n'est pas bien (pornographique ...) ou les chose qui est hors sujet, n'est autorisé.
                </p>
                <p className="text-red-600 font-semibold text-sm">
                  Le non-respect de cette règle entraînera la suppression définitive de votre compte.
                </p>
              </div>

              {/* Buttons */}
              <div className="px-6 pb-6 flex gap-3">
                <button
                  onClick={handleSubmitExplanation}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 disabled:bg-gray-300 transition-colors"
                >
                  {isSubmitting ? "Envoi..." : "ok"}
                </button>
                <button
                  onClick={() => setShowWarning(false)}
                  className="flex-1 py-2.5 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExplicationModel;
