import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { completeGoogleRedirect, hasPendingGoogleRedirect } from '@/services/authService';
import { userService } from '@/services/userService';
import { getLoginDestination } from '@/utils/authNavigation';

export default function GoogleRedirectHandler({ children }) {
  const navigate = useNavigate();
  const [pending, setPending] = useState(hasPendingGoogleRedirect);

  useEffect(() => {
    if (!pending) return;

    let active = true;
    completeGoogleRedirect().then(async (result) => {
      if (!result || !active) return;
      localStorage.setItem('user', JSON.stringify(result.user));
      localStorage.setItem('userProfile', JSON.stringify(result.user));

      let destinationUser = result.user;
      try {
        const profile = await userService.getUserProfile(true);
        if (!active) return;
        localStorage.setItem('user', JSON.stringify(profile));
        localStorage.setItem('userProfile', JSON.stringify(profile));
        destinationUser = profile;
      } catch (error) {
        console.error('Error fetching full profile after Google redirect:', error);
      }

      if (!active) return;
      window.dispatchEvent(new Event('auth-state-changed'));
      navigate(getLoginDestination(destinationUser), { replace: true });
      toast.success('Connexion réussie');
    }).catch((error) => {
      if (!active) return;
      toast.error('Erreur d’authentification', { description: error.message });
    }).finally(() => {
      if (active) setPending(false);
    });

    return () => { active = false; };
  }, [navigate, pending]);

  if (pending) {
    return <div className="flex min-h-screen items-center justify-center" role="status">Connexion avec Google en cours…</div>;
  }
  return children;
}
