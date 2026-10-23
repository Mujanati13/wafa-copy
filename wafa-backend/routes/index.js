
import { invalidateModuleListCache } from "../controllers/moduleController.js";
import { Router } from "express";
import examRoute from "./examRoute.js";
import moduleRoute from "./modueRoute.js";
import questionRoute from "./questionRoute.js";
import reportQuestionsRoute from "./reportQuestionsRoute.js";
import authRoute from "./authRoute.js";
import explanationsRoute from "./explanationRoute.js";
import resumesRoute from "./resumeRoute.js";
import userRoute from "./userRoute.js";
import contactRoute from "./contactRoute.js";
import playlistRoute from "./playlistRoute.js";
import noteRoute from "./noteRoute.js";
import paymentRoute from "./paymentRoute.js";
import notificationRoute from "./notificationRoute.js";
import adminAnalyticsRoute from "./adminAnalyticsRoute.js";
import subscriptionPlanRoute from "./subscriptionPlanRoute.js";
import paypalSettingsRoute from "./paypalSettingsRoute.js";
import landingPageSettingsRoute from "./landingPageSettingsRoute.js";
import examCourseRoute from "./examCourseRoute.js";
import settingsRoute from "./settingsRoute.js";
import qcmBanqueRoute from "./qcmBanqueRoute.js";
import courseCategoryRoute from "./courseCategoryRoute.js";
import feedbackRoute from "./feedbackRoute.js";

const router = Router();

router.use((req, res, next) => {
    const contentWrite = !['GET', 'HEAD', 'OPTIONS'].includes(req.method)
        && /^\/(modules|exams|qcm-banque|exam-courses|course-categories)(?:\/|$)/.test(req.path);
    if (contentWrite) res.on('finish', () => { if (res.statusCode < 400) invalidateModuleListCache(); });
    next();
});

router.use("/exams", examRoute);
router.use("/qcm-banque", qcmBanqueRoute);
router.use("/modules", moduleRoute);
router.use("/questions", questionRoute);
router.use("/report-questions", reportQuestionsRoute);
router.use("/auth", authRoute);
router.use("/explanations", explanationsRoute);
router.use("/resumes", resumesRoute);
router.use("/users", userRoute);
router.use("/contact", contactRoute);
router.use("/playlists", playlistRoute);
router.use("/notes", noteRoute);
router.use("/payments", paymentRoute);
router.use("/notifications", notificationRoute);
router.use("/admin/analytics", adminAnalyticsRoute);
router.use("/subscription-plans", subscriptionPlanRoute);
router.use("/paypal-settings", paypalSettingsRoute);
router.use("/landing-settings", landingPageSettingsRoute);
router.use("/exam-courses", examCourseRoute);
router.use("/course-categories", courseCategoryRoute);
router.use("/settings", settingsRoute);
router.use("/feedbacks", feedbackRoute);

export default router;
