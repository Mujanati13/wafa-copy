import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ArrowLeft, Loader2, Check, X, FileText } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { registerWithEmail, loginWithGoogle } from '@/services/authService';
import { userService } from '@/services/userService';
import AuthVisualPanel from './AuthVisualPanel';

const Register = () => {
  const { t } = useTranslation(['auth', 'common']);
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
    acceptPrivacy: false,
    newsletter: false
  });

  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const completeRegistration = async () => {
    toast.success('Compte créé avec succès', {
      description: 'Bienvenue sur YourQCM !',
    });

    try {
      const semesterStatus = await userService.checkFreeSemesterStatus();
      if (semesterStatus.data?.needsToSelectSemester) {
        navigate('/select-semester');
        return;
      }
    } catch (error) {
      console.error('Error checking semester status:', error);
    }

    navigate('/dashboard/home');
  };

  const checkPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'password') {
      setPasswordStrength(checkPasswordStrength(value));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error(t('common:error'), {
        description: t('auth:password_mismatch'),
      });
      return;
    }

    if (!formData.acceptTerms) {
      toast.error(t('common:error'), {
        description: "Veuillez accepter les conditions d'utilisation",
      });
      return;
    }

    if (!formData.acceptPrivacy) {
      toast.error(t('common:error'), {
        description: "Veuillez accepter la politique de confidentialité",
      });
      return;
    }

    setIsLoading(true);

    try {
      const userData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        newsletter: formData.newsletter
      };

      const result = await registerWithEmail(
        formData.email,
        formData.password,
        userData
      );

      if (result.needsVerification) {
        toast.success(t('auth:account_created'), {
          description: result.message || t('auth:email_verified'),
          duration: 5000,
        });

        // Redirect to Firebase email verification page
        navigate('/verify-email-firebase', { state: { email: formData.email } });
      } else {
        await completeRegistration();
      }
    } catch (error) {
      const errorMessage = error.message || 'Une erreur est survenue. Veuillez réessayer.';

      // Check if error mentions Google sign-in
      if (errorMessage.includes('Google') || errorMessage.includes('google')) {
        toast.error(t('auth:email_already_exists'), {
          description: errorMessage,
          duration: 6000,
          action: {
            label: t('auth:google_login'),
            onClick: () => handleGoogleSignUp()
          }
        });
      } else {
        toast.error(t('auth:authentication_error'), {
          description: errorMessage,
          duration: 5000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);

    try {
      const result = await loginWithGoogle();
      if (result?.user) {
        localStorage.setItem('user', JSON.stringify(result.user));
        localStorage.setItem('userProfile', JSON.stringify(result.user));
      }
      window.dispatchEvent(new Event('auth-state-changed'));

      await completeRegistration();
    } catch (error) {
      toast.error(t('auth:authentication_error'), {
        description: error.message || t('auth:authentication_error'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength === 0) return '';
    if (passwordStrength <= 2) return t('auth:weak');
    if (passwordStrength <= 3) return t('auth:medium');
    return t('auth:strong');
  };

  const passwordRequirements = [
    { met: formData.password.length >= 8, text: t('auth:password_min_8') },
    { met: /[A-Z]/.test(formData.password), text: t('auth:password_uppercase') },
    { met: /[a-z]/.test(formData.password), text: t('auth:password_lowercase') },
    { met: /[0-9]/.test(formData.password), text: t('auth:password_number') },
    { met: /[^A-Za-z0-9]/.test(formData.password), text: t('auth:password_special') },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-3 py-4 sm:px-4 sm:py-8">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-blue-100 rounded-full opacity-30 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-teal-100 rounded-full opacity-20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-blue-200 rounded-full opacity-25 blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>

      <div className="relative z-10 grid w-full max-w-7xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl lg:grid-cols-[minmax(520px,1.15fr)_minmax(0,0.85fr)]">
        <Motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="order-2 w-full self-center p-4 sm:p-8 lg:order-1 lg:p-10"
        >
        {/* Back Button - Top Left */}
        <Link
          to="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common:back')}
        </Link>

        {/* Register Card */}
        <Card className="shadow-2xl border-primary/10">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">{t('auth:register')}</CardTitle>
            <CardDescription>
              {t('auth:signup')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Nom"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="Prénom"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="email">{t('common:email')}</Label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder={t('auth:enter_email')}
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <Label htmlFor="password">{t('common:password')}</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>

                {/* Password Strength */}
                {formData.password && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {t('auth:password_strength')}: <span className={passwordStrength <= 2 ? 'text-red-500' : passwordStrength <= 3 ? 'text-yellow-500' : 'text-green-500'}>
                          {getPasswordStrengthText()}
                        </span>
                      </span>
                    </div>
                    <Progress value={passwordStrength * 20} className="h-2" />

                    {/* Requirements */}
                    <div className="space-y-1 text-xs">
                      {passwordRequirements.map((req, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          {req.met ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <X className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span className={req.met ? 'text-green-600' : 'text-muted-foreground'}>
                            {req.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('auth:confirm_password')}</Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-xs text-red-500">{t('auth:password_mismatch')}</p>
                )}
              </div>

              {/* Terms, Privacy & Newsletter */}
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="acceptTerms"
                    checked={formData.acceptTerms}
                    onCheckedChange={(checked) =>
                      setFormData(prev => ({ ...prev, acceptTerms: checked }))
                    }
                    disabled={isLoading}
                    className="mt-1"
                  />
                  <Label
                    htmlFor="acceptTerms"
                    className="text-sm font-normal cursor-pointer leading-tight"
                  >
                    J'accepte les{' '}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-primary hover:underline font-medium"
                    >
                      Conditions d'utilisation
                    </button>
                  </Label>
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="acceptPrivacy"
                    checked={formData.acceptPrivacy}
                    onCheckedChange={(checked) =>
                      setFormData(prev => ({ ...prev, acceptPrivacy: checked }))
                    }
                    disabled={isLoading}
                    className="mt-1"
                  />
                  <Label
                    htmlFor="acceptPrivacy"
                    className="text-sm font-normal cursor-pointer leading-tight"
                  >
                    J'accepte la{' '}
                    <button
                      type="button"
                      onClick={() => setShowPrivacyModal(true)}
                      className="text-primary hover:underline font-medium"
                    >
                      Politique de confidentialité
                    </button>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="newsletter"
                    checked={formData.newsletter}
                    onCheckedChange={(checked) =>
                      setFormData(prev => ({ ...prev, newsletter: checked }))
                    }
                    disabled={isLoading}
                  />
                  <Label
                    htmlFor="newsletter"
                    className="text-sm font-normal cursor-pointer"
                  >
                    {t('auth:newsletter')}
                  </Label>
                </div>
              </div>

              {/* Register Button */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('auth:register')}...
                  </>
                ) : (
                  t('auth:register')
                )}
              </Button>

              {/* Divider */}
              <div className="relative my-6">
                <Separator />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="bg-card px-2 text-xs text-muted-foreground">
                    {t('auth:or_continue_with')}
                  </span>
                </div>
              </div>

              {/* Google Sign Up Button */}
              <Button
                variant="outline"
                type="button"
                disabled={isLoading}
                onClick={handleGoogleSignUp}
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <FcGoogle className="mr-2 h-5 w-5" />
                )}
                {t('auth:google_login')}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Separator />
            <div className="text-center text-sm">
              <span className="text-muted-foreground">{t('auth:already_have_account')} </span>
              <Link to="/login" className="text-primary hover:underline font-medium">
                {t('auth:login')}
              </Link>
            </div>
          </CardFooter>
        </Card>
        </Motion.div>
        <AuthVisualPanel variant="register" className="order-1 lg:order-2" />
      </div>

      {/* Terms of Service Modal */}
      <AnimatePresence>
        {showTermsModal && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowTermsModal(false)}
          >
            <Motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card text-card-foreground rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6" />
                  <h2 className="text-xl font-bold">Conditions d'utilisation</h2>
                </div>
                <button
                  onClick={() => setShowTermsModal(false)}
                  className="p-2 rounded-full hover:bg-white/20 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="prose prose-sm max-w-none text-foreground space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">1. Acceptation des conditions</h3>
                  <p>
                    En accédant et en utilisant la plateforme YourQCM, vous acceptez d'être lié par ces conditions d'utilisation.
                    Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre service.
                  </p>

                  <h3 className="text-lg font-semibold text-foreground">2. Description du service</h3>
                  <p>
                    YourQCM est une plateforme éducative destinée aux étudiants en médecine, offrant des QCM,
                    des ressources pédagogiques et des outils de suivi de progression.
                  </p>

                  <h3 className="text-lg font-semibold text-foreground">3. Compte utilisateur</h3>
                  <p>
                    Vous êtes responsable de la confidentialité de votre compte et de votre mot de passe. 
                    Vous acceptez de nous informer immédiatement de toute utilisation non autorisée de votre compte.
                  </p>

                  <h3 className="text-lg font-semibold text-foreground">4. Utilisation du contenu</h3>
                  <p>
                    Le contenu de YourQCM est protégé par des droits d'auteur. Vous ne pouvez pas reproduire,
                    distribuer ou utiliser ce contenu à des fins commerciales sans notre autorisation écrite.
                  </p>

                  <h3 className="text-lg font-semibold text-foreground">5. Abonnements et paiements</h3>
                  <p>
                    Les abonnements sont facturés selon la période choisie. Les remboursements ne sont accordés 
                    que dans des cas exceptionnels, sur décision de notre équipe.
                  </p>

                  <h3 className="text-lg font-semibold text-foreground">6. Comportement de l'utilisateur</h3>
                  <p>
                    Vous vous engagez à ne pas utiliser la plateforme de manière abusive, à ne pas partager 
                    votre compte et à respecter les autres utilisateurs de la communauté.
                  </p>

                  <h3 className="text-lg font-semibold text-foreground">7. Modifications</h3>
                  <p>
                    Nous nous réservons le droit de modifier ces conditions à tout moment. Les utilisateurs 
                    seront informés des changements significatifs par email ou notification sur la plateforme.
                  </p>

                  <h3 className="text-lg font-semibold text-foreground">8. Contact</h3>
                  <p>
                    Pour toute question concernant ces conditions, contactez-nous via WhatsApp ou par email.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t bg-muted rounded-b-2xl">
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowTermsModal(false)}
                  >
                    Fermer
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, acceptTerms: true }));
                      setShowTermsModal(false);
                    }}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Accepter
                  </Button>
                </div>
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Privacy Policy Modal */}
      <AnimatePresence>
        {showPrivacyModal && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowPrivacyModal(false)}
          >
            <Motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card text-card-foreground rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6" />
                  <h2 className="text-xl font-bold">Politique de confidentialité</h2>
                </div>
                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="p-2 rounded-full hover:bg-white/20 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="prose prose-sm max-w-none text-foreground space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">1. Collecte des données</h3>
                  <p>
                    Nous collectons les informations que vous nous fournissez lors de votre inscription : 
                    nom, prénom, adresse email. Nous collectons également des données d'utilisation pour 
                    améliorer votre expérience.
                  </p>

                  <h3 className="text-lg font-semibold text-foreground">2. Utilisation des données</h3>
                  <p>
                    Vos données sont utilisées pour :
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Gérer votre compte et votre abonnement</li>
                    <li>Personnaliser votre expérience d'apprentissage</li>
                    <li>Vous envoyer des communications importantes</li>
                    <li>Améliorer nos services</li>
                  </ul>

                  <h3 className="text-lg font-semibold text-foreground">3. Protection des données</h3>
                  <p>
                    Nous mettons en œuvre des mesures de sécurité appropriées pour protéger vos données 
                    personnelles contre tout accès non autorisé, modification, divulgation ou destruction.
                  </p>

                  <h3 className="text-lg font-semibold text-foreground">4. Partage des données</h3>
                  <p>
                    Nous ne vendons pas vos données personnelles. Nous pouvons partager vos informations 
                    avec des prestataires de services tiers uniquement pour le fonctionnement de la plateforme 
                    (ex: traitement des paiements via PayPal).
                  </p>

                  <h3 className="text-lg font-semibold text-foreground">5. Cookies</h3>
                  <p>
                    Nous utilisons des cookies pour améliorer votre expérience de navigation et analyser 
                    l'utilisation de notre plateforme. Vous pouvez gérer vos préférences de cookies dans 
                    les paramètres de votre navigateur.
                  </p>

                  <h3 className="text-lg font-semibold text-foreground">6. Vos droits</h3>
                  <p>
                    Vous avez le droit de :
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Accéder à vos données personnelles</li>
                    <li>Rectifier vos données</li>
                    <li>Supprimer votre compte</li>
                    <li>Retirer votre consentement à tout moment</li>
                  </ul>

                  <h3 className="text-lg font-semibold text-foreground">7. Conservation des données</h3>
                  <p>
                    Vos données sont conservées aussi longtemps que votre compte est actif. En cas de 
                    suppression de compte, vos données seront supprimées dans un délai de 30 jours.
                  </p>

                  <h3 className="text-lg font-semibold text-foreground">8. Contact</h3>
                  <p>
                    Pour toute question concernant vos données personnelles, contactez-nous via WhatsApp 
                    ou par email.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t bg-muted rounded-b-2xl">
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowPrivacyModal(false)}
                  >
                    Fermer
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, acceptPrivacy: true }));
                      setShowPrivacyModal(false);
                    }}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Accepter
                  </Button>
                </div>
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Register;
