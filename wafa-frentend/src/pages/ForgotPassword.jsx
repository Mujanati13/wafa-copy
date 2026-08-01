import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { sendPasswordResetEmail } from '@/services/authService';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';

const ForgotPassword = () => {
  const { t } = useTranslation(['auth', 'common']);
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await sendPasswordResetEmail(email);

      if (result.success) {
        setIsSubmitted(true);
        toast.success(t('auth:email_sent'), {
          description: t('auth:check_email_reset'),
          duration: 5000,
        });
      }
    } catch (err) {
      const errorMessage = err.message || t('auth:authentication_error');
      setError(errorMessage);
      toast.error(t('common:error'), {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="shadow-2xl border-0 backdrop-blur-sm bg-card/90">
          {!isSubmitted ? (
            <>
              {/* Logo */}
              <div className="flex justify-center pt-8 pb-2">
                <img src={logo} alt="Logo" className="h-16 w-auto" />
              </div>
              <div className="flex justify-center pb-4">
                <LanguageSwitcher />
              </div>

              <CardHeader className="text-center space-y-2 pb-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="flex justify-center mb-2"
                >
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-100 to-teal-100 flex items-center justify-center">
                    <Mail className="h-8 w-8 text-blue-600" />
                  </div>
                </motion.div>
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                  {t('auth:forgot_password')}
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {t('auth:reset_password_instructions')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      {t('common:email')}
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('auth:enter_email')}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <Alert variant="destructive" className="border-red-200 bg-red-50">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:opacity-90 text-white font-medium"
                  >
                    {isLoading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="mr-2"
                        >
                          <Mail className="h-4 w-4" />
                        </motion.div>
                        {t('common:loading')}
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        {t('auth:send_reset_link')}
                      </>
                    )}
                  </Button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => window.location.href = '/login'}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                    >
                      ← {t('auth:back_to_login')}
                    </button>
                  </div>
                </form>

                <div className="pt-4 border-t">
                  <p className="text-xs text-center text-gray-500">
                    {t('auth:reset_email_info')}
                  </p>
                </div>
              </CardContent>
            </>
          ) : (
            <>
              {/* Logo */}
              <div className="flex justify-center pt-8 pb-2">
                <img src={logo} alt="Logo" className="h-16 w-auto" />
              </div>
              <div className="flex justify-center pb-4">
                <LanguageSwitcher />
              </div>

              <CardContent className="p-8 text-center space-y-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                  className="flex justify-center"
                >
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-3"
                >
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    {t('auth:email_sent_success')}
                  </h2>
                  <p className="text-muted-foreground">
                    {t('auth:reset_link_sent')} <span className="font-semibold text-foreground">{email}</span>
                  </p>
                </motion.div>

                <Alert className="border-blue-200 bg-blue-50 text-left">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 ml-2">
                    <strong>{t('auth:next_steps')}</strong>
                    <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                      <li>{t('auth:check_inbox')}</li>
                      <li>{t('auth:click_link')}</li>
                      <li>{t('auth:create_new_password')}</li>
                    </ol>
                  </AlertDescription>
                </Alert>

                <p className="text-sm text-gray-500">
                  {t('auth:no_email_check_spam')}
                </p>

                <div className="space-y-2">
                  <Button 
                    asChild 
                    className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:opacity-90 text-white"
                  >
                    <Link to="/login">
                      {t('auth:back_to_login')}
                    </Link>
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setIsSubmitted(false);
                      setEmail('');
                    }}
                    className="w-full"
                  >
                    {t('auth:send_to_different_email')}
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>

        {/* Help Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center text-sm text-muted-foreground"
        >
          <p>{t('auth:need_help_contact_support')}</p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
