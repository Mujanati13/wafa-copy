import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, Mail, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import axios from 'axios';
import logo from '@/assets/logo.png';
import { resendVerificationEmail, getCurrentUser } from '@/services/authService';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';

const VerifyEmail = () => {
  const { t } = useTranslation(['auth', 'common']);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState('pending'); // pending, verifying, success, error
  const [message, setMessage] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const token = searchParams.get('token');
  const email = location.state?.email || '';

  useEffect(() => {
    // If token is present, verify it (traditional email verification)
    if (token) {
      setStatus('verifying');
      verifyEmail();
    } else {
      // Show pending verification page (Firebase verification)
      setStatus('pending');
      checkFirebaseVerification();
    }
  }, [token]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const checkFirebaseVerification = async () => {
    const user = getCurrentUser();
    if (user?.emailVerified) {
      setStatus('success');
      setMessage(t('auth:email_verified'));
      setTimeout(() => {
        navigate('/dashboard/home');
      }, 2000);
    }
  };

  const verifyEmail = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/auth/verify-email?token=${token}`
      );

      if (response.data.success) {
        setStatus('success');
        setMessage(response.data.message);
        
        // If already verified, redirect immediately
        if (response.data.alreadyVerified) {
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        } else {
          // New verification, wait a bit longer
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        }
      }
    } catch (error) {
      const errorData = error.response?.data;
      
      setStatus('error');
      
      // Handle different error types
      if (errorData?.expired) {
        setMessage(t('auth:verification_link_expired'));
        // Store email for resend functionality
        if (errorData.email) {
          localStorage.setItem('pendingVerificationEmail', errorData.email);
        }
      } else if (errorData?.alreadyVerified) {
        setStatus('success');
        setMessage(t('auth:email_already_verified'));
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setMessage(
          errorData?.message || 
          t('auth:authentication_error')
        );
      }
    }
  };

  const handleResendEmail = async () => {
    setIsResending(true);
    
    try {
      // Get email from state or localStorage
      const emailToVerify = email || localStorage.getItem('pendingVerificationEmail');
      
      if (!emailToVerify) {
        toast.error(t('common:error'), {
          description: t('auth:email_not_found_reregister'),
        });
        return;
      }

      // Call backend to resend verification
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/resend-verification`,
        { email: emailToVerify }
      );

      if (response.data.success) {
        toast.success(t('auth:email_sent'), {
          description: t('auth:new_verification_link_sent'),
          duration: 5000,
        });
        
        // Set cooldown period (60 seconds)
        setCanResend(false);
        setCountdown(60);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || t('auth:cannot_resend_email');
      
      toast.error(t('common:error'), {
        description: errorMessage,
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center px-4 py-8">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-blue-100 rounded-full opacity-30 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-teal-100 rounded-full opacity-20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-4">
          <Link to="/" className="inline-block">
            <img src={logo} alt="Atlas QCM Logo" className="h-16 w-auto mx-auto object-contain" />
          </Link>
        </div>
        <div className="flex justify-center mb-4">
          <LanguageSwitcher />
        </div>

        <Card className="shadow-2xl border-primary/10">
          {status === 'pending' && (
            <>
              <CardHeader className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold">{t('auth:verify_email')}</CardTitle>
                <CardDescription className="text-base">
                  {t('auth:verification_email_sent')}<br />
                  <span className="font-semibold text-foreground">{email}</span>
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <Alert className="bg-blue-50 border-blue-200">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-sm text-blue-800">
                    {t('auth:check_inbox_click_link')}
                  </AlertDescription>
                </Alert>

                <Alert className="bg-amber-50 border-amber-200">
                  <AlertDescription className="text-sm text-amber-800">
                    ⚠️ <span className="font-semibold">Important:</span> Please also check your <span className="font-semibold">SPAM</span> or <span className="font-semibold">PROMOTIONS</span> folder. The verification email might be filtered there.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground text-center">
                    {t('auth:didnt_receive_email')}
                  </p>
                  
                  <div className="space-y-2">
                    <Button
                      onClick={handleResendEmail}
                      disabled={isResending || !canResend}
                      variant="outline"
                      className="w-full"
                    >
                      {isResending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('common:loading')}
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          {canResend ? t('auth:resend_verification') : `${t('auth:resend_in')} ${countdown}s`}
                        </>
                      )}
                    </Button>

                    <Button onClick={() => navigate('/login')} className="w-full">
                      {t('auth:go_to_login')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {status === 'verifying' && (
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <Loader2 className="w-16 h-16 text-primary animate-spin" />
                </div>
                <h2 className="text-2xl font-bold">{t('auth:verifying')}</h2>
                <p className="text-muted-foreground">
                  {t('auth:please_wait_verifying')}
                </p>
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertDescription className="text-sm text-amber-800">
                    ⚠️ <span className="font-semibold">Important:</span> If verification fails, please check your <span className="font-semibold">SPAM</span> or <span className="font-semibold">PROMOTIONS</span> folder.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          )}

          {status === 'success' && (
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="flex justify-center"
                >
                  <div className="h-16 w-16 rounded-full bg-green-50 flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-green-500" />
                  </div>
                </motion.div>
                <h2 className="text-2xl font-bold">{t('auth:verification_complete')}</h2>
                <Alert className="bg-green-50 border-green-200">
                  <AlertDescription className="text-green-800">
                    {message || t('auth:email_verified')}
                  </AlertDescription>
                </Alert>
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertDescription className="text-sm text-amber-800">
                    ✅ Your email has been successfully verified. If you didn't receive the confirmation email, please check your <span className="font-semibold">SPAM</span> or <span className="font-semibold">PROMOTIONS</span> folder.
                  </AlertDescription>
                </Alert>
                <p className="text-sm text-muted-foreground">
                  {t('auth:redirecting')}
                </p>
              </div>
            </CardContent>
          )}

          {status === 'error' && (
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center">
                    <XCircle className="w-10 h-10 text-red-500" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold">{t('auth:verification_failed')}</h2>
                <Alert variant="destructive">
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertDescription className="text-sm text-amber-800">
                    ⚠️ <span className="font-semibold">Important:</span> Please also check your <span className="font-semibold">SPAM</span> or <span className="font-semibold">PROMOTIONS</span> folder. The verification email might be filtered there.
                  </AlertDescription>
                </Alert>
                <Button
                  onClick={handleResendEmail}
                  disabled={isResending || !canResend}
                  variant="outline"
                  className="w-full"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('common:loading')}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {canResend ? t('auth:resend_verification') : `${t('auth:resend_in')} ${countdown}s`}
                    </>
                  )}
                </Button>
                <Button asChild variant="secondary" className="w-full">
                  <Link to="/login">{t('auth:back_to_login')}</Link>
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>
    </div>
  );
};

export default VerifyEmail;
