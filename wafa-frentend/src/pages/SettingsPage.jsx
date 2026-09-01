import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  User, Lock, Bell, Shield, Download, Save, Camera, 
  Mail, Phone, MapPin, GraduationCap, Eye, EyeOff, AlertTriangle,
  ShieldCheck, Loader2, Edit, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/shared';
import { toast } from 'sonner';
import { dashboardService } from '@/services/dashboardService';
import { userService } from '@/services/userService';
import { api } from '@/lib/utils';

const SettingsPage = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const [showPassword, setShowPassword] = useState(false);
  const [userSemesters, setUserSemesters] = useState([]);
  const [user, setUser] = useState(null);
  
  // Edit modes
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [isEditingAcademic, setIsEditingAcademic] = useState(false);
  
  // Email verification states
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(null);
  const [verificationPurpose, setVerificationPurpose] = useState('account'); // 'account' or 'security'
  
  // Password states
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [settings, setSettings] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    university: '',
    faculty: 'Médecine',
    currentYear: '',
    emailNotifications: true,
    pushNotifications: false,
    profileVisibility: 'private',
    shareProgress: true,
    twoFactorAuth: false,
  });

  const [originalSettings, setOriginalSettings] = useState({ ...settings });

  // Helper function to determine year from semesters
  const getYearFromSemesters = (semesters) => {
    if (!semesters || semesters.length === 0) return '';
    
    if (semesters.includes('S1') || semesters.includes('S2')) {
      return '1ère année';
    }
    if (semesters.includes('S3') || semesters.includes('S4')) {
      return '2ème année';
    }
    if (semesters.includes('S5') || semesters.includes('S6')) {
      return '3ème année';
    }
    if (semesters.includes('S7') || semesters.includes('S8')) {
      return '4ème année';
    }
    if (semesters.includes('S9') || semesters.includes('S10')) {
      return '5ème année';
    }
    
    return '';
  };

  // Fetch user profile and set semester
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await dashboardService.getUserProfile();
        const userData = response.data?.user || response.data;
        if (userData) {
          setUser(userData);
          const semesters = userData.semesters || [];
          setUserSemesters(semesters);
          const calculatedYear = getYearFromSemesters(semesters);
          
          const newSettings = {
            ...settings,
            firstName: userData.firstName || userData.name?.split(' ')[0] || '',
            lastName: userData.lastName || userData.name?.split(' ').slice(1).join(' ') || '',
            email: userData.email || '',
            phone: userData.phone || '',
            university: userData.university || '',
            faculty: userData.faculty || 'Médecine',
            currentYear: calculatedYear || userData.currentYear || '',
          };
          setSettings(newSettings);
          setOriginalSettings(newSettings);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };
    fetchUserProfile();
  }, []);

  // Send verification code
  const sendVerificationCode = async (purpose) => {
    setIsSendingCode(true);
    try {
      await api.post('/auth/send-profile-verification');
      toast.success('Code de vérification envoyé à votre email');
      setVerificationPurpose(purpose);
      setShowVerificationModal(true);
    } catch (error) {
      console.error('Failed to send verification:', error);
      toast.error(error.response?.data?.message || 'Échec de l\'envoi du code');
    } finally {
      setIsSendingCode(false);
    }
  };

  // Verify code and save changes
  const verifyAndSave = async () => {
    if (verificationCode.length !== 6) {
      toast.error('Veuillez entrer le code à 6 chiffres');
      return;
    }

    setIsVerifying(true);
    try {
      // Verify the code
      await api.post('/auth/verify-profile-code', { code: verificationCode });
      
      if (verificationPurpose === 'account') {
        // Save account changes
        const updateData = {
          name: `${pendingChanges.firstName} ${pendingChanges.lastName}`.trim(),
          phone: pendingChanges.phone,
        };
        
        await userService.updateUserProfile(updateData);
        setSettings({ ...settings, ...pendingChanges });
        setOriginalSettings({ ...settings, ...pendingChanges });
        setIsEditingAccount(false);
        toast.success('Informations du compte mises à jour');
      } else if (verificationPurpose === 'security') {
        // Change password
        await api.post('/auth/change-password', {
          currentPassword: pendingChanges.currentPassword,
          newPassword: pendingChanges.newPassword,
        });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        toast.success('Mot de passe mis à jour avec succès');
      }
      
      setShowVerificationModal(false);
      setVerificationCode('');
      setPendingChanges(null);
    } catch (error) {
      console.error('Verification failed:', error);
      toast.error(error.response?.data?.message || 'Code de vérification invalide');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSaveAccount = async () => {
    const accountChanged = 
      settings.firstName !== originalSettings.firstName ||
      settings.lastName !== originalSettings.lastName ||
      settings.phone !== originalSettings.phone;
    
    if (accountChanged) {
      setPendingChanges({
        firstName: settings.firstName,
        lastName: settings.lastName,
        phone: settings.phone,
      });
      await sendVerificationCode('account');
    } else {
      setIsEditingAccount(false);
      toast.info('Aucune modification détectée');
    }
  };

  const handleSaveAcademic = async () => {
    try {
      const updateData = {
        university: settings.university,
        faculty: settings.faculty,
      };
      
      await userService.updateUserProfile(updateData);
      setOriginalSettings({ ...originalSettings, university: settings.university, faculty: settings.faculty });
      setIsEditingAcademic(false);
      toast.success('Informations académiques mises à jour');
    } catch (error) {
      console.error('Failed to update academic info:', error);
      toast.error('Échec de la mise à jour');
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    setPendingChanges({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
    await sendVerificationCode('security');
  };

  const handleCancelAccount = () => {
    setSettings({ ...settings, firstName: originalSettings.firstName, lastName: originalSettings.lastName, phone: originalSettings.phone });
    setIsEditingAccount(false);
  };

  const handleCancelAcademic = () => {
    setSettings({ ...settings, university: originalSettings.university, faculty: originalSettings.faculty });
    setIsEditingAcademic(false);
  };

  const handleSave = () => {
    toast.success(t('dashboard:settings_saved_success'));
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <PageHeader
          title={t('common:settings')}
          description={t('dashboard:manage_preferences_account')}
        />

        <Tabs defaultValue="account" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="account">{t('dashboard:account')}</TabsTrigger>
            <TabsTrigger value="academic">{t('dashboard:academic')}</TabsTrigger>
            <TabsTrigger value="security">{t('dashboard:security')}</TabsTrigger>
            <TabsTrigger value="notifications">{t('dashboard:notifications')}</TabsTrigger>
          </TabsList>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{t('dashboard:personal_information')}</CardTitle>
                    <CardDescription>{t('dashboard:update_profile_info')}</CardDescription>
                  </div>
                  {!isEditingAccount ? (
                    <Button onClick={() => setIsEditingAccount(true)} variant="outline" className="gap-2">
                      <Edit className="h-4 w-4" />
                      Modifier
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button onClick={handleSaveAccount} className="gap-2" disabled={isSendingCode}>
                        {isSendingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Sauvegarder
                      </Button>
                      <Button onClick={handleCancelAccount} variant="outline" className="gap-2">
                        <X className="h-4 w-4" />
                        Annuler
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Info banner for email verification */}
                <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
                  <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                  <span>Les modifications de vos informations nécessitent une vérification par email.</span>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t('dashboard:first_name')}</Label>
                    <Input
                      id="firstName"
                      value={settings.firstName}
                      onChange={(e) => handleChange('firstName', e.target.value)}
                      disabled={!isEditingAccount}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t('dashboard:last_name')}</Label>
                    <Input
                      id="lastName"
                      value={settings.lastName}
                      onChange={(e) => handleChange('lastName', e.target.value)}
                      disabled={!isEditingAccount}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t('common:email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.email}
                    disabled={true}
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">L'email ne peut pas être modifié</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">{t('dashboard:phone')}</Label>
                  <Input
                    id="phone"
                    value={settings.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    disabled={!isEditingAccount}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Academic Tab */}
          <TabsContent value="academic" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{t('dashboard:academic_information')}</CardTitle>
                    <CardDescription>{t('dashboard:manage_study_info')}</CardDescription>
                  </div>
                  {!isEditingAcademic ? (
                    <Button onClick={() => setIsEditingAcademic(true)} variant="outline" className="gap-2">
                      <Edit className="h-4 w-4" />
                      Modifier
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button onClick={handleSaveAcademic} className="gap-2">
                        <Save className="h-4 w-4" />
                        Sauvegarder
                      </Button>
                      <Button onClick={handleCancelAcademic} variant="outline" className="gap-2">
                        <X className="h-4 w-4" />
                        Annuler
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="university">{t('dashboard:university')}</Label>
                  <Input
                    id="university"
                    value={settings.university}
                    onChange={(e) => handleChange('university', e.target.value)}
                    disabled={!isEditingAcademic}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="faculty">{t('dashboard:faculty')}</Label>
                  <Input
                    id="faculty"
                    value={settings.faculty}
                    onChange={(e) => handleChange('faculty', e.target.value)}
                    disabled={!isEditingAcademic}
                    placeholder="Médecine"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currentYear">{t('dashboard:study_year')}</Label>
                  <Input
                    id="currentYear"
                    value={settings.currentYear}
                    disabled
                    className="bg-muted cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">
                    L'année est déterminée automatiquement selon votre abonnement
                    {userSemesters.length > 0 && (
                      <span className="ml-1">
                        (Semestres: {userSemesters.join(', ')})
                      </span>
                    )}
                  </p>
                </div>

                <Alert variant="warning" className="bg-amber-50 border-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    <strong>Avertissement :</strong> Aucun contenu illégal ou pornographique n'est autorisé. 
                    Le non-respect de cette règle entraînera la suppression définitive de votre compte.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('common:password')}</CardTitle>
                <CardDescription>{t('dashboard:change_your_password')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Info banner for email verification */}
                <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
                  <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                  <span>Le changement de mot de passe nécessite une vérification par email.</span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currentPassword">{t('dashboard:current_password')}</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  />
                </div>

                <Button onClick={handleChangePassword} className="gap-2" disabled={isSendingCode}>
                  {isSendingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {t('dashboard:update_password')}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard:two_factor_auth')}</CardTitle>
                <CardDescription>{t('dashboard:add_security_layer')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="twoFactor">{t('dashboard:enable_2fa')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('dashboard:requires_code_each_login')}
                    </p>
                  </div>
                  <Switch
                    id="twoFactor"
                    checked={settings.twoFactorAuth}
                    onCheckedChange={(checked) => handleChange('twoFactorAuth', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard:notification_preferences')}</CardTitle>
                <CardDescription>{t('dashboard:manage_how_receive_notifications')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="emailNotif">{t('dashboard:email_notifications')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('dashboard:receive_emails_important_updates')}
                    </p>
                  </div>
                  <Switch
                    id="emailNotif"
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) => handleChange('emailNotifications', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="pushNotif">{t('dashboard:push_notifications')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('dashboard:receive_notifications_device')}
                    </p>
                  </div>
                  <Switch
                    id="pushNotif"
                    checked={settings.pushNotifications}
                    onCheckedChange={(checked) => handleChange('pushNotifications', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="shareProgress">Partager mes progrès</Label>
                    <p className="text-sm text-muted-foreground">
                      Permettre aux autres de voir votre progression
                    </p>
                  </div>
                  <Switch
                    id="shareProgress"
                    checked={settings.shareProgress}
                    onCheckedChange={(checked) => handleChange('shareProgress', checked)}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="visibility">Visibilité du profil</Label>
                  <Select value={settings.profileVisibility} onValueChange={(value) => handleChange('profileVisibility', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="friends">Amis uniquement</SelectItem>
                      <SelectItem value="private">Privé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleSave} className="gap-2">
                  <Save className="h-4 w-4" />
                  Enregistrer les préférences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Email Verification Modal */}
      <Dialog open={showVerificationModal} onOpenChange={setShowVerificationModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              Vérification requise
            </DialogTitle>
            <DialogDescription>
              Un code de vérification a été envoyé à votre email <strong>{settings.email}</strong>. 
              Veuillez entrer le code pour confirmer vos modifications.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex justify-center">
              <Input
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="text-center text-2xl font-bold tracking-[0.5em] w-48"
                maxLength={6}
              />
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Vous n'avez pas reçu le code?{' '}
              <button 
                onClick={() => sendVerificationCode(verificationPurpose)}
                disabled={isSendingCode}
                className="text-blue-600 hover:underline disabled:opacity-50"
              >
                {isSendingCode ? 'Envoi...' : 'Renvoyer'}
              </button>
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowVerificationModal(false);
                setVerificationCode('');
                setPendingChanges(null);
              }}
            >
              Annuler
            </Button>
            <Button 
              onClick={verifyAndSave}
              disabled={isVerifying || verificationCode.length !== 6}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Vérification...
                </>
              ) : (
                'Vérifier et sauvegarder'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;
