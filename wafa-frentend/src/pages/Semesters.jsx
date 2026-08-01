import React, { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { motion } from "framer-motion";
import { api } from "../lib/utils.js";
import { cn } from "../lib/utils.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BookOpen, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

const Semesters = () => {
  const { t } = useTranslation(['admin', 'common']);
  const [board, setBoard] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [totalModules, setTotalModules] = useState(0);
  const [successMessage, setSuccessMessage] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);

  // Initialize empty semesters
  const initializeSemesters = () => {
    const semesters = {};
    for (let i = 1; i <= 10; i++) {
      semesters[`S${i}`] = [];
    }
    return semesters;
  };

  // Fetch modules from backend
  const fetchModules = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Fetching modules from backend...");

      const response = await api.get("/modules");
      console.log("Backend response:", response.data);

      if (response.data.success) {
        const modules = response.data.data;
        setTotalModules(modules.length);

        if (modules.length === 0) {
          console.log("No modules found in database");
          setBoard(initializeSemesters());
          return;
        }

        const semesters = initializeSemesters();

        // Group modules by semester
        modules.forEach((module) => {
          console.log("Processing module:", module);
          if (module.semester && semesters[module.semester]) {
            semesters[module.semester].push({
              id: module._id,
              title: module.name,
              imageUrl: module.imageUrl,
              infoText: module.infoText,
              totalQuestions: module.totalQuestions || 0,
            });
          } else {
            console.warn(
              "Module has invalid semester or semester not found:",
              module
            );
          }
        });

        console.log("Processed semesters:", semesters);
        setBoard(semesters);
      } else {
        throw new Error(response.data.message || "Failed to fetch modules");
      }
    } catch (err) {
      console.error("Error fetching modules:", err);
      if (err.response) {
        console.error("Response status:", err.response.status);
        console.error("Response data:", err.response.data);
      }
      setError(`${t('admin:failed_to_load_modules')}: ${err.message}`);
      // Fallback to empty semesters
      setBoard(initializeSemesters());
    } finally {
      setLoading(false);
    }
  };

  // Update module semester in backend
  const updateModuleSemester = async (moduleId, newSemester) => {
    try {
      setUpdating(true);
      setError(null);
      setSuccessMessage(null);
      console.log(`Updating module ${moduleId} to semester ${newSemester}`);

      // Only send the semester field to update
      const response = await api.put(`/modules/${moduleId}`, {
        semester: newSemester,
      });

      console.log("Backend response:", response.data);

      if (response.data.success) {
        console.log("Module semester updated successfully:", response.data);
        setSuccessMessage(
          `Module déplacé avec succès vers le semestre ${newSemester}`
        );
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
        return true;
      } else {
        throw new Error(response.data.message || "Failed to update module");
      }
    } catch (err) {
      console.error("Error updating module semester:", err);
      if (err.response) {
        console.error("Response status:", err.response.status);
        console.error("Response data:", err.response.data);
      }
      setError(`Failed to update module semester: ${err.message}`);
      return false;
    } finally {
      setUpdating(false);
    }
  };

  // Update module order in backend
  const updateModuleOrder = async (moduleId, newOrder) => {
    try {
      const response = await api.put(`/modules/${moduleId}`, {
        order: newOrder,
      });

      if (response.data.success) {
        console.log("Module order updated successfully");
        return true;
      } else {
        throw new Error(response.data.message || "Failed to update module order");
      }
    } catch (err) {
      console.error("Error updating module order:", err);
      return false;
    }
  };

  // Load modules on component mount
  useEffect(() => {
    fetchModules();
  }, []);

  const handleDragStart = (event, fromColumnId, itemId) => {
    event.dataTransfer.setData(
      "text/plain",
      JSON.stringify({ fromColumnId, itemId })
    );
    event.dataTransfer.effectAllowed = "move";
    setDraggedItem({ fromColumnId, itemId });
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (event, toColumnId) => {
    event.preventDefault();
    try {
      const raw = event.dataTransfer.getData("text/plain");
      if (!raw) return;
      const { fromColumnId, itemId } = JSON.parse(raw);
      if (!fromColumnId || !itemId) return;

      // If moving within same column, just update order
      if (fromColumnId === toColumnId) {
        // Order will be handled by position in array
        return;
      }

      console.log(
        `Moving module ${itemId} from ${fromColumnId} to ${toColumnId}`
      );

      // Optimistically update the UI
      setBoard((prev) => {
        const sourceItems = [...prev[fromColumnId]];
        const targetItems = [...prev[toColumnId]];
        const movingIndex = sourceItems.findIndex((i) => i.id === itemId);
        if (movingIndex === -1) return prev;
        const [movingItem] = sourceItems.splice(movingIndex, 1);
        return {
          ...prev,
          [fromColumnId]: sourceItems,
          [toColumnId]: [{ ...movingItem }, ...targetItems],
        };
      });

      // Update in backend
      const success = await updateModuleSemester(itemId, toColumnId);
      if (!success) {
        // Revert the UI change if backend update failed
        console.log("Backend update failed, reverting UI changes");
        fetchModules();
      }
    } catch (error) {
      console.error("Error in handleDrop:", error);
      // Revert the UI change if there was an error
      fetchModules();
    } finally {
      setDraggedItem(null);
    }
  };

  // Handle reordering within the same column
  const handleReorderModules = async (columnId, newOrder) => {
    try {
      // Update order for each module
      const updatePromises = newOrder.map((module, index) =>
        updateModuleOrder(module.id, index)
      );
      await Promise.all(updatePromises);
      
      setSuccessMessage("Ordre des modules mis à jour");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Error reordering modules:", err);
      setError("Erreur lors de la mise à jour de l'ordre");
    }
  };

  // Handle drag and drop within same column for reordering
  const handleDropReorder = (event, columnId, dropTargetId) => {
    event.preventDefault();
    try {
      const raw = event.dataTransfer.getData("text/plain");
      if (!raw) return;
      const { fromColumnId, itemId } = JSON.parse(raw);
      
      if (fromColumnId !== columnId || itemId === dropTargetId) return;

      setBoard((prev) => {
        const items = [...prev[columnId]];
        const draggedIndex = items.findIndex((i) => i.id === itemId);
        const targetIndex = items.findIndex((i) => i.id === dropTargetId);
        
        if (draggedIndex === -1 || targetIndex === -1) return prev;

        // Remove dragged item
        const [draggedItem] = items.splice(draggedIndex, 1);
        // Insert at target position
        items.splice(targetIndex, 0, draggedItem);

        const newBoard = { ...prev, [columnId]: items };
        
        // Update backend with new order
        handleReorderModules(columnId, items);
        
        return newBoard;
      });
    } catch (error) {
      console.error("Error in handleDropReorder:", error);
    } finally {
      setDraggedItem(null);
    }
  };

  const columns = Object.keys(board);

  if (loading) {
    return (
      <div className="min-h-screen bg-card flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">{t('admin:loading_modules')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-card">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{t('admin:semesters')}</h2>
            <p className="text-muted-foreground">{t('admin:organize_modules_drag_drop')}</p>
            {totalModules > 0 && (
              <Badge className="mt-2 bg-blue-100 text-blue-700">
                {totalModules} {t('admin:modules_count')}
              </Badge>
            )}
          </div>
          <BookOpen className="w-10 h-10 text-blue-600" />
        </div>

        {/* Alerts */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        {updating && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Alert className="bg-blue-50 border-blue-200">
              <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
              <AlertDescription className="text-blue-800">Mise à jour en cours...</AlertDescription>
            </Alert>
          </motion.div>
        )}

        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        {totalModules === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-6 text-center">
                <p className="font-semibold text-yellow-900 mb-2">Aucun module trouvé</p>
                <p className="text-sm text-yellow-800">
                  Il n'y a pas encore de modules. Créez des modules via la page d'administration.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Kanban Board */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-card/80 backdrop-blur-sm rounded-xl border border-blue-100 shadow-lg p-4"
        >
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {columns.map((columnId, idx) => {
                const items = board[columnId];
                return (
                  <motion.div
                    key={columnId}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                    className="w-80 shrink-0 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-blue-100 shadow-md overflow-hidden"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, columnId)}
                  >
                    {/* Column Header */}
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-100 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge className="bg-blue-600 text-white font-bold">
                            {columnId}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {items.length} module{items.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Column Content */}
                    <div 
                      className="p-3 flex flex-col gap-2 min-h-[300px]"
                      onDragOver={handleDragOver}
                    >
                      {items.map((item, itemIdx) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: itemIdx * 0.05 }}
                          draggable
                          onDragStart={(e) =>
                            handleDragStart(e, columnId, item.id)
                          }
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDropReorder(e, columnId, item.id)}
                          className={cn(
                            "bg-card border border-blue-200 rounded-lg px-3 py-2 shadow-sm hover:shadow-md hover:border-blue-300 cursor-grab active:cursor-grabbing transition-all group",
                            draggedItem?.itemId === item.id && "opacity-50"
                          )}
                        >
                          <h4 className="text-sm font-semibold text-foreground group-hover:text-blue-600 transition-colors truncate">
                            {item.title}
                          </h4>
                          {item.totalQuestions > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.totalQuestions} questions
                            </p>
                          )}
                        </motion.div>
                      ))}

                      {/* Empty State */}
                      {items.length === 0 && (
                        <div className="border-2 border-dashed border-blue-200 rounded-lg p-6 text-center text-gray-400 flex-1 flex items-center justify-center">
                          <div>
                            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                            <p className="text-xs">Glissez ici</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Semesters;
