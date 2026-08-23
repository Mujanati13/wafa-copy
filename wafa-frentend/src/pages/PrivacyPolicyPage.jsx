import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, Database, UserCheck, Mail, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const PrivacyPolicyPage = () => {
  const { t } = useTranslation(['common']);

  const sections = [
    {
      icon: Database,
      title: "Collecte des Données",
      content: `Nous collectons les informations que vous nous fournissez directement :
      
• Informations de compte : nom, prénom, adresse email, mot de passe crypté
• Informations de profil : université, faculté, année d'étude, photo de profil
• Données d'utilisation : progression dans les modules, résultats d'examens, temps d'étude
• Informations de paiement : traitées de manière sécurisée via PayPal (nous ne stockons pas vos données bancaires)

Les données sont collectées uniquement dans le but d'améliorer votre expérience d'apprentissage et de vous fournir nos services.`
    },
    {
      icon: Eye,
      title: "Utilisation des Données",
      content: `Nous utilisons vos données pour :

• Fournir et améliorer nos services éducatifs
• Personnaliser votre expérience d'apprentissage
• Suivre votre progression et générer des statistiques
• Vous envoyer des notifications importantes concernant votre compte
• Gérer votre abonnement et traiter les paiements
• Afficher votre classement dans le leaderboard (anonymisé si vous le souhaitez)
• Améliorer nos contenus pédagogiques basés sur les retours utilisateurs`
    },
    {
      icon: Lock,
      title: "Protection des Données",
      content: `La sécurité de vos données est notre priorité :

• Chiffrement SSL/TLS pour toutes les communications
• Mots de passe hashés avec des algorithmes sécurisés (bcrypt)
• Authentification sécurisée via Firebase Authentication
• Accès aux données limité au personnel autorisé
• Serveurs sécurisés avec sauvegardes régulières
• Conformité aux standards de sécurité modernes`
    },
    {
      icon: UserCheck,
      title: "Vos Droits",
      content: `Conformément à la réglementation en vigueur, vous disposez des droits suivants :

• Droit d'accès : consulter toutes vos données personnelles
• Droit de rectification : corriger vos informations inexactes
• Droit à l'effacement : demander la suppression de votre compte et données
• Droit à la portabilité : exporter vos données dans un format standard
• Droit d'opposition : vous opposer au traitement de vos données
• Droit de retrait : retirer votre consentement à tout moment

Pour exercer ces droits, contactez-nous à : privacy@wafa.com`
    },
    {
      icon: Shield,
      title: "Partage des Données",
      content: `Nous ne vendons jamais vos données personnelles. Nous partageons vos données uniquement avec :

• PayPal : pour le traitement sécurisé des paiements
• Firebase : pour l'authentification et les notifications
• Services d'hébergement : pour stocker vos données de manière sécurisée

Tous nos partenaires sont soumis à des obligations strictes de confidentialité.`
    },
    {
      icon: AlertTriangle,
      title: "Cookies et Traceurs",
      content: `Notre plateforme utilise des cookies essentiels pour :

• Maintenir votre session de connexion
• Sauvegarder vos préférences (langue, thème)
• Assurer la sécurité de votre compte
• Analyser l'utilisation de la plateforme (de manière anonyme)

Vous pouvez gérer vos préférences de cookies dans les paramètres de votre navigateur.`
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Politique de Confidentialité
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </motion.div>

        {/* Introduction */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-8">
            <CardContent className="pt-6">
              <p className="text-foreground leading-relaxed">
                Chez <strong>YourQCM</strong>, nous accordons une importance primordiale à la protection de vos données
                personnelles. Cette politique de confidentialité explique comment nous collectons, utilisons, 
                stockons et protégeons vos informations lorsque vous utilisez notre plateforme d'apprentissage 
                médical.
              </p>
              <p className="text-foreground leading-relaxed mt-4">
                En utilisant nos services, vous acceptez les pratiques décrites dans cette politique. 
                Nous vous encourageons à la lire attentivement.
              </p>
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
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <section.icon className="w-5 h-5 text-blue-600" />
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

        {/* Contact Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-sm text-gray-500 mt-8"
        >
          © {new Date().getFullYear()} YourQCM. Tous droits réservés.
        </motion.p>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
