import { Router } from "express";
import { NotificationController } from "../controllers/notificationController.js";
import { isAuthenticated, isAdmin } from "../middleware/authMiddleware.js";

const router = Router();

// All routes require authentication
router.use(isAuthenticated);

// Get all notifications with pagination
router.get("/", NotificationController.getNotifications);

// Get unread notification count
router.get("/unread-count", NotificationController.getUnreadCount);

// Mark a specific notification as read
router.put("/:id/read", NotificationController.markAsRead);

// Mark all notifications as read
router.put("/read-all", NotificationController.markAllAsRead);

// Delete a notification
router.delete("/:id", NotificationController.deleteNotification);

// Admin routes for sending notifications
router.post("/admin/send-system", isAdmin, NotificationController.sendSystemNotification);
router.post("/admin/send-broadcast", isAdmin, NotificationController.sendBroadcastNotification);

// Test route to create sample notifications (for development only)
router.post("/create-samples", async (req, res) => {
  try {
    const userId = req.user._id;
    const samples = [
      {
        type: "exam_result",
        title: "Résultat d'examen disponible",
        message: "Votre résultat pour l'examen de Physiologie S1 est maintenant disponible. Score: 85%",
        link: "/dashboard/results"
      },
      {
        type: "achievement",
        title: "Nouveau badge débloqué !",
        message: "Félicitations ! Vous avez débloqué le badge 'Expert en Anatomie'",
        link: "/dashboard/profile"
      },
      {
        type: "note_created",
        title: "Note sauvegardée",
        message: "Votre note sur le chapitre 'Système cardiovasculaire' a été sauvegardée",
        link: "/dashboard/note"
      },
      {
        type: "subscription",
        title: "Abonnement activé",
        message: "Votre abonnement Premium a été activé avec succès. Profitez de tous les avantages !",
        link: "/dashboard/subscription"
      },
      {
        type: "system",
        title: "Mise à jour disponible",
        message: "Une nouvelle version de YourQCM est disponible avec de nouvelles fonctionnalités",
        link: "/dashboard/home"
      }
    ];

    for (const sample of samples) {
      await NotificationController.createNotification(
        userId,
        sample.type,
        sample.title,
        sample.message,
        sample.link
      );
    }

    res.status(201).json({
      success: true,
      message: "Sample notifications created successfully"
    });
  } catch (error) {
    console.error("Error creating sample notifications:", error);
    res.status(500).json({
      success: false,
      message: "Error creating sample notifications"
    });
  }
});

export default router;
