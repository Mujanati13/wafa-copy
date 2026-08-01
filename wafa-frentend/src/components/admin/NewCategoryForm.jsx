import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { X, FolderPlus, BookOpen, GraduationCap } from "lucide-react";

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
import { toast } from "sonner";
import { api } from "@/lib/utils";

const SEMESTERS = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10"];

const NewCategoryForm = ({ setShowNewCategoryForm, onModuleCreated }) => {
  const { t } = useTranslation(["admin"]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const newModuleSchema = z.object({
    name: z.string().min(2, "Le nom du module est requis"),
    semester: z.string().min(1, "Le semestre est requis"),
  });

  const form = useForm({
    resolver: zodResolver(newModuleSchema),
    defaultValues: {
      name: "",
      semester: "",
    },
  });

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      // First create the module
      const moduleResponse = await api.post("/modules/create", {
        name: data.name,
        semester: data.semester,
      });

      const newModule = moduleResponse.data?.data;
      
      // Then auto-create the 3 default categories (exam-courses) for this module
      if (newModule?._id) {
        const categories = ["Exam par years", "Exam par courses", "QCM banque"];
        
        for (const category of categories) {
          try {
            await api.post("/exam-courses", {
              name: `${data.name} - ${category}`,
              moduleId: newModule._id,
              category: category,
            });
          } catch (catError) {
            console.error(`Error creating category ${category}:`, catError);
          }
        }
      }

      form.reset();
      setShowNewCategoryForm(false);
      toast.success("Module créé avec les 3 catégories par défaut !");
      if (onModuleCreated) onModuleCreated();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || "Erreur lors de la création du module");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex justify-center items-center min-h-screen bg-black/60 backdrop-blur-sm p-4 z-[99999999999] fixed top-0 left-0 w-full h-full"
        onClick={() => setShowNewCategoryForm(false)}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="w-full max-w-lg bg-card text-card-foreground rounded-2xl shadow-2xl border border-border p-8 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={() => setShowNewCategoryForm(false)}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-accent transition-colors group"
          >
            <X className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
          </button>

          {/* Header with Icon */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <FolderPlus className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">
                Ajouter un Module
              </h1>
            </div>
            <p className="text-sm text-muted-foreground ml-1">
              Le module aura automatiquement les 3 catégories par défaut : Exam par years, Exam par courses, QCM banque
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Nom du Module
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Anatomie, Physiologie..."
                        className="border-border bg-background text-foreground focus:border-blue-500 h-11 rounded-lg transition-all"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="semester"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      Semestre
                    </FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="w-full px-4 py-2.5 border border-border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all bg-background text-foreground font-medium appearance-none cursor-pointer"
                      >
                        <option value="" disabled hidden>
                          Choisir un semestre
                        </option>
                        {SEMESTERS.map((sem) => (
                          <option key={sem} value={sem}>
                            {sem}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-6 border-t border-border mt-8">
                <Button
                  type="button"
                  variant="outline"
                  className="px-6 h-11 rounded-lg border-border text-foreground hover:bg-accent transition-all"
                  onClick={() => {
                    form.reset();
                    setShowNewCategoryForm(false);
                  }}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 h-11 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Création...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <FolderPlus className="w-4 h-4" />
                      Créer le Module
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NewCategoryForm;
