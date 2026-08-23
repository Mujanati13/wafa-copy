import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiMessageCircle, FiSend, FiStar, FiHeart, FiMail, FiUser, FiCheck } from 'react-icons/fi'
import { BiLike } from 'react-icons/bi'
import axios from 'axios'

const FeedbackSection = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState(null) // 'success' | 'error'
  const [showForm, setShowForm] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus(null)

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/contact`, formData)
      setSubmitStatus('success')
      setFormData({ name: '', email: '', message: '' })
      setTimeout(() => {
        setShowForm(false)
        setSubmitStatus(null)
      }, 3000)
    } catch (error) {
      console.error('Error submitting feedback:', error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  }

  const floatingIcons = [
    { Icon: FiStar, delay: 0, x: -20, y: -30 },
    { Icon: FiHeart, delay: 0.5, x: 30, y: -20 },
    { Icon: BiLike, delay: 1, x: -30, y: 20 },
    { Icon: FiMessageCircle, delay: 1.5, x: 25, y: 25 }
  ]

  return (
    <section className="py-20 px-6 bg-background relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            rotate: 360,
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -top-10 -right-10 w-40 h-40 bg-blue-100/10 rounded-full blur-xl"
        />
        <motion.div
          animate={{
            rotate: -360,
            scale: [1, 1.2, 1]
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -bottom-10 -left-10 w-32 h-32 bg-teal-100/10 rounded-full blur-xl"
        />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        className="max-w-4xl mx-auto text-center relative z-10"
      >
        {/* Floating feedback icons */}
        <div className="relative">
          {floatingIcons.map(({ Icon, delay, x, y }, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 1, 0.8, 1],
                scale: [0, 1.2, 1],
                x: [0, x, 0],
                y: [0, y, 0]
              }}
              transition={{
                duration: 3,
                delay: delay,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut"
              }}
              className="absolute text-blue-400/40 text-2xl"
              style={{
                left: `${20 + index * 20}%`,
                top: `${10 + (index % 2) * 80}%`
              }}
            >
              <Icon />
            </motion.div>
          ))}
        </div>

        {/* Main content */}
        <motion.div variants={itemVariants} className="relative">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            whileInView={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="inline-flex items-center justify-center w-20 h-20 bg-blue-50 dark:bg-blue-950/40 rounded-full mb-6 shadow-lg border border-blue-200 dark:border-blue-800"
          >
            <FiMessageCircle className="text-4xl text-blue-600 dark:text-blue-400" />
          </motion.div>
        </motion.div>

        <motion.h2
          variants={itemVariants}
          className="text-4xl md:text-6xl font-bold mb-6 text-foreground"
        >
          Nous voulons vos <span className="text-blue-600 dark:text-blue-400">retours</span>
        </motion.h2>

        <motion.p
          variants={itemVariants}
          className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed"
        >
          Aidez-nous à améliorer YourQCM en partageant vos pensées et suggestions.
          Votre contribution alimente notre innovation.
        </motion.p>

        {/* Form or Buttons */}
        <AnimatePresence mode="wait">
          {!showForm ? (
            <motion.div
              key="buttons"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <motion.button
                whileHover={{
                  scale: 1.05,
                  boxShadow: "0 20px 40px rgba(59, 130, 246, 0.25)"
                }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowForm(true)}
                className="group bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-bold text-lg shadow-lg transition-all duration-300 flex items-center gap-3 min-w-[200px] justify-center relative overflow-hidden"
              >
                <motion.div
                  whileHover={{ x: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  <FiSend className="text-xl" />
                </motion.div>
                <span>Donner votre avis</span>

                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  initial={false}
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                />
              </motion.button>

              <motion.button
                whileHover={{
                  scale: 1.05,
                  borderColor: "rgb(59, 130, 246)"
                }}
                whileTap={{ scale: 0.98 }}
                className="border-2 border-border text-foreground hover:text-blue-500 px-8 py-4 rounded-lg font-bold text-lg transition-all duration-300 flex items-center gap-3 min-w-[200px] justify-center bg-card shadow-md"
              >
                <FiStar className="text-xl" />
                <span>Évaluer l'app</span>
              </motion.button>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              onSubmit={handleSubmit}
              className="max-w-2xl mx-auto bg-card text-card-foreground p-8 rounded-2xl shadow-2xl border border-border"
            >
              {submitStatus === 'success' ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-center py-8"
                >
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiCheck className="text-3xl text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">Merci pour votre retour!</h3>
                  <p className="text-muted-foreground">Nous avons reçu votre message et vous répondrons bientôt.</p>
                </motion.div>
              ) : (
                <>
                  <div className="space-y-6">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                        <FiUser className="text-blue-600 dark:text-blue-400" />
                        Nom
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Votre nom"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                        <FiMail className="text-blue-600 dark:text-blue-400" />
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="votre@email.com"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                        <FiMessageCircle className="text-blue-600 dark:text-blue-400" />
                        Message
                      </label>
                      <textarea
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        rows="5"
                        className="w-full px-4 py-3 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                        placeholder="Partagez vos pensées, suggestions ou questions..."
                      />
                    </div>

                    {submitStatus === 'error' && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm"
                      >
                        Une erreur s'est produite. Veuillez réessayer.
                      </motion.div>
                    )}
                  </div>

                  <div className="flex gap-4 mt-8">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      disabled={isSubmitting}
                      className="flex-1 px-6 py-3 border-2 border-border text-foreground rounded-lg font-semibold hover:bg-accent transition-all disabled:opacity-50"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Envoi...</span>
                        </>
                      ) : (
                        <>
                          <FiSend />
                          <span>Envoyer</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </motion.form>
          )}
        </AnimatePresence>

        {/* Testimonial preview cards */}
        {!showForm && (
          <motion.div
            variants={itemVariants}
            className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto"
          >
            {[
              { text: "Interface intuitive", author: "Sarah M." },
              { text: "Très utile au quotidien", author: "Ahmed K." },
              { text: "Design moderne", author: "Marie L." }
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                whileHover={{ y: -5, scale: 1.02 }}
                className="bg-card text-card-foreground border border-border rounded-xl p-4 text-center shadow-lg"
              >
                <div className="flex justify-center mb-2">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 + i * 0.1 }}
                    >
                      <FiStar className="text-yellow-400 fill-current text-sm" />
                    </motion.div>
                  ))}
                </div>
                <p className="text-foreground font-medium text-sm mb-2">"{testimonial.text}"</p>
                <p className="text-blue-600 dark:text-blue-400 text-xs font-semibold">- {testimonial.author}</p>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </section>
  )
}

export default FeedbackSection