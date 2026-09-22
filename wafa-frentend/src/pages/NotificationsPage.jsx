import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Bell, CheckCheck, ChevronLeft, ChevronRight, FileText, Loader2, Star, Trash2, Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared";
import { cn } from "@/lib/utils";
import { notificationService } from "@/services/notificationService";
import { toast } from "sonner";

const PAGE_SIZE = 20;

const notificationIcon = (type) => ({
  exam_result: Trophy,
  note_created: FileText,
  achievement: Star,
  subscription: Zap,
  system: AlertCircle,
}[type] || Bell);

const notificationColor = (type) => ({
  exam_result: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
  note_created: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
  achievement: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400",
  subscription: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
  system: "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400",
}[type] || "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400");

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  return date.toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await notificationService.getNotifications(page, PAGE_SIZE);
      const data = response?.data || {};
      setNotifications(data.notifications || []);
      setTotalPages(Math.max(1, Number(data.totalPages) || 1));
      setTotal(Number(data.total) || 0);
    } catch (loadError) {
      console.error("Error fetching notifications:", loadError);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markAsReadAndFollowLink = async (notification) => {
    try {
      if (!notification.read) {
        await notificationService.markAsRead(notification._id);
        setNotifications((items) => items.map((item) => (
          item._id === notification._id ? { ...item, read: true } : item
        )));
      }
      if (notification.link) navigate(notification.link);
    } catch (requestError) {
      console.error("Error updating notification:", requestError);
      toast.error("Impossible de mettre à jour la notification");
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((items) => items.map((item) => ({ ...item, read: true })));
      toast.success("Toutes les notifications ont été marquées comme lues");
    } catch (requestError) {
      console.error("Error marking notifications as read:", requestError);
      toast.error("Impossible de mettre à jour les notifications");
    }
  };

  const removeNotification = async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);
      if (notifications.length === 1 && page > 1) setPage((current) => current - 1);
      else loadNotifications();
      toast.success("Notification supprimée");
    } catch (requestError) {
      console.error("Error deleting notification:", requestError);
      toast.error("Impossible de supprimer la notification");
    }
  };

  const hasUnread = notifications.some((notification) => !notification.read);

  return (
    <main className="min-h-full bg-background p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          title="Notifications"
          description={total > 0 ? `${total} notification${total > 1 ? "s" : ""}` : "Vous êtes à jour"}
          showBack
          backTo="/dashboard/home"
          actions={hasUnread ? (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-2">
              <CheckCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Tout marquer comme lu</span>
              <span className="sm:hidden">Tout lire</span>
            </Button>
          ) : null}
        />

        <Card className="mt-6 overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-muted-foreground">
                <Loader2 className="h-7 w-7 animate-spin" />
                <p className="text-sm">Chargement des notifications…</p>
              </div>
            ) : error ? (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
                <AlertCircle className="h-9 w-9 text-destructive" />
                <p className="font-medium">Impossible de charger les notifications</p>
                <Button variant="outline" onClick={loadNotifications}>Réessayer</Button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
                <Bell className="h-11 w-11 text-muted-foreground/40" />
                <p className="font-medium">Aucune notification</p>
                <p className="text-sm text-muted-foreground">Les nouvelles informations apparaîtront ici.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notification) => {
                  const Icon = notificationIcon(notification.type);
                  return (
                    <article key={notification._id} className={cn("flex gap-3 p-4 sm:p-5", !notification.read && "bg-blue-50/40 dark:bg-blue-950/20")}>
                      <div className={cn("mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl", notificationColor(notification.type))}>
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <button type="button" onClick={() => markAsReadAndFollowLink(notification)} className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            <div className="flex items-start gap-2">
                              <h2 className={cn("text-sm font-semibold text-foreground sm:text-base", !notification.read && "font-bold")}>{notification.title || "Notification"}</h2>
                              {!notification.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cyan-500" aria-label="Non lue" />}
                            </div>
                            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{notification.message || ""}</p>
                            <p className="mt-2 text-xs text-muted-foreground/80">{formatDate(notification.createdAt)}</p>
                          </button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeNotification(notification._id)} aria-label={`Supprimer la notification : ${notification.title || "sans titre"}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {!loading && !error && totalPages > 1 && (
          <div className="mt-5 flex items-center justify-between gap-3">
            <Button variant="outline" onClick={() => setPage((current) => current - 1)} disabled={page === 1} className="gap-1">
              <ChevronLeft className="h-4 w-4" /> Précédent
            </Button>
            <span className="text-sm text-muted-foreground">Page {page} sur {totalPages}</span>
            <Button variant="outline" onClick={() => setPage((current) => current + 1)} disabled={page === totalPages} className="gap-1">
              Suivant <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
