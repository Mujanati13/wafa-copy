import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Search, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card className="border-0 shadow-2xl bg-card/80 backdrop-blur-sm">
          <CardContent className="p-8 md:p-12">
            <div className="text-center space-y-6">
              {/* 404 Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="flex justify-center"
              >
                <div className="relative">
                  <FileQuestion className="h-32 w-32 text-blue-500 opacity-20" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-7xl font-bold text-blue-600">404</span>
                  </div>
                </div>
              </motion.div>

              {/* Title */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="space-y-2"
              >
                <h1 className="text-3xl md:text-4xl font-bold text-slate-800">
                  Page Introuvable
                </h1>
                <p className="text-lg text-slate-600">
                  Désolé, la page que vous recherchez n'existe pas.
                </p>
              </motion.div>

              {/* Description */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-muted rounded-lg p-4 border border-border"
              >
                <p className="text-sm text-slate-600">
                  La page que vous essayez d'accéder a peut-être été supprimée, 
                  renommée ou n'a jamais existé. Veuillez vérifier l'URL ou 
                  retourner à la page d'accueil.
                </p>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col sm:flex-row gap-3 justify-center pt-4"
              >
                <Button
                  onClick={() => navigate(-1)}
                  variant="outline"
                  size="lg"
                  className="gap-2 border-slate-300 hover:border-slate-400"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Retour
                </Button>
                <Link to="/">
                  <Button
                    size="lg"
                    className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 w-full sm:w-auto"
                  >
                    <Home className="h-4 w-4" />
                    Page d'Accueil
                  </Button>
                </Link>
                <Link to="/dashboard/home">
                  <Button
                    variant="outline"
                    size="lg"
                    className="gap-2 border-blue-300 text-blue-600 hover:bg-blue-50 w-full sm:w-auto"
                  >
                    <Search className="h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
              </motion.div>

              {/* Help Text */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="pt-4"
              >
                <p className="text-xs text-slate-500">
                  Si vous pensez qu'il s'agit d'une erreur, veuillez contacter le support.
                </p>
              </motion.div>
            </div>
          </CardContent>
        </Card>

        {/* Decorative Elements */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-blue-200 rounded-full opacity-20 blur-xl" />
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-indigo-200 rounded-full opacity-20 blur-xl" />
      </motion.div>
    </div>
  );
};

export default NotFound;
