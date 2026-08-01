import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Image, FileText, BookOpen, BarChart3, Star } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * ModulePopup - Modal that appears when clicking a module
 * Contains: Content Toggle, Difficulty Badge, Start Button
 */
const ModulePopup = ({ 
  isOpen, 
  onClose, 
  module,
  onStart,
}) => {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const [contentType, setContentType] = React.useState(module?.contentType || 'url');

  if (!module) return null;

  // Difficulty badge configuration
  const getDifficultyConfig = (difficulty) => {
    switch (difficulty) {
      case 'easy':
        return {
          label: t('common:easy', 'Facile'),
          className: 'bg-green-100 text-green-700 border-green-300',
          icon: <Star className="h-3 w-3 fill-green-500 text-green-500" />,
        };
      case 'medium':
        return {
          label: t('common:medium', 'Moyen'),
          className: 'bg-yellow-100 text-yellow-700 border-yellow-300',
          icon: (
            <>
              <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
              <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
            </>
          ),
        };
      case 'hard':
        return {
          label: t('common:hard', 'Difficile'),
          className: 'bg-red-100 text-red-700 border-red-300',
          icon: (
            <>
              <Star className="h-3 w-3 fill-red-500 text-red-500" />
              <Star className="h-3 w-3 fill-red-500 text-red-500" />
              <Star className="h-3 w-3 fill-red-500 text-red-500" />
            </>
          ),
        };
      default:
        return {
          label: t('common:medium', 'Moyen'),
          className: 'bg-muted text-muted-foreground border-gray-300',
          icon: <Star className="h-3 w-3 text-gray-500" />,
        };
    }
  };

  const difficultyConfig = getDifficultyConfig(module.difficulty);

  const handleStart = () => {
    if (onStart) {
      onStart(module, contentType);
    } else {
      navigate(`/subjects/${module.id || module._id}`);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {/* Module color indicator */}
              <div 
                className="h-12 w-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: module.color || '#6366f1' }}
              >
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  {module.name}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 mt-1">
                  <span>{module.semester}</span>
                  {module.totalQuestions && (
                    <>
                      <span>•</span>
                      <span>{module.totalQuestions} questions</span>
                    </>
                  )}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Difficulty Badge */}
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-muted-foreground">
              {t('common:difficulty', 'Difficulté')}
            </Label>
            <Badge 
              variant="outline" 
              className={cn("flex items-center gap-1 px-3 py-1", difficultyConfig.className)}
            >
              {difficultyConfig.icon}
              <span className="ml-1">{difficultyConfig.label}</span>
            </Badge>
          </div>

          {/* Content Type Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center transition-colors",
                contentType === 'url' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
              )}>
                <Image className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-sm">
                  {t('common:content_type', 'Type de contenu')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {contentType === 'url' 
                    ? t('common:image_pdf', 'Images / PDF') 
                    : t('common:text_content', 'Texte')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Image className={cn("h-4 w-4", contentType === 'url' ? 'text-primary' : 'text-muted-foreground')} />
              <Switch
                checked={contentType === 'text'}
                onCheckedChange={(checked) => setContentType(checked ? 'text' : 'url')}
              />
              <FileText className={cn("h-4 w-4", contentType === 'text' ? 'text-primary' : 'text-muted-foreground')} />
            </div>
          </div>

          {/* Help Text / Info */}
          {module.helpContent && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">{module.helpContent}</p>
            </div>
          )}

          {/* Module Stats */}
          {module.stats && (
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-2xl font-bold">{module.stats.exams || 0}</p>
                <p className="text-xs text-muted-foreground">{t('common:exams', 'Examens')}</p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-2xl font-bold">{module.stats.questions || 0}</p>
                <p className="text-xs text-muted-foreground">{t('common:questions', 'Questions')}</p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-2xl font-bold">{module.stats.progress || 0}%</p>
                <p className="text-xs text-muted-foreground">{t('common:progress', 'Progrès')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Start Button */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            {t('common:cancel', 'Annuler')}
          </Button>
          <Button 
            className="flex-1 gap-2" 
            onClick={handleStart}
            style={{ backgroundColor: module.color || '#6366f1' }}
          >
            <Play className="h-4 w-4" />
            {t('dashboard:start_module', 'Commencer le module')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModulePopup;
