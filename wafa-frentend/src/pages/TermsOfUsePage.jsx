import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { FileText, CheckCircle, XCircle, AlertTriangle, CreditCard, BookOpen, Users, Scale } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const TermsOfUsePage = () => {
  const { t } = useTranslation(['common']);

  const sections = [
    {
      icon: FileText,
      title: "1. Acceptation des Conditions",
      content: `En accédant à la plateforme WAFA et en l'utilisant, vous acceptez d'être lié par ces conditions d'utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser nos services.

Ces conditions s'appliquent à tous les utilisateurs de la plateforme, y compris les visiteurs, les utilisateurs enregistrés et les abonnés premium.

Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications seront effectives dès leur publication sur la plateforme. Votre utilisation continue après la publication constitue votre acceptation des nouvelles conditions.`
    },
    {
      icon: BookOpen,
      title: "2. Description des Services",
      content: `WAFA est une plateforme d'apprentissage en ligne dédiée aux étudiants en médecine. Nos services incluent :

• Accès à des QCM et examens blancs par module
• Suivi de progression et statistiques personnalisées
• Explications détaillées des réponses
• Résumés de cours et fiches de révision
• Système de classement (leaderboard) entre étudiants
• Notes personnelles et playlists de révision
• Support pédagogique

L'accès à certaines fonctionnalités peut nécessiter un abonnement premium.`
    },
    {
      icon: Users,
      title: "3. Inscription et Compte",
      content: `Pour utiliser nos services, vous devez :

• Être âgé d'au moins 16 ans
• Fournir des informations exactes et complètes lors de l'inscription
• Maintenir la confidentialité de vos identifiants de connexion
• Être responsable de toutes les activités sur votre compte
• Nous informer immédiatement de tout accès non autorisé

Un compte est strictement personnel et ne peut être partagé. Nous nous réservons le droit de suspendre ou supprimer tout compte en violation de ces conditions.`
    },
    {
      icon: CheckCircle,
      title: "4. Utilisation Acceptable",
      content: `En utilisant WAFA, vous vous engagez à :

✓ Utiliser la plateforme uniquement à des fins éducatives personnelles
✓ Respecter les droits de propriété intellectuelle
✓ Maintenir un comportement respectueux envers les autres utilisateurs
✓ Signaler tout contenu inapproprié ou erreur via le système de report
✓ Fournir des retours constructifs pour améliorer la plateforme
✓ Respecter les règles du système de points et du classement`
    },
    {
      icon: XCircle,
      title: "5. Utilisations Interdites",
      content: `Il est strictement interdit de :

✗ Partager, revendre ou distribuer le contenu de la plateforme
✗ Copier ou reproduire les questions, explications ou résumés
✗ Utiliser des scripts, bots ou outils automatisés
✗ Tenter de contourner les mesures de sécurité
✗ Créer plusieurs comptes pour manipuler le classement
✗ Publier du contenu offensant, diffamatoire ou illégal
✗ Utiliser la plateforme à des fins commerciales non autorisées
✗ Perturber le fonctionnement normal de la plateforme

Toute violation peut entraîner la suspension immédiate de votre compte.`
    },
    {
      icon: CreditCard,
      title: "6. Abonnements et Paiements",
      content: `Conditions des abonnements premium :

• Les paiements sont traités de manière sécurisée via PayPal
• Les abonnements sont facturés selon la période choisie (mensuel/annuel)
• Le renouvellement est automatique sauf annulation préalable
• Vous pouvez annuler à tout moment depuis votre profil
• L'accès premium reste actif jusqu'à la fin de la période payée

Politique de remboursement :
• Remboursement possible dans les 14 jours suivant l'achat
• Aucun remboursement après utilisation significative des services
• Les demandes de remboursement doivent être adressées à billing@wafa.com`
    },
    {
      icon: Scale,
      title: "7. Propriété Intellectuelle",
      content: `Tous les contenus de la plateforme WAFA sont protégés :

• Les questions, réponses et explications sont notre propriété exclusive
• Les résumés et fiches de cours sont protégés par le droit d'auteur
• Le logo, le design et la marque WAFA sont des marques déposées
• Les algorithmes et le code source sont propriétaires

Vous bénéficiez d'une licence personnelle, non-exclusive et non-transférable pour utiliser le contenu à des fins d'apprentissage personnel uniquement.`
    },
    {
      icon: AlertTriangle,
      title: "8. Limitation de Responsabilité",
      content: `WAFA fournit ses services "en l'état" :

• Nous ne garantissons pas que le service sera ininterrompu ou sans erreur
• Le contenu est fourni à titre informatif et ne remplace pas l'enseignement officiel
• Nous ne sommes pas responsables des résultats à vos examens réels
• Nous nous efforçons de maintenir des contenus à jour mais ne garantissons pas leur exactitude à 100%
• En aucun cas, WAFA ne sera responsable des dommages indirects

Nous nous réservons le droit de modifier, suspendre ou interrompre tout aspect du service.`
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 mb-4">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Conditions d'Utilisation
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </motion.div>

        {/* Important Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-8 border-l-4 border-l-amber-500 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-800 mb-1">Important</h3>
                  <p className="text-amber-700 text-sm">
                    En créant un compte ou en utilisant nos services, vous confirmez avoir lu, compris 
                    et accepté ces conditions d'utilisation dans leur intégralité. Ces conditions 
                    constituent un accord juridiquement contraignant entre vous et WAFA.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <section.icon className="w-5 h-5 text-indigo-600" />
                    </div>
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground whitespace-pre-line leading-relaxed">
                    {section.content}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Final Agreement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8"
        >
          <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0">
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-4" />
                <h3 className="font-bold text-xl mb-2">Accord Final</h3>
                <p className="text-indigo-100 max-w-2xl mx-auto">
                  En utilisant WAFA, vous reconnaissez avoir lu et accepté ces conditions d'utilisation 
                  ainsi que notre politique de confidentialité. Pour toute question, contactez-nous à{' '}
                  <a href="mailto:legal@wafa.com" className="underline font-semibold text-white">
                    legal@wafa.com
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Contact Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8 text-center space-y-2"
        >
          <p className="text-sm text-muted-foreground">
            <strong>WAFA</strong> - Plateforme d'apprentissage médical
          </p>
          <p className="text-sm text-gray-500">
            Email : contact@wafa.com | Support : support@wafa.com
          </p>
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} WAFA. Tous droits réservés.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default TermsOfUsePage;
