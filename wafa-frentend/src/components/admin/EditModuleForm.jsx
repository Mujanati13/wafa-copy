import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import { Palette, X, Check, BookOpen, Loader2, Image, FileText, CircleDot, HelpCircle, Upload, File } from "lucide-react";
import { toast } from "sonner";

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { api } from "@/lib/utils";
import { moduleService } from "@/services/moduleService";

const API_URL = import.meta.env.VITE_API_URL || "";

// Simple color choices
const SIMPLE_COLORS = [
  { color: "#3b82f6", name: "Bleu" },
  { color: "#8b5cf6", name: "Violet" },
  { color: "#ec4899", name: "Rose" },
  { color: "#ef4444", name: "Rouge" },
  { color: "#f97316", name: "Orange" },
  { color: "#22c55e", name: "Vert" },
  { color: "#06b6d4", name: "Cyan" },
  { color: "#6b7280", name: "Gris" },
];

// Simple gradient choices
const SIMPLE_GRADIENTS = [
  { name: "Océan", from: "#0ea5e9", to: "#3b82f6", direction: "to-br" },
  { name: "Coucher", from: "#f97316", to: "#ec4899", direction: "to-br" },
  { name: "Forêt", from: "#22c55e", to: "#14b8a6", direction: "to-br" },
  { name: "Violet", from: "#8b5cf6", to: "#ec4899", direction: "to-br" },
  { name: "Feu", from: "#ef4444", to: "#f97316", direction: "to-br" },
  { name: "Menthe", from: "#10b981", to: "#06b6d4", direction: "to-br" },
];

// Difficulty levels
const DIFFICULTY_LEVELS = [
  { value: "QE", label: "QE", bgColor: "bg-orange-100", textColor: "text-orange-700", borderColor: "border-orange-300" },
  { value: "easy", label: "easy", bgColor: "bg-lime-100", textColor: "text-lime-700", borderColor: "border-lime-300" },
  { value: "medium", label: "medium", bgColor: "bg-teal-100", textColor: "text-teal-700", borderColor: "border-teal-300" },
  { value: "hard", label: "hard", bgColor: "bg-red-100", textColor: "text-red-700", borderColor: "border-red-300" },
];

