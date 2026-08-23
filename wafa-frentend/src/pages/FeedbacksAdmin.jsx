import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2,
  MessageSquare,
  Plus,
  Edit,
  Trash2,
  Star,
  CheckCircle,
  XCircle,
  Award,
  User,
  Upload,
  X,
} from "lucide-react";
import { api } from "@/lib/utils";

const BASE_URL = (import.meta.env.VITE_API_URL || "").replace("/api/v1", "");
const REVIEW_SUBJECTS = ["Expérience générale", "Qualité de contenu", "Interface & navigation", "Idées d'amélioration"];
const getModerationStatus = (feedback) => feedback.moderationStatus || (feedback.isApproved ? "approved" : "pending");
const getImageSrc = (url) => {
  if (!url) return "";
  return url.startsWith("http") ? url : `${BASE_URL}${url}`;
};

const FeedbacksAdmin = () => {
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "Expérience générale",
    role: "Étudiant en médecine",
    message: "",
    rating: 5,
    imageUrl: "",
    isApproved: false,
    isFeatured: false,
    order: 0,
  });

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const response = await api.get("/feedbacks/admin");
      if (response.data.success) {
        setFeedbacks(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching feedbacks:", error);
      toast.error("Erreur lors du chargement des témoignages");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (feedback = null) => {
    if (feedback) {
      setEditMode(true);
      setSelectedFeedback(feedback);
      setImageFile(null);
      setImagePreview(getImageSrc(feedback.imageUrl || ""));
      setFormData({
        name: feedback.name,
        email: feedback.email || "",
        subject: feedback.subject || "Expérience générale",
        role: feedback.role,
        message: feedback.message,
        rating: feedback.rating,
        imageUrl: feedback.imageUrl || "",
        isApproved: feedback.isApproved,
        isFeatured: feedback.isFeatured,
        order: feedback.order,
      });
    } else {
      setEditMode(false);
      setSelectedFeedback(null);
      setImageFile(null);
      setImagePreview("");
      setFormData({
        name: "",
        email: "",
        subject: "Expérience générale",
        role: "Étudiant en médecine",
        message: "",
        rating: 5,
        imageUrl: "",
        isApproved: false,
        isFeatured: false,
        order: 0,
      });
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditMode(false);
    setSelectedFeedback(null);
    setImageFile(null);
    setImagePreview("");
    setFormData({
      name: "",
      email: "",
      subject: "Expérience générale",
      role: "Étudiant en médecine",
      message: "",
      rating: 5,
      imageUrl: "",
      isApproved: false,
      isFeatured: false,
      order: 0,
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image valide");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const submitData = new FormData();
      Object.entries(formData).forEach(([key, val]) => {
        if (key !== "imageUrl") submitData.append(key, val);
      });
      if (imageFile) {
        submitData.append("image", imageFile);
      } else {
        submitData.append("imageUrl", formData.imageUrl || "");
      }

      const config = { headers: { "Content-Type": "multipart/form-data" } };

      if (editMode && selectedFeedback) {
        const response = await api.put(`/feedbacks/${selectedFeedback._id}`, submitData, config);
        if (response.data.success) {
          toast.success("Témoignage mis à jour avec succès");
          fetchFeedbacks();
          handleCloseDialog();
        }
      } else {
        const response = await api.post("/feedbacks", submitData, config);
        if (response.data.success) {
          toast.success("Témoignage créé avec succès");
          fetchFeedbacks();
          handleCloseDialog();
        }
      }
    } catch (error) {
      console.error("Error saving feedback:", error);
      toast.error("Erreur lors de l'enregistrement du témoignage");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce témoignage ?")) {
      return;
    }

    try {
      const response = await api.delete(`/feedbacks/${id}`);
      if (response.data.success) {
        toast.success("Témoignage supprimé avec succès");
        fetchFeedbacks();
      }
    } catch (error) {
      console.error("Error deleting feedback:", error);
      toast.error("Erreur lors de la suppression du témoignage");
    }
  };

  const handleModeration = async (id, status) => {
    try {
      const response = await api.patch(`/feedbacks/${id}/moderation`, { status });
      if (response.data.success) {
        toast.success(response.data.message);
        fetchFeedbacks();
      }
    } catch (error) {
      console.error("Error moderating feedback:", error);
      toast.error("Erreur lors de la modification du statut");
    }
  };

  const handleToggleFeatured = async (id) => {
    try {
      const response = await api.patch(`/feedbacks/${id}/feature`);
      if (response.data.success) {
        toast.success(response.data.message);
        fetchFeedbacks();
      }
    } catch (error) {
      console.error("Error toggling featured:", error);
      toast.error("Erreur lors de la modification du statut");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="h-8 w-8 text-blue-600" />
              Gestion des Témoignages
            </h1>
            <p className="text-muted-foreground mt-1">
              Gérez les témoignages affichés sur la page d'accueil
            </p>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            <Plus className="h-4 w-4" />
            Ajouter un témoignage
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{feedbacks.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Approuvés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {feedbacks.filter((f) => f.isApproved).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                En attente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {feedbacks.filter((f) => getModerationStatus(f) === "pending").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Rejetés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {feedbacks.filter((f) => getModerationStatus(f) === "rejected").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feedbacks Table */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des témoignages</CardTitle>
            <CardDescription>
              Tous les témoignages dans le système
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Nom</TableHead>
                    <TableHead>Sujet / rôle</TableHead>
                    <TableHead className="max-w-xs">Message</TableHead>
                    <TableHead className="text-center">Note</TableHead>
                    <TableHead className="text-center">Statuts</TableHead>
                    <TableHead className="text-center">Ordre</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedbacks.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-12 text-muted-foreground"
                      >
                        Aucun témoignage trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    feedbacks.map((feedback) => (
                      <TableRow key={feedback._id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {feedback.imageUrl ? (
                              <img
                                src={getImageSrc(feedback.imageUrl)}
                                alt={feedback.name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <User className="h-4 w-4 text-blue-600" />
                              </div>
                            )}
                            <span>
                              <span className="block font-medium">{feedback.name}</span>
                              {feedback.email && <span className="block text-xs text-muted-foreground">{feedback.email}</span>}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {feedback.subject || feedback.role}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm">
                          {feedback.message}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">{feedback.rating}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-2 items-center">
                            <ModerationBadge status={getModerationStatus(feedback)} />
                            {feedback.isFeatured && (
                              <Badge
                                variant="default"
                                className="bg-blue-600 cursor-pointer"
                                onClick={() => handleToggleFeatured(feedback._id)}
                              >
                                <Award className="h-3 w-3 mr-1" />
                                Vedette
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{feedback.order}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {getModerationStatus(feedback) !== "approved" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleModeration(feedback._id, "approved")}
                                className="text-green-600 hover:bg-green-50 hover:text-green-700"
                                aria-label={`Approuver l'avis de ${feedback.name}`}
                                title="Approuver"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {getModerationStatus(feedback) !== "rejected" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleModeration(feedback._id, "rejected")}
                                className="text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                                aria-label={`Rejeter l'avis de ${feedback.name}`}
                                title="Rejeter"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(feedback)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(feedback._id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editMode ? "Modifier le témoignage" : "Ajouter un témoignage"}
            </DialogTitle>
            <DialogDescription>
              {editMode
                ? "Modifiez les informations du témoignage"
                : "Ajoutez un nouveau témoignage à afficher sur la page d'accueil"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom complet *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Ex: Dr. Ahmed Bennani"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rôle/Titre *</Label>
                <Input
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  placeholder="Ex: Étudiant en 3ème année"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="etudiant@exemple.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Sujet</Label>
                <Select value={formData.subject} onValueChange={(value) => setFormData((prev) => ({ ...prev, subject: value }))}>
                  <SelectTrigger id="subject"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REVIEW_SUBJECTS.map((subject) => <SelectItem key={subject} value={subject}>{subject}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                placeholder="Écrivez le témoignage ici..."
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rating">Note (1-5) *</Label>
                <Select
                  value={formData.rating.toString()}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, rating: parseInt(value) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: num }).map((_, i) => (
                            <Star
                              key={i}
                              className="h-4 w-4 fill-yellow-400 text-yellow-400"
                            />
                          ))}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="order">Ordre d'affichage</Label>
                <Input
                  id="order"
                  name="order"
                  type="number"
                  value={formData.order}
                  onChange={handleInputChange}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Photo (optionnel)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex items-center gap-3">
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-16 h-16 rounded-full object-cover border-2 border-blue-200"
                    />
                    <button
                      type="button"
                      onClick={() => { setImageFile(null); setImagePreview(""); setFormData(p => ({ ...p, imageUrl: "" })); }}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-muted border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <User className="h-6 w-6 text-gray-400" />
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {imagePreview ? "Changer" : "Télécharger"}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isApproved"
                  name="isApproved"
                  checked={formData.isApproved}
                  onChange={handleInputChange}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Label htmlFor="isApproved" className="cursor-pointer">
                  Approuver (visible sur le site)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isFeatured"
                  name="isFeatured"
                  checked={formData.isFeatured}
                  onChange={handleInputChange}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Label htmlFor="isFeatured" className="cursor-pointer">
                  Mettre en vedette
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                disabled={saving}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    {editMode ? "Mettre à jour" : "Créer"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function ModerationBadge({ status }) {
  if (status === "approved") {
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle className="mr-1 h-3 w-3" />Approuvé</Badge>;
  }
  if (status === "rejected") {
    return <Badge className="bg-red-100 text-red-800 hover:bg-red-100"><XCircle className="mr-1 h-3 w-3" />Rejeté</Badge>;
  }
  return <Badge variant="secondary"><MessageSquare className="mr-1 h-3 w-3" />En attente</Badge>;
}

export default FeedbacksAdmin;
