import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Users, Flag, FileText, CreditCard, Mail, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/utils';

const eventTypes = {
  user: { label: 'Inscriptions', icon: Users },
  report: { label: 'Questions signalées', icon: Flag },
  explanation: { label: 'Explications', icon: FileText },
  payment: { label: 'Demandes de paiement', icon: CreditCard },
  contact: { label: 'Messages de contact', icon: Mail },
};
const statuses = { pending: 'En attente', approved: 'Approuvé', completed: 'Approuvé', rejected: 'Rejeté', resolved: 'Résolu', closed: 'Fermé', cancelled: 'Annulé', 'in-progress': 'En cours', failed: 'Échoué', refunded: 'Remboursé' };
const formatNumber = value => Number(value).toLocaleString('fr-FR');

// Avoid overlapping polls and ignore stale responses after a filter change.
function useLiveData(path, interval, revision) {
  const [state, setState] = useState({ path, data: null, loading: true, error: '', updatedAt: null });
  useEffect(() => {
    const controller = new AbortController();
    let timer;
    let busy = false;
    const refresh = async () => {
      if (busy || controller.signal.aborted) return;
      clearTimeout(timer);
      busy = true;
      try {
        const response = await api.get(path, { signal: controller.signal });
        if (!controller.signal.aborted) setState({ path, data: response.data.data, loading: false, error: '', updatedAt: new Date() });
      } catch (error) {
        if (!controller.signal.aborted) setState(previous => ({
          ...(previous.path === path ? previous : { path, data: null, updatedAt: null }), loading: false,
          error: [401, 403].includes(error.response?.status) ? 'Accès refusé. Vérifiez votre session administrateur.' : 'Actualisation impossible. Les dernières données disponibles sont conservées.',
        }));
      } finally {
        busy = false;
        if (!controller.signal.aborted) timer = setTimeout(() => {
          if (document.visibilityState === 'visible') refresh();
        }, interval);
      }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => { controller.abort(); clearTimeout(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [path, interval, revision]);
  return state.path === path ? state : { data: null, loading: true, error: '', updatedAt: null };
}

export default function AnalyticsPage() {
  const [type, setType] = useState('all');
  const [revision, setRevision] = useState(0);
  const stats = useLiveData('/admin/analytics/dashboard-stats', 60000, revision);
  const feed = useLiveData('/admin/analytics/recent-activity?limit=50&type=' + type, 5000, revision);
  const metrics = stats.data ? [
    ['Étudiants inscrits', formatNumber(stats.data.totalUsers), 'Comptes étudiants, hors administrateurs.'],
    ['Comptes actifs', formatNumber(stats.data.activeUsers), 'Comptes activés et non bloqués.'],
    ['Conversion aux abonnements', formatNumber(stats.data.conversionRate) + ' %', formatNumber(stats.data.activeSubscriptions) + ' abonnements payants actifs / étudiants inscrits.'],
    ['Réponses vérifiées', formatNumber(stats.data.verifiedAnswers), 'Réponses validées par les étudiants dans les examens.'],
  ] : [];
  return <div className="space-y-6 p-4 sm:p-6">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-2xl font-bold">Vue d’ensemble</h1><p className="text-sm text-muted-foreground">Utilisation de la plateforme et dernières actions des étudiants.</p></div>
      <Button variant="outline" onClick={() => setRevision(value => value + 1)}><RefreshCw className="mr-2 h-4 w-4" />Actualiser</Button>
    </header>
    {stats.error && <p role="alert" className="rounded-lg border border-destructive p-3 text-sm">Statistiques : {stats.error}</p>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy={stats.loading}>
      {stats.loading ? <p role="status">Chargement des statistiques…</p> : metrics.map(([label, value, description]) => <Card key={label}>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle></CardHeader>
        <CardContent><p className="text-3xl font-bold">{value}</p><p className="mt-2 text-xs text-muted-foreground">{description}</p></CardContent>
      </Card>)}
    </div>
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" />Activité Récente</CardTitle>
          <div><label htmlFor="activity-type" className="sr-only">Type d’activité</label><select id="activity-type" value={type} onChange={event => setType(event.target.value)} className="max-w-full rounded-md border bg-background p-2 text-sm">
            <option value="all">Toutes les activités</option>
            {Object.entries(eventTypes).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
          </select></div>
        </div>
        <CardDescription>Les 50 derniers événements, du plus récent au plus ancien. Actualisation automatique toutes les 5 secondes.</CardDescription>
        {feed.updatedAt && <p className="text-xs text-muted-foreground">Dernière mise à jour : {feed.updatedAt.toLocaleTimeString('fr-FR')}</p>}
      </CardHeader>
      <CardContent>
        {feed.error && <p role="alert" className="mb-4 rounded-lg border border-destructive p-3 text-sm">{feed.error}</p>}
        <div aria-live="polite" aria-busy={feed.loading}>
          {feed.loading ? <p role="status">Chargement des activités…</p> : feed.data?.length === 0 ? <p className="py-10 text-center text-muted-foreground">Aucune activité pour le moment.</p> : <ol className="divide-y">
            {(feed.data || []).map(event => {
              const Icon = eventTypes[event.type]?.icon || Activity;
              return <li key={event.id} className="flex items-start gap-3 py-4">
                <span className="rounded-full bg-muted p-2"><Icon className="h-4 w-4" aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><Link to={event.href} className="font-medium underline-offset-4 hover:underline">{event.action}</Link>{event.status && <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{statuses[event.status] || event.status}</span>}</div>
                  <p className="break-words text-sm">{event.user}</p>
                  {event.detail && <p className="mt-1 break-words text-sm text-muted-foreground">{event.detail}</p>}
                  <time dateTime={event.time} className="mt-1 block text-xs text-muted-foreground">{new Date(event.time).toLocaleString('fr-FR')}</time>
                </div>
              </li>;
            })}
          </ol>}
        </div>
      </CardContent>
    </Card>
  </div>;
}
