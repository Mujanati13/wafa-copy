import React from "react";
import { motion as Motion } from "framer-motion";
import {
  Fingerprint,
  Heart,
  KeyRound,
  LockKeyhole,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
  UserPlus,
  UserRound,
} from "lucide-react";

const floatingItems = {
  login: [
    { Icon: UserRound, position: "left-[8%] top-[34%]", color: "from-sky-500 to-indigo-600", delay: 0 },
    { Icon: KeyRound, position: "right-[8%] top-[36%]", color: "from-amber-400 to-orange-500", delay: 0.3 },
    { Icon: Star, position: "left-[11%] bottom-[16%]", color: "from-teal-500 to-emerald-600", delay: 0.6 },
    { Icon: Sparkles, position: "right-[12%] bottom-[18%]", color: "from-pink-500 to-rose-600", delay: 0.9 },
  ],
  register: [
    { Icon: Rocket, position: "left-[8%] top-[35%]", color: "from-blue-500 to-indigo-600", delay: 0 },
    { Icon: Sparkles, position: "right-[8%] top-[37%]", color: "from-amber-400 to-orange-500", delay: 0.3 },
    { Icon: Star, position: "left-[10%] bottom-[12%]", color: "from-violet-500 to-fuchsia-600", delay: 0.6 },
    { Icon: ShieldCheck, position: "right-[11%] bottom-[13%]", color: "from-teal-500 to-emerald-600", delay: 0.9 },
  ],
};

const FloatingIcon = ({ Icon: icon, position, color, delay }) => (
  <Motion.div
    className={`absolute ${position} flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white shadow-lg shadow-slate-300/50 sm:h-14 sm:w-14`}
    animate={{ y: [0, -8, 0], rotate: [0, 2, 0] }}
    transition={{ duration: 4, delay, repeat: Infinity, ease: "easeInOut" }}
    aria-hidden="true"
  >
    {React.createElement(icon, {
      className: "h-6 w-6 sm:h-7 sm:w-7",
      strokeWidth: 1.8,
    })}
  </Motion.div>
);

const AuthVisualPanel = ({ variant = "login", className = "" }) => {
  const isRegistration = variant === "register";

  return (
    <aside
      className={`relative min-h-[430px] overflow-hidden bg-white px-6 py-8 text-center dark:bg-slate-950 sm:min-h-[500px] lg:min-h-[720px] lg:px-10 lg:py-12 ${className}`}
      aria-label={isRegistration ? "Présentation de l'inscription YourQCM" : "Présentation de la connexion YourQCM"}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.13),transparent_34%),radial-gradient(circle_at_75%_70%,rgba(59,130,246,0.08),transparent_25%)]" />
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(14,165,233,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.05)_1px,transparent_1px)] [background-size:32px_32px]" />

      <div className="relative z-10 mx-auto flex h-full max-w-md flex-col items-center">
        <div className="flex items-center gap-2 text-2xl font-medium uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300 sm:text-3xl">
          <Stethoscope className="h-8 w-8" strokeWidth={1.5} aria-hidden="true" />
          <span>YourQCM</span>
        </div>

        <div className="mt-9 sm:mt-12">
          <h1 className="bg-gradient-to-r from-teal-700 to-blue-700 bg-clip-text text-2xl font-bold leading-tight text-transparent sm:text-3xl">
            {isRegistration ? (
              <>Créer un compte<br />YourQCM</>
            ) : (
              <>Bienvenue sur<br />YourQCM</>
            )}
          </h1>
          <p className="mt-3 text-sm tracking-[0.08em] text-slate-400 sm:text-base">
            {isRegistration
              ? "Rejoignez notre communauté d'apprentissage"
              : "Votre plateforme d'apprentissage médical"}
          </p>
        </div>

        <div className="relative mt-6 w-full flex-1 sm:mt-8">
          {floatingItems[variant].map((item, index) => (
            <FloatingIcon key={`${variant}-${index}`} {...item} />
          ))}

          <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-teal-200/80 sm:h-56 sm:w-56 dark:border-teal-800/80" />
          <div className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-300/15 blur-xl sm:h-44 sm:w-44" />

          <div
            className={`absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[2rem] bg-gradient-to-br text-white shadow-2xl sm:h-36 sm:w-36 ${isRegistration ? "from-blue-500 to-cyan-600" : "from-emerald-500 to-teal-700"}`}
          >
            {isRegistration ? (
              <UserPlus className="h-14 w-14" strokeWidth={1.6} aria-hidden="true" />
            ) : (
              <LockKeyhole className="h-14 w-14" strokeWidth={1.6} aria-hidden="true" />
            )}
          </div>

          {isRegistration ? (
            <div className="absolute left-[28%] top-[43%] flex h-10 w-10 items-center justify-center rounded-lg bg-pink-500 text-white shadow-lg" aria-hidden="true">
              <Heart className="h-5 w-5 fill-current" />
            </div>
          ) : (
            <div className="absolute left-[30%] top-[39%] flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg" aria-hidden="true">
              <Fingerprint className="h-5 w-5" />
            </div>
          )}

          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-sm font-medium tracking-[0.08em] text-teal-700 dark:text-teal-300 sm:text-base">
            {isRegistration ? "Rejoignez la communauté" : "Préparez votre réussite"}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default AuthVisualPanel;
