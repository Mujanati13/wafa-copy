import React from 'react'
import { motion } from 'framer-motion'
import { FaUniversity, FaWhatsapp, FaMoneyBillWave, FaCreditCard, FaClock, FaUserCheck, FaIdCard, FaExclamationTriangle } from 'react-icons/fa'
import { BiSolidBadgeCheck } from 'react-icons/bi'

const PaymentMethodsSection = () => {
  const paymentMethods = [
    {
      icon: FaUniversity,
      title: "Transfert Direct par Compte Bancaire",
      description: "Vous pouvez transférer le montant directement depuis votre application bancaire vers l'un de nos comptes",
      details: [
        "Transfert entre différentes banques possible via votre app bancaire",
        "Le nom sur le virement doit correspondre à celui de votre compte sur notre plateforme",
        "Activation sous 24H Inchallah (délai étendu à 48H lors des fortes sollicitations)"
      ],
      color: "from-blue-500 to-blue-600",
      bgGradient: "from-blue-50 to-blue-100",
      highlight: true
    },
    {
      icon: FaWhatsapp,
      title: "Contact puis Transfert",
      description: "Contactez-nous sur WhatsApp pour finaliser votre commande et obtenir tous les détails",
      details: [
        "Contactez-nous sur WhatsApp pour finaliser votre commande",
        "Procédez au paiement pour valider et expédier votre commande",
        "Activation sous 24H Inchallah (délai étendu à 48H lors des fortes sollicitations)"
      ],
      color: "from-green-500 to-green-600",
      bgGradient: "from-green-50 to-green-100",
      highlight: false
    },
    {
      icon: FaMoneyBillWave,
      title: "Paiement par Cash",
      description: "Vous pouvez nous contacter par WhatsApp pour donner le paiement en personne",
      details: [
        "Veuillez transmettre votre carte d'étudiant pour vérification",
        "Les paiements ne sont possibles que les lundis et jeudis",
        "Activation sous 24H Inchallah (délai étendu à 48H lors des fortes sollicitations)"
      ],
      color: "from-emerald-500 to-emerald-600",
      bgGradient: "from-emerald-50 to-emerald-100",
      highlight: false
    },
    {
      icon: FaCreditCard,
      title: "Paiement par Carte Débit",
      description: "Paiement direct avec activation immédiate de votre compte",
      details: [
        "Pour l'un des deux plans tarifaires : +30 DH pour la transaction",
        "Paiement direct + activation directe de votre compte",
        "Traitement instantané et sécurisé"
      ],
      color: "from-purple-500 to-purple-600",
      bgGradient: "from-purple-50 to-purple-100",
      highlight: false
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 50,
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

  return (
    <section id="payment-methods" className="py-20 px-6 bg-background relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-50/10 to-transparent"></div>
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-100/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-green-100/10 rounded-full blur-3xl"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: -50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <motion.div 
            className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-950/40 backdrop-blur-sm rounded-full px-6 py-3 mb-6 border border-blue-200 dark:border-blue-800 shadow-sm"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <BiSolidBadgeCheck className="text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">Modes de Paiement</span>
          </motion.div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Choisissez votre <span className="text-blue-600 dark:text-blue-400">mode de paiement</span><br />
            préféré
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Nous proposons plusieurs options de paiement flexibles pour répondre à tous vos besoins
          </p>
        </motion.div>
        
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {paymentMethods.map((method, i) => {
            const IconComponent = method.icon;
            return (
              <motion.div
                key={i}
                variants={cardVariants}
                whileHover={{ 
                  scale: 1.02,
                  transition: { duration: 0.2 }
                }}
                className="group relative"
              >
                <div className={`
                  bg-card text-card-foreground backdrop-blur-xl rounded-3xl p-8 border transition-all duration-500 shadow-lg hover:shadow-xl h-full
                  ${method.highlight 
                    ? "border-blue-400 shadow-blue-500/10" 
                    : "border-border hover:border-blue-400"
                  }
                `}>
                  {/* Animated background overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${method.bgGradient} rounded-3xl opacity-0 group-hover:opacity-10 dark:group-hover:opacity-5 transition-opacity duration-500`}></div>
                  
                  <div className="relative z-10">
                    {method.highlight && (
                      <motion.div 
                        className="absolute -top-4 -right-4"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                      >
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-bold shadow-lg">
                          <FaExclamationTriangle className="text-xs" />
                          ATTENTION
                        </span>
                      </motion.div>
                    )}
                    
                    <div className="flex items-center gap-4 mb-6">
                      <motion.div
                        className={`flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${method.color} shadow-lg`}
                        whileHover={{ rotate: 5 }}
                        transition={{ duration: 0.3 }}
                      >
                        <IconComponent className="text-2xl text-white" />
                      </motion.div>
                      <h3 className="text-xl font-bold text-foreground flex-1">{method.title}</h3>
                    </div>
                    
                    <p className="text-muted-foreground mb-6 leading-relaxed">
                      {method.description}
                    </p>
                    
                    <ul className="space-y-3">
                      {method.details.map((detail, idx) => (
                        <motion.li 
                          key={idx} 
                          className="flex items-start gap-3 text-foreground"
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          viewport={{ once: true }}
                        >
                          <motion.div
                            className={`flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br ${method.color} flex items-center justify-center mt-0.5`}
                            whileHover={{ scale: 1.2 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </motion.div>
                          <span className="text-sm text-foreground transition-colors duration-300">
                            {detail}
                          </span>
                        </motion.li>
                      ))}
                    </ul>
                    
                    {/* Special icons for specific payment methods */}
                    <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border">
                      {method.title.includes("Transfert") && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <FaClock className="text-blue-500" />
                          <span>24-48H</span>
                        </div>
                      )}
                      {method.title.includes("Cash") && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <FaIdCard className="text-emerald-500" />
                          <span>Carte étudiant requise</span>
                        </div>
                      )}
                      {method.title.includes("WhatsApp") && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <FaWhatsapp className="text-green-500" />
                          <span>Contact WhatsApp</span>
                        </div>
                      )}
                      {method.title.includes("Carte") && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <FaUserCheck className="text-purple-500" />
                          <span>Activation instantanée</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
        
        <motion.div 
          className="text-center mt-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <div className="bg-blue-50 dark:bg-blue-950/40 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
            <h4 className="text-lg font-bold text-blue-900 dark:text-blue-200 mb-2">
              Information Importante
            </h4>
            <p className="text-blue-700 dark:text-blue-300 text-sm">
              Pour toute question concernant les modes de paiement, n'hésitez pas à nous contacter. 
              Nous sommes là pour vous accompagner dans votre processus d'achat.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default PaymentMethodsSection