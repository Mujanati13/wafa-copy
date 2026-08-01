import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";

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
import { Select } from "../ui/select";
import { api } from "@/lib/utils";

const NewExamForm = ({ setShowNewExamForm, modules, years }) => {
  const { t } = useTranslation(["admin"]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const newExamSchema = z.object({
    name: z.string().min(2, t("admin:exam_name_required")),
    moduleName: z.string().min(1, t("admin:module_required")),
    year: z.string().min(1, t("admin:year_required")),
    imageUrl: z
      .string()
      .url(t("admin:image_url_invalid"))
      .or(z.string().length(0))
      .transform((v) => v || ""),
    helpText: z
      .string()
      .optional()
      .transform((v) => (v == null ? "" : v)),
  });

  const form = useForm({
    resolver: zodResolver(newExamSchema),
    defaultValues: {
      name: "",
      moduleName: "",
      year: "",
      imageUrl: "",
      helpText: "",
    },
  });

  const onSubmit = async (data) => {
    console.log(data);

    setIsSubmitting(true);
    try {
      const res = await api.post("/exams/create", {
        name: data.name,
        moduleId: "68ab0eaf049261f556c36340", //!TODO:replace this
        year: data.year,
        imageUrl: data.imageUrl,
        infoText: data.helpText,
      });
      console.log(res);

      console.log("New exam:", data);
      await new Promise((r) => setTimeout(r, 800));
      form.reset();
      setShowNewExamForm(false);
      alert(t("admin:exam_created_success"));
    } catch (e) {
      console.error(e);
      alert(t("admin:failed_create_exam"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-black/50 p-4 z-[99999999999] absolute top-0 left-0 w-full h-full">
      <div className="w-full max-w-md bg-card text-card-foreground rounded-lg shadow-sm border border-border p-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground mb-1">
            {t("admin:create_exam_par_years")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("admin:add_new_exam_year")}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">
                    {t("admin:exam_name")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("admin:exam_name_placeholder")}
                      className="border-border focus:border-gray-400 focus:ring-gray-400"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="moduleName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">
                    {t("admin:select_module")}
                  </FormLabel>
                  <FormControl>
                    <Select
                      {...field}
                      className="border-border focus:border-gray-400 focus:ring-gray-400"
                    >
                      <option value="" disabled>
                        {t("admin:choose_module")}
                      </option>
                      {modules.map((module) => (
                        <option key={module} value={module}>
                          {module}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">
                    {t("admin:select_year")}
                  </FormLabel>
                  <FormControl>
                    <Select
                      {...field}
                      className="border-border focus:border-gray-400 focus:ring-gray-400"
                    >
                      <option value="" disabled>
                        {t("admin:choose_year")}
                      </option>
                      {years.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">
                    {t("admin:image_url_optional")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("admin:image_url_placeholder")}
                      className="border-border focus:border-gray-400 focus:ring-gray-400"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="helpText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">
                    {t("admin:help_text_tooltip")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("admin:help_text_tooltip_placeholder")}
                      className="border-border focus:border-gray-400 focus:ring-gray-400"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                className="text-foreground hover:bg-accent"
                onClick={() => {
                  form.reset();
                  setShowNewExamForm(false);
                }}
              >
                {t("admin:cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gray-800 hover:bg-gray-900 text-white"
              >
                {isSubmitting ? t("admin:saving") : t("admin:create")}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default NewExamForm;
