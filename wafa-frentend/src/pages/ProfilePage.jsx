import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { debounce } from 'lodash';
import { 
  User, Mail, Phone, MapPin, Calendar, GraduationCap, 
  BookOpen, Trophy, Medal, Star, Clock, Edit, Save, X, Camera, Loader2, Check,
  ShieldCheck, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PageHeader, StatCard } from '@/components/shared';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { userService } from '@/services/userService';
import { api } from '@/lib/utils';

const ProfilePage = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingAcademic, setIsEditingAcademic] = useState(false);
  const [loading, setLoading] = useState(true);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [user, setUser] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);
  
  // Email verification states
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(null);
  
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthDate: '',
    university: '',
    faculty: '',
    year: '',
    specialization: '',
    location: '',
    bio: ''
  });

  const [editData, setEditData] = useState({ ...profileData });

  // Helper function to determine year from semesters
  const getYearFromSemesters = (semesters) => {
    if (!semesters || semesters.length === 0) return '';
    
    // Check each year's semesters
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

  // Fetch user profile and stats on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch profile and stats in parallel
        const [userData, statsData] = await Promise.all([
          userService.getUserProfile(),
          userService.getMyStats()
        ]);
        
        setUser(userData);
        setUserStats(statsData);
        
        // Determine year from semesters
        const calculatedYear = getYearFromSemesters(userData.semesters);
        
        // Map backend user data to profile form
        const mappedData = {
          firstName: userData.name?.split(' ')[0] || '',
          lastName: userData.name?.split(' ').slice(1).join(' ') || '',
          email: userData.email || '',
          phone: userData.phone || '',
          birthDate: userData.birthDate || userData.dateOfBirth?.split('T')[0] || '',
          university: userData.university || 'Université Mohammed V',
          faculty: userData.faculty || 'Médecine',
          year: calculatedYear || userData.currentYear || '',
          specialization: userData.specialization || '',
          location: userData.location || userData.address || '',
          bio: userData.bio || ''
        };
        
        setProfileData(mappedData);
        setEditData(mappedData);
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        toast.error(t('dashboard:failed_to_load_profile'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Auto-save profile function (only for academic data - no verification needed)
  const autoSaveAcademic = useCallback(
    debounce(async (data) => {
      if (!isEditingAcademic) return;
      
      setAutoSaving(true);
      try {
        const updateData = {
          university: data.university,
          faculty: data.faculty,
        };
        
        const updatedUser = await userService.updateUserProfile(updateData);
        setUser(updatedUser);
        setLastSaved(new Date());
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setTimeout(() => setAutoSaving(false), 500);
      }
    }, 2000),
    [isEditingAcademic]
  );

  // Trigger auto-save when academic data changes
  useEffect(() => {
    if (isEditingAcademic && (
        editData.university !== profileData.university ||
        editData.faculty !== profileData.faculty)) {
      autoSaveAcademic(editData);
    }
  }, [editData.university, editData.faculty, isEditingAcademic]);

  // Send verification code for personal info changes
  const sendVerificationCode = async () => {
    setIsSendingCode(true);
    try {
      await api.post('/auth/send-profile-verification');
      toast.success('Code de vérification envoyé à votre email');
      setShowVerificationModal(true);
    } catch (error) {
      console.error('Failed to send verification:', error);
      toast.error(error.response?.data?.message || 'Échec de l\'envoi du code');
    } finally {
      setIsSendingCode(false);
    }
  };

  // Handle profile photo upload
  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image valide');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5 Mo');
      return;
    }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      // Don't set Content-Type manually - axios handles it for FormData
      const response = await api.post('/users/upload-photo', formData);

      if (response.data.success) {
        setUser(prev => ({
          ...prev,
          profilePicture: response.data.profilePicture
        }));
        toast.success('Photo de profil mise à jour avec succès');
      }
    } catch (error) {
      console.error('Failed to upload photo:', error);
      toast.error(error.response?.data?.message || 'Échec du téléchargement de la photo');
    } finally {
      setUploadingPhoto(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Verify code and save personal info
  const verifyAndSavePersonal = async () => {
    if (verificationCode.length !== 6) {
      toast.error('Veuillez entrer le code à 6 chiffres');
      return;
    }

    setIsVerifying(true);
    try {
      // Verify the code
      await api.post('/auth/verify-profile-code', { code: verificationCode });
      
      // If verified, save the personal info
      const updateData = {
        name: `${pendingChanges.firstName} ${pendingChanges.lastName}`.trim(),
        phone: pendingChanges.phone,
        dateOfBirth: pendingChanges.birthDate,
        address: pendingChanges.location,
        bio: pendingChanges.bio
      };
      
      const updatedUser = await userService.updateUserProfile(updateData);
      setUser(updatedUser);
      setProfileData({ ...profileData, ...pendingChanges });
      setEditData({ ...profileData, ...pendingChanges });
      
      setShowVerificationModal(false);
      setVerificationCode('');
      setPendingChanges(null);
      setIsEditing(false);
      setLastSaved(new Date());
      
      toast.success('Profil mis à jour avec succès');
    } catch (error) {
      console.error('Verification failed:', error);
      toast.error(error.response?.data?.message || 'Code de vérification invalide');
    } finally {
      setIsVerifying(false);
    }
  };

  // Map achievement types to icons
  const getAchievementIcon = (achievementId) => {
    const iconMap = {
      'top_performer': <Trophy className="h-6 w-6 text-white" />,
      'expert': <Medal className="h-6 w-6 text-white" />,
      'perfect_streak': <Star className="h-6 w-6 text-white" />,
      'studious': <BookOpen className="h-6 w-6 text-white" />,
    };
    return iconMap[achievementId] || <Trophy className="h-6 w-6 text-white" />;
  };

  // Get achievements from user stats or show empty state
  const achievements = userStats?.achievements?.length > 0 
    ? userStats.achievements.map(ach => ({
        icon: getAchievementIcon(ach.achievementId),
        title: ach.achievementName,
        description: ach.description || 'Débloquer',
        variant: 'default'
      }))
    : [];

  // Calculate stats from user data
  const stats = [
    { 
      label: 'Points Totaux', 
      value: user?.totalPoints || 0, 
      icon: <Trophy className="h-4 w-4 text-yellow-600" />,
      description: `Niveau ${user?.level || 0} (${user?.xpToNextLevel || 0}/50 XP)`
    },
    { 
      label: t('dashboard:exams_taken'), 
      value: userStats?.examsCompleted || 0, 
      icon: <BookOpen className="h-4 w-4" /> 
    },
    { 
      label: t('dashboard:overall_average'), 
      value: userStats?.averageScore ? `${userStats.averageScore.toFixed(1)}/20` : '0/20', 
      icon: <Star className="h-4 w-4" /> 
    },
    { 
      label: t('dashboard:study_hours'), 
      value: userStats?.studyHours ? `${userStats.studyHours}h` : '0h', 
      icon: <Clock className="h-4 w-4" /> 
    },
    { 
      label: t('dashboard:ranking'), 
      value: userStats?.rank || 'N/A', 
      icon: <Trophy className="h-4 w-4" /> 
    }
  ];

  const handleSave = async () => {
    // Check if personal info has changed
    const personalChanged = 
      editData.firstName !== profileData.firstName ||
      editData.lastName !== profileData.lastName ||
      editData.phone !== profileData.phone ||
      editData.birthDate !== profileData.birthDate ||
      editData.location !== profileData.location ||
      editData.bio !== profileData.bio;
    
    if (personalChanged) {
      // Store pending changes and request verification
      setPendingChanges({
        firstName: editData.firstName,
        lastName: editData.lastName,
        phone: editData.phone,
        birthDate: editData.birthDate,
        location: editData.location,
        bio: editData.bio
      });
      await sendVerificationCode();
    } else {
      setIsEditing(false);
      toast.info('Aucune modification détectée');
    }
  };

  const handleSaveAcademic = async () => {
    try {
      setLoading(true);
      
      const updateData = {
        university: editData.university,
        faculty: editData.faculty,
      };
      
      const updatedUser = await userService.updateUserProfile(updateData);
      setUser(updatedUser);
      setProfileData({ ...profileData, university: editData.university, faculty: editData.faculty });
      setIsEditingAcademic(false);
      setLastSaved(new Date());
      toast.success('Informations académiques mises à jour');
    } catch (error) {
      console.error('Failed to update academic info:', error);
      toast.error('Échec de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditData({ ...profileData });
    setIsEditing(false);
  };

  const handleCancelAcademic = () => {
    setEditData({ ...profileData });
    setIsEditingAcademic(false);
  };

  const getInitials = () => {
    if (!profileData.firstName || !profileData.lastName) return 'U';
    return `${profileData.firstName[0]}${profileData.lastName[0]}`.toUpperCase();
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 md:p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-muted-foreground">{t('dashboard:loading_profile')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title={t('dashboard:my_profile')}
          description={t('dashboard:manage_info_track_achievements')}
        />

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle>{t('dashboard:personal_information')}</CardTitle>
                    {/* Auto-save indicator */}
                    {isEditing && (
                      <div className="flex items-center gap-2">
                        {autoSaving ? (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full"
                          >
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>{t('dashboard:saving', 'Sauvegarde...')}</span>
                          </motion.div>
                        ) : lastSaved ? (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full"
                          >
                            <Check className="h-3 w-3" />
                            <span>{t('dashboard:saved', 'Sauvegardé')}</span>
                          </motion.div>
                        ) : null}
                      </div>
                    )}
                  </div>
                  {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)} variant="outline" className="gap-2">
                      <Edit className="h-4 w-4" />
                      {t('common:edit')}
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button onClick={handleSave} className="gap-2">
                        <Save className="h-4 w-4" />
                        {t('common:save')}
                      </Button>
                      <Button onClick={handleCancel} variant="outline" className="gap-2">
                        <X className="h-4 w-4" />
                        {t('common:cancel')}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="personal" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="personal">{t('dashboard:personal')}</TabsTrigger>
                    <TabsTrigger value="academic">{t('dashboard:academic')}</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="personal" className="space-y-4 mt-4">
                    {/* Info banner for email verification */}
                    <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
                      <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                      <span>Les modifications de vos informations personnelles nécessitent une vérification par email.</span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">{t('dashboard:first_name')}</Label>
                        <Input
                          id="firstName"
                          value={isEditing ? editData.firstName : profileData.firstName}
                          onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                          disabled={!isEditing}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">{t('dashboard:last_name')}</Label>
                        <Input
                          id="lastName"
                          value={isEditing ? editData.lastName : profileData.lastName}
                          onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">{t('common:email')}</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileData.email}
                        disabled={true}
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">L'email ne peut pas être modifié</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">{t('dashboard:phone')}</Label>
                        <Input
                          id="phone"
                          value={isEditing ? editData.phone : profileData.phone}
                          onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                          disabled={!isEditing}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="birthDate">{t('dashboard:birth_date')}</Label>
                        <Input
                          id="birthDate"
                          type="date"
                          value={isEditing ? editData.birthDate : profileData.birthDate}
                          onChange={(e) => setEditData({ ...editData, birthDate: e.target.value })}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">{t('dashboard:location')}</Label>
                      <Input
                        id="location"
                        value={isEditing ? editData.location : profileData.location}
                        onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">{t('dashboard:bio')}</Label>
                      <Textarea
                        id="bio"
                        value={isEditing ? editData.bio : profileData.bio}
                        onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                        disabled={!isEditing}
                        rows={4}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="academic" className="space-y-4 mt-4">
                    {/* Academic edit controls */}
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Vos informations académiques
                      </p>
                      {!isEditingAcademic ? (
                        <Button onClick={() => setIsEditingAcademic(true)} variant="outline" size="sm" className="gap-2">
                          <Edit className="h-3.5 w-3.5" />
                          Modifier
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button onClick={handleSaveAcademic} size="sm" className="gap-1">
                            <Save className="h-3.5 w-3.5" />
                            Sauvegarder
                          </Button>
                          <Button onClick={handleCancelAcademic} variant="outline" size="sm" className="gap-1">
                            <X className="h-3.5 w-3.5" />
                            Annuler
                          </Button>
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="university">{t('dashboard:university')}</Label>
                      <Input
                        id="university"
                        value={isEditingAcademic ? editData.university : profileData.university}
                        onChange={(e) => setEditData({ ...editData, university: e.target.value })}
                        disabled={!isEditingAcademic}
                        placeholder="Université Mohammed V"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="faculty">{t('dashboard:faculty')}</Label>
                      <Input
                        id="faculty"
                        value={isEditingAcademic ? editData.faculty : profileData.faculty}
                        onChange={(e) => setEditData({ ...editData, faculty: e.target.value })}
                        disabled={!isEditingAcademic}
                        placeholder="Médecine"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="year">{t('dashboard:year')}</Label>
                      <Input
                        id="year"
                        value={profileData.year}
                        disabled={true}
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        L'année est déterminée automatiquement selon votre abonnement
                        {user?.semesters?.length > 0 && (
                          <span className="ml-1">
                            (Semestres: {user.semesters.join(', ')})
                          </span>
                        )}
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Achievements - Hidden */}
            <div style={{ display: 'none' }}>
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard:achievements')}</CardTitle>
                <CardDescription>{t('dashboard:your_badges_rewards')}</CardDescription>
              </CardHeader>
              <CardContent>
                {achievements.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    {achievements.map((achievement, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                                {achievement.icon}
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold">{achievement.title}</p>
                                <p className="text-sm text-muted-foreground">{achievement.description}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Trophy className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-muted-foreground">{t('dashboard:no_achievements_yet')}</p>
                    <p className="text-sm text-slate-400 mt-1">{t('dashboard:keep_studying_unlock_badges')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Avatar Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={user?.profilePicture?.startsWith('http') ? user.profilePicture : user?.profilePicture ? `${import.meta.env.VITE_API_URL?.replace('/api/v1', '')}${user.profilePicture}` : undefined} />
                      <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePhotoUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                    >
                      {uploadingPhoto ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {user?.name || `${profileData.firstName} ${profileData.lastName}`}
                    </h3>
                    <p className="text-sm text-muted-foreground">{user?.email || profileData.email}</p>
                  </div>
                  <Badge variant="secondary">{profileData.year}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('dashboard:statistics')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats.map((stat, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {stat.icon}
                      <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">{stat.label}</span>
                        {stat.description && (
                          <span className="text-xs text-muted-foreground">{stat.description}</span>
                        )}
                      </div>
                    </div>
                    <span className="font-semibold">{stat.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Questions Statistics Card - Hidden */}
            <div style={{ display: 'none' }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Statistiques Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Questions Répondues</span>
                  <span className="font-semibold">{user?.questionsAnswered || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Réponses Correctes</span>
                  <span className="font-semibold text-green-600">{user?.correctAnswers || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Taux de Réussite</span>
                  <span className="font-semibold">
                    {user?.questionsAnswered > 0 
                      ? `${Math.round((user.correctAnswers / user.questionsAnswered) * 100)}%`
                      : '0%'
                    }
                  </span>
                </div>
                <Separator className="my-2" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Progression Globale</span>
                  <span className="font-semibold">{user?.percentageAnswered?.toFixed(1) || 0}%</span>
                </div>
                
                {/* Progress bar */}
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${user?.percentageAnswered || 0}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                  />
                </div>
              </CardContent>
            </Card>
            </div>

            {/* Points Breakdown Card - Hidden */}
            <div style={{ display: 'none' }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Détail des Points</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-2 rounded-lg bg-yellow-50">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                    <span className="text-sm text-muted-foreground">Questions</span>
                  </div>
                  <span className="font-semibold text-yellow-700">{user?.normalPoints || 0}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-green-50">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <span className="text-sm text-muted-foreground">Signalements (×30)</span>
                  </div>
                  <span className="font-semibold text-green-700">{user?.greenPoints || 0}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                    <span className="text-sm text-muted-foreground">Explications (×40)</span>
                  </div>
                  <span className="font-semibold text-blue-700">{user?.bluePoints || 0}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-sm">Total des Points</span>
                  <span className="text-lg">{user?.totalPoints || 0}</span>
                </div>
                
                {/* Progress bar to next level */}
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Niveau {user?.level || 0}</span>
                    <span>{user?.xpToNextLevel || 0}/50 XP</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${((user?.xpToNextLevel || 0) / 50) * 100}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            </div>
          </div>
        </div>
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
              Un code de vérification a été envoyé à votre email <strong>{profileData.email}</strong>. 
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
                onClick={sendVerificationCode}
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
              onClick={verifyAndSavePersonal}
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

export default ProfilePage;