const EditModuleForm = ({ module, setShowEditForm, onModuleUpdated }) => {
  const { t } = useTranslation(["admin"]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedColor, setSelectedColor] = useState(module?.color || "#6366f1");
  const [gradientColor, setGradientColor] = useState(module?.gradientColor || "");
  const [gradientDirection, setGradientDirection] = useState(module?.gradientDirection || "to-br");
  const [useGradient, setUseGradient] = useState(!!module?.gradientColor);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [difficulty, setDifficulty] = useState(module?.difficulty || "QE");
  const [selectedSemester, setSelectedSemester] = useState(module?.semester || "");
  const [availableInAllSemesters, setAvailableInAllSemesters] = useState(module?.availableInAllSemesters || false);
  
  // File states
  const [moduleImageFile, setModuleImageFile] = useState(null);
  const [moduleImagePreview, setModuleImagePreview] = useState(null);
  const [helpImageFile, setHelpImageFile] = useState(null);
  const [helpImagePreview, setHelpImagePreview] = useState(null);
  const [helpPdfFile, setHelpPdfFile] = useState(null);

  const editModuleSchema = z.object({
    name: z.string().min(2, t("admin:module_name_required")),
    infoText: z.string().optional(),
    helpContent: z.string().optional(),
    textContent: z.string().optional(),
  });

  const form = useForm({
    resolver: zodResolver(editModuleSchema),
    defaultValues: {
      name: "",
      infoText: "",
      helpContent: "",
      textContent: "",
    },
  });

  // Initialize form when module changes
  useEffect(() => {
    if (module) {
      console.log("EditModuleForm - Initializing with module:", module);
      console.log("EditModuleForm - Module semester:", module.semester);
      
      form.reset({
        name: module.name || "",
        infoText: module.infoText || "",
        helpContent: module.helpContent || "",
        textContent: module.textContent || "",
      });
      setSelectedColor(module.color || "#6366f1");
      setGradientColor(module.gradientColor || "");
      setGradientDirection(module.gradientDirection || "to-br");
      setUseGradient(!!module.gradientColor);
      setDifficulty(module.difficulty || "QE");
      setSelectedSemester(module.semester || "");
      setAvailableInAllSemesters(module.availableInAllSemesters || false);
      
      // Set existing image/pdf previews
      if (module.imageUrl) {
        const fullUrl = module.imageUrl.startsWith("http") ? module.imageUrl : `${API_URL?.replace('/api/v1', '')}${module.imageUrl}`;
        setModuleImagePreview(fullUrl);
      }
      if (module.helpImage) {
        const fullUrl = module.helpImage.startsWith("http") ? module.helpImage : `${API_URL?.replace('/api/v1', '')}${module.helpImage}`;
        setHelpImagePreview(fullUrl);
      }
    }
  }, [module, form]);

  const handleModuleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setModuleImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setModuleImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleHelpImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setHelpImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setHelpImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleHelpPdfChange = (e) => {
    const file = e.target.files[0];
    if (file) setHelpPdfFile(file);
  };

  const onSubmit = async (data) => {
    if (!availableInAllSemesters && !selectedSemester) {
      toast.error("Veuillez sélectionner un semestre ou cocher 'Disponible pour tous les semestres'");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("semester", availableInAllSemesters ? "" : selectedSemester);
      formData.append("availableInAllSemesters", availableInAllSemesters);
      formData.append("difficulty", difficulty);
      formData.append("color", selectedColor);
      formData.append("gradientColor", useGradient ? gradientColor : "");
      formData.append("gradientDirection", gradientDirection);
      formData.append("contentType", data.textContent ? "text" : "url");
      
      if (data.infoText !== undefined) formData.append("infoText", data.infoText || "");
      if (data.helpContent !== undefined) formData.append("helpContent", data.helpContent || "");
      if (data.textContent !== undefined) formData.append("textContent", data.textContent || "");
      
      // Handle files - send new files OR preserve existing paths
      if (moduleImageFile) {
        formData.append("moduleImage", moduleImageFile);
      } else if (module.rawImageUrl || module.imageUrl) {
        // Preserve existing image path
        const existingPath = module.rawImageUrl || (module.imageUrl?.startsWith('/uploads') ? module.imageUrl : null);
        if (existingPath) formData.append("existingImageUrl", existingPath);
      }
      
      if (helpImageFile) {
        formData.append("helpImage", helpImageFile);
      } else if (module.helpImage) {
        formData.append("existingHelpImage", module.helpImage);
      }
      
      if (helpPdfFile) {
        formData.append("helpPdf", helpPdfFile);
      } else if (module.helpPdf) {
        formData.append("existingHelpPdf", module.helpPdf);
      }

      const response = await api.put(`/modules/update-with-image/${module.id || module._id}`, formData);
      const savedModule = response.data?.data;
      const expectedGradientColor = useGradient ? gradientColor : "";
      if (
        String(savedModule?.color || "").toLowerCase() !== selectedColor.toLowerCase()
        || String(savedModule?.gradientColor || "").toLowerCase() !== expectedGradientColor.toLowerCase()
        || String(savedModule?.gradientDirection || "") !== gradientDirection
      ) {
        throw new Error("Le module a été modifié, mais ses paramètres d'apparence n'ont pas été enregistrés correctement.");
      }
      moduleService.clearCache();

      setShowEditForm(false);
      toast.success(t("admin:module_updated_success"));
      if (onModuleUpdated) onModuleUpdated();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || e.message || t("admin:failed_update_module"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[99999] overflow-y-auto">
      <div className="w-full max-w-3xl bg-card text-card-foreground rounded-xl shadow-2xl border border-border flex flex-col max-h-[90vh] my-8">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 rounded-t-xl flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{t("admin:edit_module")}</h1>
              <p className="text-sm text-green-100">{t("admin:update_module_subtitle")}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hover:bg-white/20 text-white"
            onClick={() => setShowEditForm(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Informations de base</h3>
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">
                        {t("admin:module_name")} *
                      </FormLabel>
                      <FormControl>
                        <Input placeholder={t("admin:module_name_placeholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Semester - Controlled */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">
                    {t("admin:select_semester")} {!availableInAllSemesters && '*'}
                  </Label>
                  <Select 
                    key={`semester-${module?.id || module?._id}`} 
                    value={selectedSemester} 
                    onValueChange={setSelectedSemester}
                    disabled={availableInAllSemesters}
                  >
                    <SelectTrigger className={availableInAllSemesters ? "opacity-50" : ""}>
                      <SelectValue placeholder={availableInAllSemesters ? "Tous les semestres" : t("admin:choose_semester")} />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => `S${i + 1}`).reverse().map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Available in All Semesters Checkbox */}
                <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <input
                    type="checkbox"
                    id="editAvailableInAllSemesters"
                    checked={availableInAllSemesters}
                    onChange={(e) => {
                      setAvailableInAllSemesters(e.target.checked);
                      if (e.target.checked) {
                        setSelectedSemester('');
                      }
                    }}
                    className="rounded border-border text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="editAvailableInAllSemesters" className="text-sm font-medium text-blue-900 cursor-pointer">
                    📚 Disponible pour tous les semestres
                  </label>
                </div>

                <FormField
                  control={form.control}
                  name="infoText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">
                        Description courte (optionnel)
                      </FormLabel>
                      <FormControl>
                        <Textarea placeholder="Décrivez brièvement le module..." rows={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Difficulty & Appearance */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Difficulté & Apparence</h3>
                
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-foreground">Niveau de Difficulté</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {DIFFICULTY_LEVELS.map((level) => (
                      <button
                        key={level.value}
                        type="button"
                        onClick={() => setDifficulty(level.value)}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                          difficulty === level.value
                            ? `${level.bgColor} ${level.borderColor} ${level.textColor} shadow-md`
                            : "bg-card border-border text-muted-foreground hover:border-border"
                        }`}
                      >
                        <CircleDot className="h-4 w-4" />
                        <span className="font-medium">{level.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5">
                  {/* Simple Color Picker */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-foreground">Choisir une couleur</Label>
                    
                    <div className="flex flex-wrap gap-3">
                      {SIMPLE_COLORS.map((item) => (
                        <button
                          key={item.color}
                          type="button"
                          onClick={() => { setSelectedColor(item.color); setUseGradient(false); }}
                          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all hover:scale-105 ${
                            selectedColor === item.color && !useGradient ? "ring-2 ring-blue-500" : ""
                          }`}
                        >
                          <div
                            className="w-12 h-12 rounded-lg border-2 border-white shadow-md"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-xs text-muted-foreground">{item.name}</span>
                        </button>
                      ))}
                      
                      {/* Custom Color Button */}
                      <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all hover:scale-105 ${
                              !SIMPLE_COLORS.some(c => c.color === selectedColor) && !useGradient ? "ring-2 ring-blue-500" : ""
                            }`}
                          >
                            <div
                              className="w-12 h-12 rounded-lg border-2 border-dashed border-border shadow-md flex items-center justify-center bg-gradient-to-br from-red-400 via-green-400 to-blue-400"
                            >
                              <Palette className="h-5 w-5 text-white drop-shadow-md" />
                            </div>
                            <span className="text-xs text-muted-foreground">Custom</span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-4 z-[100001]" align="start">
                          <div className="space-y-3">
                            <Label className="text-sm font-semibold">Couleur personnalisée</Label>
                            <div className="flex items-center gap-3">
                              <input
                                type="color"
                                value={selectedColor}
                                onChange={(e) => { setSelectedColor(e.target.value); setUseGradient(false); }}
                                className="w-14 h-14 rounded-lg border-2 border-border cursor-pointer"
                              />
                              <div className="flex-1 space-y-2">
                                <Input
                                  type="text"
                                  value={selectedColor}
                                  onChange={(e) => { setSelectedColor(e.target.value); setUseGradient(false); }}
                                  className="h-9 text-xs font-mono uppercase"
                                  placeholder="#3b82f6"
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => setShowColorPicker(false)}
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Appliquer
                                </Button>
                              </div>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="border-t pt-3 mt-3">
                      <span className="text-xs text-muted-foreground mb-2 block">Ou choisir un dégradé</span>
                      <div className="flex flex-wrap gap-3">
                        {SIMPLE_GRADIENTS.map((gradient) => (
                          <button
                            key={gradient.name}
                            type="button"
                            onClick={() => {
                              setSelectedColor(gradient.from);
                              setGradientColor(gradient.to);
                              setGradientDirection(gradient.direction);
                              setUseGradient(true);
                            }}
                            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all hover:scale-105 ${
                              useGradient && selectedColor === gradient.from && gradientColor === gradient.to
                                ? "ring-2 ring-blue-500"
                                : ""
                            }`}
                          >
                            <div
                              className="w-16 h-16 rounded-lg border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-xl"
                              style={{
                                background: `linear-gradient(${(() => {
                                  const dirMap = {
                                    'to-br': 'to bottom right',
                                    'to-tr': 'to top right', 
                                    'to-bl': 'to bottom left',
                                    'to-tl': 'to top left',
                                    'to-r': 'to right',
                                    'to-l': 'to left',
                                    'to-b': 'to bottom',
                                    'to-t': 'to top'
                                  };
                                  return dirMap[gradient.direction] || 'to bottom right';
                                })()}, ${gradient.from}, ${gradient.to})`
                              }}
                            >
                              M
                            </div>
                            <span className="text-xs text-muted-foreground font-medium">{gradient.name}</span>
                          </button>
                        ))}
                      </div>
                      
                      {/* Custom Gradient */}
                      <div className="flex items-center gap-2 pt-2">
                        <Label className="text-xs text-muted-foreground">Dégradé personnalisé:</Label>
                        <input
                          type="color"
                          value={selectedColor}
                          onChange={(e) => setSelectedColor(e.target.value)}
                          className="w-10 h-10 rounded-lg border-2 border-border cursor-pointer"
                          title="Couleur de départ"
                        />
                        <span className="text-gray-400">→</span>
                        <input
                          type="color"
                          value={gradientColor || "#8b5cf6"}
                          onChange={(e) => { setGradientColor(e.target.value); setUseGradient(true); }}
                          className="w-10 h-10 rounded-lg border-2 border-border cursor-pointer"
                          title="Couleur de fin"
                        />
                        <Select value={gradientDirection} onValueChange={setGradientDirection}>
                          <SelectTrigger className="w-32 h-10 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="to-br">↘ Bas Droite</SelectItem>
                            <SelectItem value="to-tr">↗ Haut Droite</SelectItem>
                            <SelectItem value="to-bl">↙ Bas Gauche</SelectItem>
                            <SelectItem value="to-tl">↖ Haut Gauche</SelectItem>
                            <SelectItem value="to-r">→ Droite</SelectItem>
                            <SelectItem value="to-l">← Gauche</SelectItem>
                            <SelectItem value="to-b">↓ Bas</SelectItem>
                            <SelectItem value="to-t">↑ Haut</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {/* Preview */}
                    <div key={`${selectedColor}-${gradientColor}-${useGradient}-${gradientDirection}`} className="mt-4 p-3 rounded-lg bg-muted flex items-center gap-3">
                      <div
                        className="w-14 h-14 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md"
                        style={{
                          background: useGradient && gradientColor
                            ? `linear-gradient(${(() => {
                                const dirMap = {
                                  'to-br': 'to bottom right',
                                  'to-tr': 'to top right', 
                                  'to-bl': 'to bottom left',
                                  'to-tl': 'to top left',
                                  'to-r': 'to right',
                                  'to-l': 'to left',
                                  'to-b': 'to bottom',
                                  'to-t': 'to top'
                                };
                                return dirMap[gradientDirection] || 'to bottom right';
                              })()}, ${selectedColor}, ${gradientColor})`
                            : selectedColor
                        }}
                      >
                        M
                      </div>
                      <div className="text-sm">
                        <p className="font-semibold text-foreground">Aperçu</p>
                        <p className="text-gray-500">{useGradient && gradientColor ? "Dégradé" : "Couleur unie"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Module Image */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-foreground">
                      <Image className="h-4 w-4 inline mr-2" />
                      Image du Module
                    </Label>
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted hover:bg-accent transition-colors">
                      {moduleImagePreview ? (
                        <img src={moduleImagePreview} alt="Preview" className="h-full w-full object-contain rounded-lg" />
                      ) : (
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Image className="w-8 h-8 mb-3 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground"><span className="font-semibold">Cliquez pour uploader</span></p>
                        </div>
                      )}
                      <input type="file" className="hidden" accept="image/*" onChange={handleModuleImageChange} />
                    </label>
                    {moduleImageFile && (
                      <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                        <span className="text-sm text-blue-700 truncate">{moduleImageFile.name}</span>
                        <button type="button" onClick={() => { setModuleImageFile(null); setModuleImagePreview(module?.imageUrl ? `${API_URL?.replace('/api/v1', '')}${module.imageUrl}` : null); }} className="text-red-500 hover:text-red-700">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Help Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2 flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-green-600" />
                  Section Aide (Button Aide)
                </h3>
                <p className="text-sm text-muted-foreground">
                  Texte ET/OU image ET/OU PDF affichés dans le modal d'aide.
                </p>

                <FormField
                  control={form.control}
                  name="helpContent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">
                        <FileText className="h-4 w-4 inline mr-2" />
                        Texte d'aide
                      </FormLabel>
                      <FormControl>
                        <Textarea placeholder="Texte d'aide pour l'utilisateur..." rows={4} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Help Image */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-foreground">
                      <Image className="h-4 w-4 inline mr-2" />
                      Image d'aide
                    </Label>
                    <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-green-300 rounded-lg cursor-pointer bg-green-50 hover:bg-green-100 transition-colors">
                      {helpImagePreview ? (
                        <img src={helpImagePreview} alt="Help Preview" className="h-full w-full object-contain rounded-lg" />
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <Upload className="w-6 h-6 mb-2 text-green-500" />
                          <p className="text-xs text-green-700 font-medium">Image pour l'aide</p>
                        </div>
                      )}
                      <input type="file" className="hidden" accept="image/*" onChange={handleHelpImageChange} />
                    </label>
                    {helpImageFile && (
                      <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                        <span className="text-sm text-green-700 truncate">{helpImageFile.name}</span>
                        <button type="button" onClick={() => { setHelpImageFile(null); setHelpImagePreview(module?.helpImage ? `${API_URL?.replace('/api/v1', '')}${module.helpImage}` : null); }} className="text-red-500 hover:text-red-700">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Help PDF */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-foreground">
                      <File className="h-4 w-4 inline mr-2" />
                      PDF d'aide
                      {module?.helpPdf && <span className="text-xs text-gray-500 ml-2">(existant)</span>}
                    </Label>
                    <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer bg-purple-50 hover:bg-purple-100 transition-colors">
                      {helpPdfFile ? (
                        <div className="flex flex-col items-center justify-center">
                          <File className="w-8 h-8 mb-2 text-purple-600" />
                          <p className="text-xs text-purple-700 font-medium text-center px-2 truncate max-w-full">{helpPdfFile.name}</p>
                        </div>
                      ) : module?.helpPdf ? (
                        <div className="flex flex-col items-center justify-center">
                          <File className="w-8 h-8 mb-2 text-purple-600" />
                          <p className="text-xs text-purple-700 font-medium">PDF existant</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <Upload className="w-6 h-6 mb-2 text-purple-500" />
                          <p className="text-xs text-purple-700 font-medium">PDF pour l'aide</p>
                        </div>
                      )}
                      <input type="file" className="hidden" accept="application/pdf" onChange={handleHelpPdfChange} />
                    </label>
                    {helpPdfFile && (
                      <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                        <span className="text-sm text-purple-700 truncate">{helpPdfFile.name}</span>
                        <button type="button" onClick={() => setHelpPdfFile(null)} className="text-red-500 hover:text-red-700">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Text Content */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Contenu textuel</h3>
                <FormField
                  control={form.control}
                  name="textContent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">
                        Contenu du module en texte
                      </FormLabel>
                      <FormControl>
                        <Textarea placeholder="Décrivez le contenu du module..." rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-muted px-6 py-4 border-t rounded-b-xl flex justify-end gap-3 z-10">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowEditForm(false)}
            disabled={isSubmitting}
          >
            {t("admin:cancel")}
          </Button>
          <Button
            type="submit"
            onClick={form.handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("admin:saving")}
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                {t("admin:save")}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditModuleForm;
