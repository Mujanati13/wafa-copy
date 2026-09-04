import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Shield, Save, Loader2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const PrivacyPolicyAdmin = () => {
  const [content, setContent] = useState('');
  const [termsContent, setTermsContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTerms, setSavingTerms] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [lastSavedTerms, setLastSavedTerms] = useState(null);

  useEffect(() => {
    fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    try {
      setLoading(true);
      const [policyResponse, termsResponse] = await Promise.all([
        axios.get(`${API_URL}/settings/privacy-policy`, { withCredentials: true }),
        axios.get(`${API_URL}/settings/terms-of-use`, { withCredentials: true })
      ]);

      if (policyResponse.data.success) {
        setContent(policyResponse.data.data?.content || '');
        setLastSaved(policyResponse.data.data?.updatedAt);
      }

      if (termsResponse.data.success) {
        setTermsContent(termsResponse.data.data?.content || '');
        setLastSavedTerms(termsResponse.data.data?.updatedAt);
      }
    } catch (error) {
      console.error('Error fetching policies:', error);
      // If no policy exists yet, start with default content
      setContent(getDefaultContent());
      setTermsContent(getDefaultTermsContent());
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await axios.put(
        `${API_URL}/settings/privacy-policy`,
        { content },
        { withCredentials: true }
      );

      if (response.data.success) {
        toast.success('Politique de confidentialité enregistrée avec succès');
        setLastSaved(new Date().toISOString());
      }
    } catch (error) {
      console.error('Error saving privacy policy:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTerms = async () => {
    try {
      setSavingTerms(true);
      const response = await axios.put(
        `${API_URL}/settings/terms-of-use`,
        { content: termsContent },
        { withCredentials: true }
      );

      if (response.data.success) {
        toast.success('Conditions d\'utilisation enregistrées avec succès');
        setLastSavedTerms(new Date().toISOString());
      }
    } catch (error) {
      console.error('Error saving terms of use:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSavingTerms(false);
    }
  };

  const getDefaultContent = () => {
    return `# Politique de Confidentialité - YourQCM

Dernière mise à jour : ${new Date().toLocaleDateString('fr-FR')}

## 1. Introduction

Bienvenue sur YourQCM. Nous nous engageons à protéger votre vie privée et vos données personnelles.

## 2. Collecte de Données

Nous collectons les informations suivantes :
- Nom et prénom
- Adresse e-mail
- Informations d'authentification
- Données d'utilisation de la plateforme

## 3. Utilisation des Données

Vos données sont utilisées pour :
- Fournir et améliorer nos services
- Personnaliser votre expérience
- Communiquer avec vous
- Assurer la sécurité de la plateforme

## 4. Conditions de l'Utilisation

En utilisant la plateforme YourQCM, vous acceptez les conditions suivantes :

### Utilisation Acceptable
- Utiliser la plateforme uniquement à des fins éducatives personnelles
- Respecter les droits de propriété intellectuelle
- Maintenir un comportement respectueux envers les autres utilisateurs
- Signaler tout contenu inapproprié ou erreur
- Respecter les règles du système de points et du classement

### Utilisations Interdites
- Partager, revendre ou distribuer le contenu de la plateforme
- Copier ou reproduire les questions, explications ou résumés
- Utiliser des scripts, bots ou outils automatisés
- Tenter de contourner les mesures de sécurité
- Créer plusieurs comptes pour manipuler le classement
- Publier du contenu offensant, diffamatoire ou illégal

### Compte Utilisateur
- Un compte est strictement personnel et ne peut être partagé
- Vous êtes responsable de la confidentialité de vos identifiants
- Toute violation peut entraîner la suspension de votre compte

## 5. Sécurité

Nous mettons en œuvre des mesures de sécurité appropriées pour protéger vos données.

## 6. Vos Droits

Vous avez le droit de :
- Accéder à vos données
- Rectifier vos données
- Supprimer vos données
- Vous opposer au traitement

## 7. Cookies

Nous utilisons des cookies pour améliorer votre expérience.

## 8. Abonnements et Paiements

- Les paiements sont traités de manière sécurisée via PayPal
- Les abonnements sont facturés selon la période choisie
- Le renouvellement est automatique sauf annulation préalable
- Remboursement possible dans les 14 jours suivant l'achat

## 9. Contact

Pour toute question concernant cette politique, contactez-nous à : contact@yourqcm.online
`;
  };

  const getDefaultTermsContent = () => {
    return `# Conditions d'Utilisation - YourQCM

Dernière mise à jour : ${new Date().toLocaleDateString('fr-FR')}

## 1. Acceptation des Conditions

En utilisant la plateforme YourQCM, vous acceptez les présentes conditions d'utilisation dans leur intégralité.

## 2. Utilisation Acceptable

### Droits d'Utilisation
- Utiliser la plateforme uniquement à des fins éducatives personnelles
- Accéder au contenu dans le cadre de votre abonnement actif
- Respecter les droits de propriété intellectuelle de YourQCM

### Comportement sur la Plateforme
- Maintenir un comportement respectueux envers les autres utilisateurs
- Signaler tout contenu inapproprié ou erreur que vous rencontrez
- Respecter les règles du système de points et du classement
- Participer de manière constructive aux discussions et contributions

## 3. Utilisations Interdites

Les actions suivantes sont strictement interdites :

### Protection du Contenu
- Partager, revendre ou distribuer le contenu de la plateforme
- Copier, reproduire ou télécharger massivement les questions, explications ou résumés
- Prendre des captures d'écran ou enregistrements pour redistribution
- Utiliser le contenu en dehors de la plateforme sans autorisation écrite

### Sécurité et Intégrité
- Utiliser des scripts, bots ou outils automatisés
- Tenter de contourner les mesures de sécurité ou les restrictions d'accès
- Créer plusieurs comptes pour manipuler le classement ou obtenir des avantages déloyaux
- Tenter d'accéder à des zones non autorisées de la plateforme

### Contenu Approprié
- Publier du contenu offensant, diffamatoire ou illégal
- Harceler ou intimider d'autres utilisateurs
- Partager des informations fausses ou trompeuses

## 4. Compte Utilisateur

### Responsabilités
- Un compte est strictement personnel et ne peut être partagé
- Vous êtes responsable de la confidentialité de vos identifiants
- Vous devez fournir des informations exactes lors de l'inscription
- Vous devez mettre à jour vos informations en cas de changement

### Violations
Toute violation des présentes conditions peut entraîner :
- Un avertissement
- Une suspension temporaire de votre compte
- Une suppression définitive de votre compte
- Des poursuites judiciaires si applicable

## 5. Propriété Intellectuelle

Tout le contenu présent sur YourQCM (questions, explications, résumés, graphiques, etc.) est protégé par le droit d'auteur et appartient à YourQCM ou à ses partenaires.

## 6. Abonnements et Paiements

### Modalités de Paiement
- Les paiements sont traités de manière sécurisée via PayPal
- Les abonnements sont facturés par semestre
- Le renouvellement est automatique sauf annulation préalable
- Les prix peuvent être modifiés avec un préavis de 30 jours

### Remboursements
- Remboursement possible dans les 14 jours suivant le premier achat
- Aucun remboursement n'est accordé pour les renouvellements
- Les remboursements partiels ne sont pas disponibles

### Annulation
- Vous pouvez annuler votre abonnement à tout moment depuis votre profil
- L'accès reste actif jusqu'à la fin de la période payée
- Aucun remboursement au prorata n'est accordé en cas d'annulation

## 7. Limitation de Responsabilité

YourQCM ne peut être tenue responsable de :
- L'exactitude ou l'exhaustivité du contenu éducatif
- Toute perte ou dommage résultant de l'utilisation de la plateforme
- Les interruptions de service ou problèmes techniques

## 8. Modifications

Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications prennent effet dès leur publication sur la plateforme.

## 9. Contact

Pour toute question concernant ces conditions, contactez-nous à : contact@yourqcm.online
`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Politique de Confidentialité</h1>
          <p className="text-muted-foreground">
            Gérez le contenu de votre politique de confidentialité
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contenu de la Politique</CardTitle>
          <CardDescription>
            Rédigez votre politique de confidentialité en format Markdown.
            {lastSaved && (
              <span className="block mt-2 text-xs text-green-600">
                Dernière sauvegarde : {new Date(lastSaved).toLocaleString('fr-FR')}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content">Contenu (Markdown supporté)</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={20}
              className="font-mono text-sm"
              placeholder="Rédigez votre politique de confidentialité..."
            />
            <p className="text-xs text-muted-foreground">
              Utilisez Markdown pour formater le texte (# pour les titres, ** pour le gras, etc.)
            </p>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Enregistrer
            </Button>
            <Button variant="outline" asChild>
              <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">
                <Eye className="h-4 w-4 mr-2" />
                Prévisualiser
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Terms of Use Section */}
      <Card>
        <CardHeader>
          <CardTitle>Conditions d'Utilisation</CardTitle>
          <CardDescription>
            Gérez les conditions d'utilisation de votre plateforme.
            {lastSavedTerms && (
              <span className="block mt-2 text-xs text-green-600">
                Dernière sauvegarde : {new Date(lastSavedTerms).toLocaleString('fr-FR')}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="termsContent">Contenu (Markdown supporté)</Label>
            <Textarea
              id="termsContent"
              value={termsContent}
              onChange={(e) => setTermsContent(e.target.value)}
              rows={20}
              className="font-mono text-sm"
              placeholder="Rédigez vos conditions d'utilisation..."
            />
            <p className="text-xs text-muted-foreground">
              Utilisez Markdown pour formater le texte (# pour les titres, ** pour le gras, etc.)
            </p>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSaveTerms} disabled={savingTerms}>
              {savingTerms ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Mettre à jour
            </Button>
            <Button variant="outline" asChild>
              <a href="/terms-of-use" target="_blank" rel="noopener noreferrer">
                <Eye className="h-4 w-4 mr-2" />
                Prévisualiser
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-sm">Aide Markdown</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-1 font-mono">
          <p># Titre niveau 1</p>
          <p>## Titre niveau 2</p>
          <p>**Texte en gras**</p>
          <p>*Texte en italique*</p>
          <p>- Liste à puces</p>
          <p>[Lien](https://example.com)</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrivacyPolicyAdmin;
