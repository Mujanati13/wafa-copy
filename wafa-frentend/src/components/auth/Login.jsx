import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion as Motion } from 'framer-motion';
import { Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { loginWithEmail, loginWithGoogle } from '@/services/authService';
import { userService } from '@/services/userService';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import AuthVisualPanel from './AuthVisualPanel';

const Login = () => {
  const { t } = useTranslation(['auth', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  // Get the page user was trying to access before being redirected to login
  const from = location.state?.from?.pathname || null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const showLoginError = (error) => {
    if (error.code === 'ACCOUNT_ALREADY_ACTIVE') {
      const session = error.activeSession || {};
      const startedAtDate = session.startedAt ? new Date(session.startedAt) : null;
      const startedAt = startedAtDate && !Number.isNaN(startedAtDate.getTime())
        ? startedAtDate.toLocaleString()
        : t('auth:concurrent_session_unknown');
      const unknown = t('auth:concurrent_session_unknown');

      toast.error(t('auth:concurrent_session_title'), {
        description: (
          <div className="mt-2 space-y-2 text-sm">
            <p>{t('auth:concurrent_session_message')}</p>
            <div className="space-y-1 rounded-md bg-muted/70 p-2">
              <p><strong>{t('auth:concurrent_session_ip')}:</strong> {session.ip || unknown}</p>
              <p><strong>{t('auth:concurrent_session_location')}:</strong> {session.location || unknown}</p>
              <p><strong>{t('auth:concurrent_session_device')}:</strong> {session.device || unknown}</p>
              <p><strong>{t('auth:concurrent_session_since')}:</strong> {startedAt}</p>
            </div>
          </div>
        ),
        duration: 12000,
      });
      return;
    }

    toast.error(t('auth:authentication_error'), {
      description: error.message || t('auth:invalid_credentials'),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await loginWithEmail(formData.email, formData.password);

      if (result.needsVerification) {
        toast.warning(t('auth:email_verification'), {
          description: result.message || t('auth:enter_code'),
          duration: 5000,
        });
        // Store email for resend functionality
        localStorage.setItem('pendingVerificationEmail', result.email || formData.email);
        navigate('/verify-email-firebase', { state: { email: result.email || formData.email } });
        return;
      }

      // Store JWT token and user data
      if (result.token) {
        localStorage.setItem('token', result.token);
      }
      localStorage.setItem('user', JSON.stringify(result.user));
      localStorage.setItem('userProfile', JSON.stringify(result.user));

      // Fetch full profile to ensure we have latest data
      try {
        const fullProfile = await userService.getUserProfile(true);
        localStorage.setItem('userProfile', JSON.stringify(fullProfile));
        localStorage.setItem('user', JSON.stringify(fullProfile));
      } catch (profileError) {
        console.error('Error fetching full profile:', profileError);
      }

      window.dispatchEvent(new Event('auth-state-changed'));

      toast.success(t('auth:login_success'), {
        description: t('auth:login_success'),
      });

      // Check if user needs to select free semester (for non-admin free users)
      if (!result.user?.isAdmin) {
        try {
          const semesterStatus = await userService.checkFreeSemesterStatus();
          if (semesterStatus.data?.needsToSelectSemester) {
            setTimeout(() => {
              navigate('/select-semester');
            }, 1000);
            return;
          }
        } catch (error) {
          console.error('Error checking semester status:', error);
          // Continue with normal flow if check fails
        }
      }

      // Redirect based on user role
      setTimeout(() => {
        if (result.user?.isAdmin) {
          navigate('/admin/analytics');
        } else {
          // Redirect to the page they were trying to access, or default to dashboard
          navigate(from || '/dashboard/home');
        }
      }, 1000);
    } catch (error) {
      showLoginError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);

    try {
      const result = await loginWithGoogle();

      // Store JWT token and user data
      if (result.token) {
        localStorage.setItem('token', result.token);
      }
      localStorage.setItem('user', JSON.stringify(result.user));
      localStorage.setItem('userProfile', JSON.stringify(result.user));

      // Fetch full profile to ensure we have latest data
      try {
        const fullProfile = await userService.getUserProfile(true);
        localStorage.setItem('userProfile', JSON.stringify(fullProfile));
        localStorage.setItem('user', JSON.stringify(fullProfile));
      } catch (profileError) {
        console.error('Error fetching full profile:', profileError);
      }

      window.dispatchEvent(new Event('auth-state-changed'));

      toast.success(t('auth:login_success'), {
        description: t('auth:login_success'),
      });

      // Check if user needs to select free semester (for non-admin free users)
      if (!result.user?.isAdmin) {
        try {
          const semesterStatus = await userService.checkFreeSemesterStatus();
          if (semesterStatus.data?.needsToSelectSemester) {
            setTimeout(() => {
              navigate('/select-semester');
            }, 1000);
            return;
          }
        } catch (error) {
          console.error('Error checking semester status:', error);
          // Continue with normal flow if check fails
        }
      }

      // Redirect based on user role
      setTimeout(() => {
        if (result.user?.isAdmin) {
          navigate('/admin/analytics');
        } else {
          // Redirect to the page they were trying to access, or default to dashboard
          navigate(from || '/dashboard/home');
        }
      }, 1000);
    } catch (error) {
      showLoginError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-3 py-4 sm:px-4 sm:py-8">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-blue-100 rounded-full opacity-30 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-teal-100 rounded-full opacity-20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-blue-200 rounded-full opacity-25 blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>

      <div className="relative z-10 grid w-full max-w-6xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,0.8fr)]">
        <AuthVisualPanel variant="login" />
        <Motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full self-center p-4 sm:p-8 lg:p-10"
        >
        {/* Back Button - Top Left */}
        <Link
          to="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common:back')}
        </Link>

        <div className="mb-4 flex justify-end">
            <LanguageSwitcher />
        </div>

        {/* Login Card */}
        <Card className="shadow-2xl border-primary/10">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">{t('auth:login')}</CardTitle>
            <CardDescription>
              {t('auth:enter_email')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                    placeholder={t('auth:enter_password')}
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
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    checked={formData.rememberMe}
                    onCheckedChange={(checked) =>
                      setFormData(prev => ({ ...prev, rememberMe: checked }))
                    }
                    disabled={isLoading}
                  />
                  <Label
                    htmlFor="rememberMe"
                    className="text-sm font-normal cursor-pointer"
                  >
                    {t('auth:remember_me')}
                  </Label>
                </div>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  {t('auth:forgot_password')}
                </Link>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common:loading')}
                  </>
                ) : (
                  t('auth:login')
                )}
              </Button>

              {/* Divider */}
              <div className="relative my-6">
                <Separator />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="bg-card px-2 text-xs text-muted-foreground">
                    {t('auth:or')}
                  </span>
                </div>
              </div>

              {/* Google Login Button */}
              <div className="grid grid-cols-1 gap-4">
                <Button
                  variant="outline"
                  type="button"
                  disabled={isLoading}
                  onClick={handleGoogleLogin}
                  className="w-full"
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <FcGoogle className="mr-2 h-5 w-5" />
                  )}
                  {t('auth:google_login')}
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Separator />
            <div className="text-center text-sm">
              <span className="text-muted-foreground">{t('auth:dont_have_account')} </span>
              <Link to="/register" className="text-primary hover:underline font-medium">
                {t('auth:register')}
              </Link>
            </div>
          </CardFooter>
        </Card>
        </Motion.div>
      </div>
    </div>
  );
};

export default Login;
