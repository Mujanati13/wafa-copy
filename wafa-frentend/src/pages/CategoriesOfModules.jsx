import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Edit, Folders, Loader2, Plus, Search,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/utils";
import NewCategoryForm from "@/components/admin/NewCategoryForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const CATEGORY_TYPES = [
  {
    key: "examByYears",
    internalName: "Exam par years",
    defaultLabel: "Exam par years",
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  {
    key: "examByCourses",
    internalName: "Exam par courses",
    defaultLabel: "Exam par courses",
    color: "bg-purple-100 text-purple-700 border-purple-200",
  },
  {
    key: "qcmBank",
    internalName: "QCM banque",
    defaultLabel: "QCM banque",
    color: "bg-green-100 text-green-700 border-green-200",
  },
];

const getCategoryLabel = (module, category) => (
  module?.categoryLabels?.[category.key]?.trim() || category.defaultLabel
);

const CategoriesOfModules = () => {
  const { t } = useTranslation(["common"]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterModule, setFilterModule] = useState("all");
  const [filterSemester, setFilterSemester] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [labelValue, setLabelValue] = useState("");
  const [saving, setSaving] = useState(false);
  const itemsPerPage = 10;

  const fetchModules = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/modules");
      setModules(data?.data || []);
    } catch (error) {
      console.error("Error loading modules:", error);
      toast.error("Erreur lors du chargement des modules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  const rows = useMemo(() => modules.flatMap((module) => (
    CATEGORY_TYPES.map((category) => ({
      module,
      category,
      label: getCategoryLabel(module, category),
      uniqueKey: `${module._id}-${category.key}`,
    }))
  )), [modules]);

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase();
    return rows.filter(({ module, category, label }) => {
      const matchesSearch = !term
        || module.name?.toLocaleLowerCase().includes(term)
        || module.semester?.toLocaleLowerCase().includes(term)
        || label.toLocaleLowerCase().includes(term)
        || category.internalName.toLocaleLowerCase().includes(term);
      const matchesCategory = filterCategory === "all" || category.key === filterCategory;
      const matchesModule = filterModule === "all" || module._id === filterModule;
      const matchesSemester = filterSemester === "all" || module.semester === filterSemester;
      return matchesSearch && matchesCategory && matchesModule && matchesSemester;
    });
  }, [filterCategory, filterModule, filterSemester, rows, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const currentRows = filteredRows.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterModule, filterSemester]);

  const openEditDialog = (row) => {
    setEditingRow(row);
    setLabelValue(row.label);
  };

  const closeEditDialog = () => {
    if (saving) return;
    setEditingRow(null);
    setLabelValue("");
  };

  const saveLabel = async () => {
    if (!editingRow) return;
    const nextLabel = labelValue.trim();
    if (nextLabel.length < 2 || nextLabel.length > 60) {
      toast.error("Le libellé doit contenir entre 2 et 60 caractères");
      return;
    }

    try {
      setSaving(true);
      const { module, category } = editingRow;
      const response = await api.patch(`/modules/${module._id}/category-labels`, {
        labels: { [category.key]: nextLabel },
      });
      const savedLabels = response.data?.data?.categoryLabels;

      setModules((current) => current.map((item) => (
        item._id === module._id
          ? { ...item, categoryLabels: savedLabels || { ...item.categoryLabels, [category.key]: nextLabel } }
          : item
      )));
      toast.success("Libellé mis à jour avec succès");
      setEditingRow(null);
      setLabelValue("");
    } catch (error) {
      console.error("Error updating category label:", error);
      toast.error(error.response?.data?.message || "Erreur lors de la mise à jour du libellé");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" aria-label="Chargement" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Catégories des Modules</h1>
            <p className="text-muted-foreground">
              Personnalisez les libellés affichés sans modifier le type technique du contenu.
            </p>
          </div>
          <Button onClick={() => setShowNewCategoryForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Ajouter un Module
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {CATEGORY_TYPES.map((category) => (
            <Card key={category.key}>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">{category.defaultLabel}</p>
                  <p className="text-2xl font-bold">{modules.length}</p>
                  <p className="text-xs text-muted-foreground">modules personnalisables</p>
                </div>
                <Badge className={category.color}>{category.defaultLabel}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Folders className="h-5 w-5" />
              Libellés par module
            </CardTitle>
            <CardDescription>
              Les clés internes restent stables afin que les examens et les QCM continuent de fonctionner après un renommage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Rechercher..."
                  className="pl-10"
                />
              </div>
              <Select value={filterSemester} onValueChange={setFilterSemester}>
                <SelectTrigger><SelectValue placeholder="Tous les semestres" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les semestres</SelectItem>
                  {["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10"].map((semester) => (
                    <SelectItem key={semester} value={semester}>{semester}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterModule} onValueChange={setFilterModule}>
                <SelectTrigger><SelectValue placeholder="Tous les modules" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les modules</SelectItem>
                  {modules.map((module) => (
                    <SelectItem key={module._id} value={module._id}>{module.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger><SelectValue placeholder="Tous les types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {CATEGORY_TYPES.map((category) => (
                    <SelectItem key={category.key} value={category.key}>{category.defaultLabel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Module</TableHead>
                    <TableHead>Semestre</TableHead>
                    <TableHead>Type interne</TableHead>
                    <TableHead>Libellé affiché</TableHead>
                    <TableHead className="text-right">{t("common:actions", "Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                        Aucun libellé trouvé
                      </TableCell>
                    </TableRow>
                  ) : currentRows.map((row) => (
                    <TableRow key={row.uniqueKey}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg font-bold text-white"
                            style={{ backgroundColor: row.module.color || "#6366f1" }}
                          >
                            {row.module.name?.charAt(0) || "M"}
                          </span>
                          <span className="font-medium">{row.module.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {row.module.availableInAllSemesters ? "Tous" : row.module.semester || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.category.internalName}</TableCell>
                      <TableCell><Badge className={row.category.color}>{row.label}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(row)}
                          aria-label={`Modifier le libellé ${row.label} pour ${row.module.name}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col justify-between gap-3 border-t sm:flex-row sm:items-center">
            <p className="text-sm text-muted-foreground">
              {filteredRows.length === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredRows.length)} sur {filteredRows.length}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setCurrentPage(safePage - 1)}>
                <ChevronLeft className="mr-1 h-4 w-4" />Précédent
              </Button>
              <span className="text-sm text-muted-foreground">{safePage} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setCurrentPage(safePage + 1)}>
                Suivant<ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>

      {showNewCategoryForm && (
        <NewCategoryForm
          setShowNewCategoryForm={setShowNewCategoryForm}
          onModuleCreated={fetchModules}
        />
      )}

      <Dialog open={Boolean(editingRow)} onOpenChange={(open) => { if (!open) closeEditDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le libellé</DialogTitle>
            <DialogDescription>
              {editingRow
                ? `${editingRow.category.internalName} · ${editingRow.module.name}`
                : "Personnalisez le texte affiché."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-3">
            <Label htmlFor="category-label">Nouveau libellé</Label>
            <Input
              id="category-label"
              value={labelValue}
              onChange={(event) => setLabelValue(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") saveLabel(); }}
              maxLength={60}
              autoFocus
            />
            <p className="text-right text-xs text-muted-foreground">{labelValue.trim().length}/60</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog} disabled={saving}>Annuler</Button>
            <Button onClick={saveLabel} disabled={saving || labelValue.trim().length < 2}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoriesOfModules;
