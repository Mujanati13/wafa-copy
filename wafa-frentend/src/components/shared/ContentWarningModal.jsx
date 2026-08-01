import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, X, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

/**
 * ContentWarningModal - Global alert for user uploads
 * Displays warning about content policy before uploads
 * Used for: Profile Picture, Explanations, Reports
 */
const ContentWarningModal = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  uploadType = 'content', // 'profile', 'explanation', 'report'
  children,
}) => {
  const { t } = useTranslation(['common', 'dashboard']);
  const [accepted, setAccepted] = React.useState(false);

  const handleConfirm = () => {
    if (accepted) {
      onConfirm?.();
      setAccepted(false);
    }
  };

  const handleClose = () => {
    setAccepted(false);
    onClose?.();
  };

  const getUploadTypeLabel = () => {
    switch (uploadType) {
      case 'profile':
        return t('common:profile_picture', 'photo de profil');
      case 'explanation':
        return t('common:explanation', 'explication');
      case 'report':
        return t('common:report', 'signalement');
      default:
        return t('common:content', 'contenu');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md overflow-hidden p-0">
        {/* Red Header Section */}
        <div className="bg-red-500 px-6 py-8 text-center space-y-3">
          <div className="flex justify-center mb-2">
            <div className="h-16 w-16 rounded-full bg-background flex items-center justify-center shadow-lg">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white">
            {t('common:warning', 'WARNING!')}
          </h2>
        </div>

        {/* Content Section */}
        <div className="px-6 py-6 space-y-4">
          <div className="space-y-4">
            <p className="text-base font-semibold text-foreground">
              {t('common:upload_warning_title', 'Aucun contenu (text, image, pdf ...)')}
            </p>
            
            {/* Prohibited Content List */}
            <div className="space-y-2 ml-2">
              <p className="text-sm text-muted-foreground font-medium mb-2">
                {t('common:prohibited_content', 'Contenu strictement interdit:')}
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold mt-0.5">•</span>
                  <span>{t('common:no_illegal', 'illégal qui est n\'est pas bien (pornographique ...) ou les chose qui est hors sujet, n\'est autorisé.')}</span>
                </li>
              </ul>
            </div>

            {/* Risk Warning Box */}
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md mt-4">
              <p className="text-red-700 font-semibold text-sm">
                {t('common:account_deletion_risk', 'Le non-respect de cette règle entraînera la suppression définitive de votre compte.')}
              </p>
            </div>

            {/* Acceptance Checkbox */}
            <div className="flex items-start gap-3 pt-4">
              <Checkbox 
                id="accept-terms"
                checked={accepted}
                onCheckedChange={setAccepted}
                className="mt-1"
              />
              <Label 
                htmlFor="accept-terms" 
                className="text-xs leading-relaxed cursor-pointer text-muted-foreground"
              >
                {t('common:accept_content_policy', "J'ai lu et j'accepte la politique de contenu. Je comprends que mon compte peut être supprimé en cas de violation.")}
              </Label>
            </div>
          </div>
        </div>

        {/* Button Section */}
        <div className="px-6 py-4 bg-card flex gap-3">
          <Button 
            variant="outline" 
            onClick={handleClose}
            className="flex-1 h-12 font-semibold text-muted-foreground border-2"
          >
            {t('common:cancel', 'Annuler')}
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!accepted}
            className="flex-1 h-12 font-semibold text-white bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {t('common:confirm_upload', 'ok')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContentWarningModal;
