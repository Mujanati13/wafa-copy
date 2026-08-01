import React from 'react'
import { motion } from 'framer-motion'
import { FaBookOpen, FaRobot, FaList, FaChartLine, FaArrowRight, FaStickyNote, FaShieldAlt } from 'react-icons/fa'
import { BiSolidBadgeCheck } from 'react-icons/bi'

const SolutionsSection = () => {
  // 6 Features total - all should be displayed
  const features = [
    {
      icon: FaShieldAlt, // Platforme stable: use a security/shield icon
      title: "Plateforme stable",
      desc: "Nous vous offrons une plateforme sécurisée et fiable. Toutes vos données ne seront montrées à personne.",
      color: "from-blue-500 to-blue-600",
      bgGradient: "from-blue-50 to-blue-100",
    },
    {
      icon: FaChartLine, // Classement direct: use a ranking/performance icon
      title: "Classement direct",
      desc: "Suivez vos performances et évaluez votre niveau parmi les meilleurs.",
      color: "from-teal-500 to-teal-600",
      bgGradient: "from-teal-50 to-teal-100",
    },
    {
      icon: BiSolidBadgeCheck, // En perpétuelle amélioration: use a badge/check icon
      title: "En perpétuelle amélioration",
      desc: "Nous sommes toujours à l'écoute de nos utilisateurs et nous améliorons constamment la plateforme.",
      color: "from-indigo-500 to-indigo-600",
      bgGradient: "from-indigo-50 to-indigo-100",
    },
    {
      icon: FaBookOpen, // Surligneur: use a book/open-book icon
      title: "Surligneur",
      desc: "Mets en évidence ce qui est important.",
      color: "from-yellow-500 to-yellow-600",
      bgGradient: "from-yellow-50 to-yellow-100",
    },
    {
      icon: FaList, // Playlists: use a list icon
      title: "Playlists",
      desc: "Organise-toi pour la dernière couche.",
      color: "from-pink-500 to-pink-600",
      bgGradient: "from-pink-50 to-pink-100",
    },
    {
      icon: FaStickyNote, // Notes personnelles: use a note icon
      title: "Notes personnelles",
      desc: "Tu ne risques plus de perdre tes pensées.",
      color: "from-green-500 to-green-600",
      bgGradient: "from-green-50 to-green-100",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
        when: "beforeChildren"
      }
    }
  };

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: 30,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    }
  };

  const titleVariants = {
    hidden: { opacity: 0, y: -30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };
  
  return (
    <section id="features" className="py-24 px-6 bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-50/10 to-transparent"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-100/10 rounded-full blur-3xl"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div 
          className="text-center mb-20"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={titleVariants}
        >
          <motion.div 
            className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-950/40 backdrop-blur-sm rounded-full px-6 py-3 mb-6 border border-blue-200 dark:border-blue-800 shadow-sm"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <BiSolidBadgeCheck className="text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">A propos</span>
          </motion.div>
          
          <h2 className="text-5xl md:text-6xl font-bold mb-6 text-foreground">
            Formation Médicale <span className="text-blue-600 dark:text-blue-400">Complète</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            Perfectionnez votre formation médicale avec des outils de pointe 
            conçus pour la préparation des examens
          </p>
        </motion.div>
        
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 w-full"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Rendering all 6 features in a responsive grid layout */}
          {features.map((feature, i) => {
            const IconComponent = feature.icon;
            return (
              <div
                key={i}
                className="group relative"
              >
                <div className={`relative bg-card text-card-foreground backdrop-blur-xl rounded-3xl p-8 border border-border hover:border-blue-400 transition-all duration-500 h-full shadow-lg hover:shadow-xl`}>
                  {/* Gradient background overlay on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.bgGradient} rounded-3xl opacity-0 group-hover:opacity-10 dark:group-hover:opacity-5 transition-opacity duration-500`}></div>
                  
                  {/* Content */}
                  <div className="relative z-10">
                    <div 
                      className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.color} mb-6 shadow-lg`}
                    >
                      <IconComponent className="text-2xl text-white" />
                    </div>
                    
                    <h3 className="text-2xl font-bold mb-4 text-foreground transition-colors duration-300">
                      {feature.title}
                    </h3>
                    
                    <p className="text-muted-foreground leading-relaxed mb-6 transition-colors duration-300">
                      {feature.desc}
                    </p>
                    
                    <div 
                      className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium group-hover:text-blue-500 transition-colors duration-300"
                    >
                      <span>En savoir plus</span>
                      <FaArrowRight className="text-sm" />
                    </div>
                  </div>
                  
                  {/* Shine effect */}
                  <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-all duration-1000"></div>
                </div>
              </div>
            );
          })}
        </motion.div>
        
     
      </div>
    </section>
  )
}

export default SolutionsSection