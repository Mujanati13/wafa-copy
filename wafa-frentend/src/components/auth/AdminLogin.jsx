import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import axios from 'axios';
import logo from '@/assets/logo.png';
import { userService } from '@/services/userService';
import { dashboardService } from '@/services/dashboardService';

const API_URL = import.meta.env.VITE_API_URL;

const AdminLogin = () => {
  const { t } = useTranslation(['auth', 'common']);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Use direct MongoDB login (passport local strategy)
      const response = await axios.post(
        `${API_URL}/auth/login`,
        {
          email: formData.email,
          password: formData.password,
        },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const user = response.data.user;

      // Check if user is admin
      if (!user?.isAdmin) {
        toast.error('Accès refusé', {
          description: 'Vous n\'avez pas les permissions administrateur.',
        });
        setIsLoading(false);
        return;
      }

      // Store user data and token
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('userProfile', JSON.stringify(user));
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      dashboardService.clearCache();
      userService.clearProfileCache();
      localStorage.setItem('userProfile', JSON.stringify(user));
      window.dispatchEvent(new Event('auth-state-changed'));

      toast.success('Connexion réussie', {
        description: 'Bienvenue dans le tableau de bord administrateur.',
      });

      // Redirect to admin dashboard
      setTimeout(() => {
        navigate('/admin/analytics');
      }, 1000);
    } catch (error) {
      console.error('Admin login error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Email ou mot de passe incorrect.';
      toast.error('Erreur d\'authentification', {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-slate-700 bg-slate-800/50 backdrop-blur-sm shadow-2xl">
          <CardHeader className="space-y-4 pb-8">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <img 
                  src={logo} 
                  alt="YourQCM Logo"
                  className="h-20 w-auto object-contain"
                />
                <div className="absolute -bottom-2 -right-2 bg-blue-600 rounded-full p-2">
                  <Shield className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-center text-white">
              Administration
            </CardTitle>
            <CardDescription className="text-center text-slate-300 text-base">
              Accès réservé aux administrateurs
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-slate-200">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="admin@wafa.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="pl-10 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 h-12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-slate-200">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="pl-10 pr-10 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 h-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base shadow-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Connexion...
                  </div>
                ) : (
                  'Se connecter'
                )}
              </Button>
            </form>

            <div className="pt-4 border-t border-slate-700">
              <Link 
                to="/login" 
                className="text-sm text-slate-400 hover:text-slate-300 text-center block transition-colors"
              >
                ← Retour à la connexion utilisateur
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-slate-400 text-sm mt-6">
          © 2024 YourQCM. Tous droits réservés.
        </p>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
