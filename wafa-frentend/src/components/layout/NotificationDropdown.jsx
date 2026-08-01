import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, Trash2, CheckCheck, Trophy, FileText, Star, AlertCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { notificationService } from "@/services/notificationService";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const NotificationDropdown = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const response = await notificationService.getNotifications(1, 10);
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const response = await notificationService.getUnreadCount();
      setUnreadCount(response.data.count || 0);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  // Mark as read and navigate
  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.read) {
        await notificationService.markAsRead(notification._id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((n) => (n._id === notification._id ? { ...n, read: true } : n))
        );
      }
      if (notification.link) {
        navigate(notification.link);
        setOpen(false);
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success("Toutes les notifications ont été marquées comme lues");
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  // Delete notification
  const handleDelete = async (e, notificationId) => {
    e.stopPropagation();
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
      const deletedNotification = notifications.find((n) => n._id === notificationId);
      if (deletedNotification && !deletedNotification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      toast.success("Notification supprimée");
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  // Initial load
  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, []);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications();
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Refresh when dropdown opens
  useEffect(() => {
    if (open) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [open]);

  // Get icon based on notification type
  const getNotificationIcon = (type) => {
    const iconMap = {
      exam_result: Trophy,
      note_created: FileText,
      achievement: Star,
      subscription: Zap,
      system: AlertCircle,
    };
    const Icon = iconMap[type] || Bell;
    return Icon;
  };

  // Get color based on notification type
  const getNotificationColor = (type) => {
    const colorMap = {
      exam_result: "text-yellow-600 bg-yellow-50",
      note_created: "text-blue-600 bg-blue-50",
      achievement: "text-purple-600 bg-purple-50",
      subscription: "text-green-600 bg-green-50",
      system: "text-slate-600 bg-slate-50",
    };
    return colorMap[type] || "text-slate-600 bg-slate-50";
  };

  // Format relative time in French
  const getRelativeTime = (date) => {
    if (!date) return "Date inconnue";
    
    const now = new Date();
    const notificationDate = new Date(date);
    
    // Check if date is valid
    if (isNaN(notificationDate.getTime())) {
      return "Date invalide";
    }
    
    const diffInSeconds = Math.floor((now - notificationDate) / 1000);

    if (diffInSeconds < 60) return "À l'instant";
    if (diffInSeconds < 3600) return `Il y a ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Il y a ${Math.floor(diffInSeconds / 3600)} h`;
    if (diffInSeconds < 604800) return `Il y a ${Math.floor(diffInSeconds / 86400)} j`;
    
    try {
      return notificationDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    } catch (error) {
      return "Date invalide";
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center p-0 text-[10px] animate-pulse"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px] p-0" style={{ zIndex: 9999 }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold text-base">Notifications</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}` : "Tout est à jour"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="gap-2 h-8 text-xs"
            >
              <CheckCheck className="h-3 w-3" />
              Tout marquer
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className="max-h-[400px]">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">Chargement...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">Aucune notification</p>
              <p className="text-xs text-muted-foreground mt-1">Vous êtes à jour !</p>
            </div>
          ) : (
            <div className="py-2">
              <AnimatePresence>
                {notifications.map((notification, index) => {
                  const Icon = getNotificationIcon(notification.type);
                  const colorClass = getNotificationColor(notification.type);

                  return (
                    <motion.div
                      key={notification._id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <button
                        onClick={() => handleNotificationClick(notification)}
                        className={cn(
                          "w-full px-4 py-3 flex items-start gap-3 hover:bg-accent transition-colors text-left",
                          !notification.read && "bg-blue-50/50"
                        )}
                      >
                        <div className={cn("p-2 rounded-lg flex-shrink-0 mt-0.5", colorClass)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className={cn("text-sm font-medium", !notification.read && "text-foreground")}>
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                          <p className="text-xs text-muted-foreground/70 mt-1">{getRelativeTime(notification.createdAt)}</p>
                        </div>
                        <button
                          onClick={(e) => handleDelete(e, notification._id)}
                          className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </button>
                      {index < notifications.length - 1 && <Separator />}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full text-xs h-8"
                onClick={() => {
                  navigate("/dashboard/notifications");
                  setOpen(false);
                }}
              >
                Voir toutes les notifications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationDropdown;
