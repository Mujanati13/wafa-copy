import React from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, CreditCard, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WHATSAPP_URL } from "@/config/socialLinks";

export default function PromotionalUpgradeBanner({ className = "" }) {
  const navigate = useNavigate();

  const handleWhatsAppClick = () => {
    const message = encodeURIComponent(
      "Bonjour, je souhaite activer mon abonnement pour accéder à tous les modules."
    );
    const url = `${WHATSAPP_URL}?text=${message}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <section
      aria-label="Promotion abonnement"
      className={`relative overflow-hidden rounded-3xl border-2 border-indigo-200/80 bg-gradient-to-br from-indigo-50/90 via-sky-50/70 to-blue-50/80 p-5 shadow-lg shadow-indigo-100/40 dark:border-indigo-500/25 dark:from-slate-900 dark:via-indigo-950/40 dark:to-cyan-950/30 dark:shadow-indigo-950/20 sm:p-7 ${className}`}
    >
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-indigo-300/25 blur-3xl dark:bg-indigo-500/15"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-12 -left-12 h-44 w-44 rounded-full bg-cyan-300/25 blur-3xl dark:bg-cyan-500/15"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/90 px-3.5 py-1 text-xs font-semibold text-indigo-700 shadow-sm backdrop-blur-sm dark:border-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
          <span>Accès illimité à toute la plateforme</span>
        </div>

        <h2 className="max-w-2xl text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl md:text-3xl dark:text-white">
          Vous souhaitez accéder à tous les modules ?
        </h2>

        <p className="mt-2 max-w-xl text-xs sm:text-sm md:text-base leading-relaxed text-slate-600 dark:text-slate-300">
          Consultez les méthodes de paiement ou discutez directement avec notre équipe sur WhatsApp.
        </p>

        <div className="mt-5 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row sm:gap-4">
          <Button
            type="button"
            onClick={() => navigate("/dashboard/subscription")}
            className="w-full sm:w-auto min-w-[200px] gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-6 py-5 text-sm font-bold text-white shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02] hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98]"
          >
            <CreditCard className="h-4 w-4" aria-hidden="true" />
            <span>Voir les paiements</span>
            <ArrowRight className="h-4 w-4 ml-0.5" aria-hidden="true" />
          </Button>

          <Button
            type="button"
            onClick={handleWhatsAppClick}
            className="w-full sm:w-auto min-w-[200px] gap-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] px-6 py-5 text-sm font-bold text-white shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <MessageCircle className="h-4 w-4 fill-white text-[#25D366]" aria-hidden="true" />
            <span>Cliquez ici (WhatsApp)</span>
          </Button>
        </div>
      </div>
    </section>
  );
}
