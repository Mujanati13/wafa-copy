import React from 'react'
import { motion } from 'framer-motion'
import { FaUserGraduate, FaHeart, FaStar, FaQuoteLeft } from 'react-icons/fa'
import { BsShieldCheck } from 'react-icons/bs'
import { AiFillThunderbolt } from 'react-icons/ai'

const TestimonialsSection = () => {
  
const testimonials = [
  {
    name: "Sara B.",
    text: "WAFA m'a aidée à réussir mes examens avec moins de stress! Les QCM sont excellents.",
    icon: FaUserGraduate,
    rating: 5,
    role: "Étudiante en médecine",
    color: "from-blue-500 to-blue-600"
  },
  {
    name: "Yassine M.",
    text: "L'organisation par matière et les statistiques m'ont permis d'optimiser mes révisions.",
    icon: AiFillThunderbolt,
    rating: 5,
    role: "Étudiant en pharmacie",
    color: "from-teal-500 to-teal-600"
  },
  {
    name: "Imane K.",
    text: "Le rapport qualité/prix est imbattable. Je recommande à tous les étudiants en médecine!",
    icon: BsShieldCheck,
    rating: 5,
    role: "Étudiante en dentaire",
    color: "from-indigo-500 to-indigo-600"
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1
    }
  }
};

const cardVariants = {
  hidden: { 
    opacity: 0, 
    y: 50,
    scale: 0.9
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
   <section className="py-24 px-6 bg-background relative overflow-hidden">
     {/* Background decoration */}
     <div className="absolute inset-0 bg-gradient-to-r from-blue-100/10 to-teal-100/10"></div>
     <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-100/10 rounded-full blur-3xl"></div>
     <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-100/10 rounded-full blur-3xl"></div>
     
     <div className="max-w-7xl mx-auto relative z-10">
       <motion.div
         variants={titleVariants}
         initial="hidden"
         whileInView="visible"
         viewport={{ once: true, amount: 0.3 }}
         className="text-center mb-20"
       >
       
         <h2 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
           Ce que disent nos <span className="text-blue-600 dark:text-blue-400">étudiants</span>
         </h2>
         <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
           Découvrez comment WAFA transforme l'expérience d'apprentissage de milliers d'étudiants en médecine
         </p>
       </motion.div>

       <motion.div 
         variants={containerVariants}
         initial="hidden"
         whileInView="visible"
         viewport={{ once: true, amount: 0.2 }}
         className="grid grid-cols-1 md:grid-cols-3 gap-8"
       >
         {testimonials.map((testimonial, index) => {
           const IconComponent = testimonial.icon;
           return (
             <motion.div 
               key={index}
               variants={cardVariants}
               whileHover={{ 
                 scale: 1.05,
                 y: -10,
                 transition: { duration: 0.3 }
               }}
               className="group relative"
             >
               {/* Card glow effect */}
               <div className={`absolute -inset-1 bg-gradient-to-r ${testimonial.color} rounded-3xl blur opacity-10 group-hover:opacity-25 transition duration-1000 group-hover:duration-200`}></div>
               
               <div className="relative bg-card text-card-foreground backdrop-blur-xl rounded-3xl p-8 border border-border group-hover:border-blue-400 transition-all duration-500 h-full shadow-lg hover:shadow-xl">
                 {/* Quote icon */}
                 <div className="absolute top-6 right-6">
                   <FaQuoteLeft className="text-3xl text-blue-200/40" />
                 </div>

                 {/* Icon and user info */}
                 <div className="flex items-center mb-8">
                   <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${testimonial.color} p-0.5 mr-5`}>
                     <div className="w-full h-full bg-card rounded-2xl flex items-center justify-center">
                       <IconComponent className="text-2xl text-blue-600 dark:text-blue-400" />
                     </div>
                   </div>
                   <div>
                     <div className="font-bold text-xl text-foreground mb-1">{testimonial.name}</div>
                     <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">{testimonial.role}</div>
                   </div>
                 </div>

                 {/* Stars rating */}
                 <div className="flex mb-6">
                   {[...Array(testimonial.rating)].map((_, i) => (
                     <motion.div
                       key={i}
                       initial={{ opacity: 0, scale: 0 }}
                       whileInView={{ opacity: 1, scale: 1 }}
                       transition={{ delay: 0.1 * i, duration: 0.3 }}
                       viewport={{ once: true }}
                     >
                       <FaStar className="text-yellow-400 text-lg mr-1" />
                     </motion.div>
                   ))}
                 </div>

                 {/* Testimonial text */}
                 <p className="text-muted-foreground leading-relaxed text-lg font-medium">
                   "{testimonial.text}"
                 </p>

                 {/* Bottom accent */}
                 <div className={`mt-8 h-1 bg-gradient-to-r ${testimonial.color} rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500`}></div>
               </div>
             </motion.div>
           );
         })}
       </motion.div>

       {/* Call to action */}
       <motion.div 
         initial={{ opacity: 0, y: 30 }}
         whileInView={{ opacity: 1, y: 0 }}
         transition={{ duration: 0.8, delay: 0.6 }}
         viewport={{ once: true }}
         className="text-center mt-16"
       >
         <motion.button
           whileHover={{ scale: 1.05 }}
           whileTap={{ scale: 0.95 }}
           className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-all duration-300 transform hover:shadow-blue-500/25"
         >
           Rejoignez-nous dès aujourd'hui
         </motion.button>
       </motion.div>
     </div>
   </section>
  )
}

export default TestimonialsSection