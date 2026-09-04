import React from "react";
import { useTranslation } from "react-i18next";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { X, DollarSign, Package, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { displaySubscriptionCopy, displaySubscriptionPlanName, editableSubscriptionPeriod } from "@/utils/subscriptionDisplay";

const PlanModal = ({
  open,
  title = "Create Plan",
  initialPlan,
  onSave,
  onCancel,
}) => {
  const { t } = useTranslation(["admin"]);
  const [form, setForm] = React.useState({
    name: "",
    description: "",
    price: "",
    oldPrice: "",
    period: "Semester",
    features: [],
    featuresInput: "",
  });

  React.useEffect(() => {
    if (!open) return;
    const featuresArray = Array.isArray(initialPlan?.features)
      ? initialPlan.features
        .map((feature) => {
          const text = typeof feature === "object" ? feature?.text : feature;
          if (!String(text || "").trim()) return null;
          return {
            text: displaySubscriptionCopy(String(text).trim()),
            included: typeof feature === "object" ? feature.included !== false : true,
          };
        })
        .filter(Boolean)
      : (initialPlan?.featuresText || "")
        .split(",")
        .map((text) => text.trim())
        .filter(Boolean)
        .map((text) => ({ text: displaySubscriptionCopy(text), included: true }));
    setForm({
      name: displaySubscriptionPlanName(initialPlan?.name, ""),
      description: displaySubscriptionCopy(initialPlan?.description),
      price:
        initialPlan?.price === 0 || initialPlan?.price
          ? String(initialPlan.price)
          : "",
      oldPrice:
        initialPlan?.oldPrice === 0 || initialPlan?.oldPrice
          ? String(initialPlan.oldPrice)
          : "",
      period: editableSubscriptionPeriod(initialPlan?.period),
      features: featuresArray,
      featuresInput: "",
    });
  }, [open, initialPlan]);

  const addFeature = (included) => {
    const text = form.featuresInput.trim();
    if (!text) return;

    setForm((currentForm) => {
      const matchingFeatureIndex = currentForm.features.findIndex(
        (feature) => feature.text.toLocaleLowerCase() === text.toLocaleLowerCase()
      );
      const features = matchingFeatureIndex === -1
        ? [...currentForm.features, { text, included }]
        : currentForm.features.map((feature, featureIndex) => (
          featureIndex === matchingFeatureIndex ? { ...feature, text, included } : feature
        ));

      return { ...currentForm, features, featuresInput: "" };
    });
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <Motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex justify-center items-center min-h-screen bg-black/60 backdrop-blur-sm p-4 z-[99999999999] fixed top-0 left-0 w-full h-full"
        onClick={onCancel}
      >
        <Motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="w-full max-w-2xl bg-card text-card-foreground rounded-2xl shadow-2xl border border-border p-8 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-accent transition-colors group"
          >
            <X className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
          </button>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            </div>
            <p className="text-sm text-muted-foreground ml-1">
              {t("admin:plan_details")}
            </p>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="plan-name" className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Package className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  {t("admin:plan_title")}
                </Label>
                <Input
                  id="plan-name"
                  placeholder="e.g., Premium Plan"
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  className="h-11 rounded-lg border-border bg-background text-foreground focus:border-purple-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-period" className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Package className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  Period
                </Label>
                <select
                  id="plan-period"
                  value={form.period}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, period: e.target.value }))
                  }
                  className="h-11 w-full rounded-lg border border-border focus:border-purple-500 focus:ring-purple-500 transition-all px-3 bg-background text-foreground"
                >
                  <option value="Gratuit">Gratuit</option>
                  <option value="Semestre">Semestre</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-desc" className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-600" />
                {t("admin:description")}
              </Label>
              <Input
                id="plan-desc"
                placeholder="Brief description of the plan"
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                className="h-11 rounded-lg border-border focus:border-purple-500 focus:ring-purple-500 transition-all"
              />
            </div>

            <div>
              <Label className="text-sm font-semibold text-foreground mb-3 block">Pricing</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="space-y-2">
                  <Label htmlFor="old-price" className="text-xs font-medium text-foreground flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    {t("admin:old_price")} (Original)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      id="old-price"
                      type="number"
                      step="0.01"
                      placeholder="99.99"
                      value={form.oldPrice}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, oldPrice: e.target.value }))
                      }
                      className="h-11 pl-7 rounded-lg border-border focus:border-blue-500 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-xs font-medium text-foreground flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    {t("admin:new_price")} (Current)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">$</span>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      placeholder="59.99"
                      value={form.price}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, price: e.target.value }))
                      }
                      className="h-11 pl-7 rounded-lg border-border focus:border-green-500 focus:ring-green-500 transition-all font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                {t("admin:features")}
              </Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  placeholder={t("admin:features_placeholder")}
                  value={form.featuresInput}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, featuresInput: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addFeature(true);
                    }
                  }}
                  className="h-11 flex-1 rounded-lg border-border focus:border-green-500 focus:ring-green-500 transition-all"
                />
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <Button
                    type="button"
                    className="h-11 px-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all rounded-lg flex items-center justify-center gap-2"
                    onClick={() => addFeature(true)}
                    disabled={!form.featuresInput.trim()}
                  >
                    <Check className="w-4 h-4" />
                    Inclure
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 px-4 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 rounded-lg flex items-center justify-center gap-2 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
                    onClick={() => addFeature(false)}
                    disabled={!form.featuresInput.trim()}
                  >
                    <X className="w-4 h-4" />
                    Exclure
                  </Button>
                </div>
              </div>

              {Array.isArray(form.features) && form.features.length > 0 ? (
                <Motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-wrap gap-2 mt-4 p-4 bg-muted/40 rounded-lg border border-border"
                >
                  {form.features.map((feature, idx) => (
                    <Motion.span
                      key={`${feature.text}-${idx}`}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm border shadow-sm ${
                        feature.included
                          ? "bg-green-50 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800"
                          : "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
                      }`}
                    >
                      {feature.included ? <Check className="w-3 h-3 text-green-600" /> : <X className="w-3 h-3 text-red-600" />}
                      {feature.text}
                      <span className="inline-flex overflow-hidden rounded-md border border-current/20" role="group" aria-label={`État de ${feature.text}`}>
                        <button
                          type="button"
                          className={`p-1 transition-colors ${feature.included ? "bg-green-600 text-white" : "hover:bg-green-100 dark:hover:bg-green-950"}`}
                          onClick={() => setForm((p) => ({
                            ...p,
                            features: p.features.map((item, itemIndex) => itemIndex === idx ? { ...item, included: true } : item),
                          }))}
                          aria-label={`Activer ${feature.text}`}
                          aria-pressed={feature.included}
                          title="Activer"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          className={`p-1 transition-colors ${!feature.included ? "bg-red-600 text-white" : "hover:bg-red-100 dark:hover:bg-red-950"}`}
                          onClick={() => setForm((p) => ({
                            ...p,
                            features: p.features.map((item, itemIndex) => itemIndex === idx ? { ...item, included: false } : item),
                          }))}
                          aria-label={`Désactiver ${feature.text}`}
                          aria-pressed={!feature.included}
                          title="Désactiver"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                      <button
                        type="button"
                        className="ml-1 text-current hover:text-red-600 transition-colors font-bold"
                        onClick={() =>
                          setForm((p) => ({
                            ...p,
                            features: p.features.filter((_, itemIndex) => itemIndex !== idx),
                          }))
                        }
                        aria-label={`Supprimer ${feature.text}`}
                      >
                        ×
                      </button>
                    </Motion.span>
                  ))}
                </Motion.div>
              ) : null}
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-border mt-8">
              <Button
                type="button"
                variant="outline"
                className="px-6 h-11 rounded-lg border-border text-foreground hover:bg-accent transition-all"
                onClick={onCancel}
              >
                {t("admin:cancel")}
              </Button>
              <Button
                type="button"
                className="px-6 h-11 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                onClick={() => onSave(form)}
              >
                <Check className="w-4 h-4" />
                {t("admin:save")}
              </Button>
            </div>
          </div>
        </Motion.div>
      </Motion.div>
    </AnimatePresence>
  );
};

export default PlanModal;
