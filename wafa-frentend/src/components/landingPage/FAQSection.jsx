import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GraduationCap, UserPlus, BarChart3, RefreshCcw, Settings2 } from 'lucide-react'

const FAQSection = () => {
  
const faqs = [
  {
    q: "Pour quelle faculté sont destinés ces QCMs ?",
    a: "Les QCMs sont spécifiquement conçus pour les étudiants de la FMPM (Faculté de Médecine et de Pharmacie de Marrakech).",
    icon: GraduationCap,
    color: "blue"
  },
  {
    q: "Dois-je créer un compte ?",
    a: "Oui, la création d'un compte gratuit est nécessaire pour accéder aux QCMs et sauvegarder votre progression.",
    icon: UserPlus,
    color: "green"
  },
  {
    q: "Puis-je suivre ma progression ?",
    a: "Oui, votre progression est automatiquement sauvegardée et vous pouvez la consulter à tout moment.",
    icon: BarChart3,
    color: "purple"
  },
  {
    q: "Puis-je être remboursé ?",
    a: "Les remboursements ne sont accordés que dans des cas exceptionnels. Pour toute demande, contactez-nous sur WhatsApp 0725089912.",
    icon: RefreshCcw,
    color: "orange"
  },
  {
    q: "Puis-je personnaliser mon parcours d'études ?",
    a: "Bien sûr ! Vous pouvez organiser votre plan d'études par création des playlists, des examens et des exercices spécifiques afin de personnaliser votre expérience d'apprentissage.",
    icon: Settings2,
    color: "indigo"
  }
];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3
      }
    }
  };

  const titleVariants = {
    hidden: { 
      opacity: 0, 
      y: 30 
    },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };

  const orbVariants = {
    animate: {
      scale: [1, 1.1, 1],
      opacity: [0.3, 0.6, 0.3],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <section id="faq" className="py-20 px-6 bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/10 via-transparent to-teal-50/10"></div>
      
      <motion.div 
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-100/10 rounded-full blur-3xl"
        variants={orbVariants}
        animate="animate"
      />
      <motion.div 
        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-100/10 rounded-full blur-3xl"
        variants={orbVariants}
        animate="animate"
        transition={{ delay: 1 }}
      />
      
      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div 
          className="text-center mb-16"
          variants={titleVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground leading-tight">
            Réponses aux questions{' '}
            <motion.span 
              className="text-blue-600"
              animate={{
                opacity: [1, 0.8, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              fréquentes
            </motion.span>
          </h2>
          <motion.div 
            className="w-24 h-1 bg-blue-600 mx-auto rounded-full"
            initial={{ width: 0 }}
            whileInView={{ width: 96 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            viewport={{ once: true }}
          />
        </motion.div>
        
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          <FAQAccordion faqs={faqs} />
        </motion.div>
      </div>
    </section>
  )
}

export default FAQSection

function FAQAccordion({ faqs }) {
  const [open, setOpen] = useState(null);

  const getColorClasses = (color) => {
    const colors = {
      blue: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40',
      green: 'text-green-500 bg-green-50 dark:bg-green-950/40',
      purple: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40',
      teal: 'text-teal-500 bg-teal-50 dark:bg-teal-950/40',
      orange: 'text-orange-500 bg-orange-50 dark:bg-orange-950/40',
      indigo: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
    };
    return colors[color] || colors.blue;
  };

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: 20, 
      scale: 0.95 
    },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  const contentVariants = {
    collapsed: { 
      height: 0, 
      opacity: 0 
    },
    expanded: { 
      height: "auto", 
      opacity: 1,
      transition: {
        height: {
          duration: 0.4,
          ease: [0.04, 0.62, 0.23, 0.98]
        },
        opacity: {
          duration: 0.3,
          delay: 0.1
        }
      }
    }
  };

  const buttonIconVariants = {
    closed: { 
      rotate: 0,
      scale: 1
    },
    open: { 
      rotate: 180,
      scale: 1.1,
      transition: {
        duration: 0.3,
        ease: "easeInOut"
      }
    }
  };

  return (
    <div className="space-y-4">
      {faqs.map((faq, index) => {
        const Icon = faq.icon;
        const colorClasses = getColorClasses(faq.color);
        
        return (
          <motion.div
            key={index}
            variants={itemVariants}
            className="group"
          >
            <motion.div
              className={`
                bg-card text-card-foreground backdrop-blur-sm rounded-2xl shadow-lg border border-border overflow-hidden
                transition-all duration-300 hover:shadow-xl hover:border-blue-400
                ${open === index ? 'border-blue-500 shadow-blue-500/20' : ''}
              `}
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.2 }}
            >
              <motion.button
                onClick={() => setOpen(open === index ? null : index)}
                className="w-full px-8 py-6 text-left flex items-center justify-between group focus:outline-none"
                whileHover={{ backgroundColor: "rgba(59, 130, 246, 0.05)" }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className={`p-3 rounded-lg ${colorClasses} flex-shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-lg font-semibold text-foreground group-hover:text-blue-500 transition-colors duration-300">
                    {faq.q}
                  </span>
                </div>
                <motion.div
                  variants={buttonIconVariants}
                  animate={open === index ? "open" : "closed"}
                  className="ml-4 flex-shrink-0"
                >
                  <svg 
                    className="w-6 h-6 text-blue-600" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M19 9l-7 7-7-7" 
                    />
                  </svg>
                </motion.div>
              </motion.button>
              
              <AnimatePresence>
                {open === index && (
                  <motion.div
                    initial="collapsed"
                    animate="expanded"
                    exit="collapsed"
                    variants={contentVariants}
                    className="overflow-hidden"
                  >
                    <div className="px-8 pb-6 pt-2 border-t border-border">
                      <motion.p 
                        className="text-muted-foreground leading-relaxed"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        {faq.a}
                      </motion.p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}
