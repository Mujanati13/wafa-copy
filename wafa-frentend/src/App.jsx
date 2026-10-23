import "./index.css";
import React, { lazy } from "react";
const RouteBoundary = lazy(() => import("./components/shared/RouteBoundary"));
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
const RedesignedLandingPage = lazy(() => import("./components/RedesignedLandingPage"));
const Login = lazy(() => import("./components/auth/Login"));
const Register = lazy(() => import("./components/auth/Register"));
const LearnerExperienceLayout = lazy(() => import("./components/layout/LearnerExperienceLayout"));
const LearnerDashboard = lazy(() => import("./pages/LearnerDashboard"));
const ExamPage = lazy(() => import("./pages/ExamPage"));
const ResultsPage = lazy(() => import("./pages/ResultsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ProgressPage = lazy(() => import("./pages/ProgressPage"));
const SubjectsPage = lazy(() => import("./pages/SubjectsPage"));
const AdminLayout = lazy(() => import("./components/layout/AdminLayout"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const AnayticsPage = lazy(() => import("./pages/AnayticsPage"));
const UsersWithTabs = lazy(() => import("./components/admin/UsersWithTabs"));
const SubscriptionPage = lazy(() => import("./pages/SubscriptionPage"));
const ClientSubscriptionPage = lazy(() => import("./pages/ClientSubscriptionPage"));
const ReportQuestionsAdmin = lazy(() => import("./pages/ReportQuestionsAdmin"));
const Explications = lazy(() => import("./pages/Explications"));
const Resumes = lazy(() => import("./pages/Resumes"));
const DemandesDePayements = lazy(() => import("./pages/DemandesDePayements"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Semesters = lazy(() => import("./pages/Semesters"));
const Module = lazy(() => import("./pages/Module"));
const CategoriesOfModules = lazy(() => import("./pages/CategoriesOfModules"));
const ExamParYears = lazy(() => import("./pages/ExamParYears"));
const ExamCourses = lazy(() => import("./pages/ExamCourses"));
const ImportExamParYears = lazy(() => import("./pages/ImportExamParYears"));
const ImportExamParCourse = lazy(() => import("./pages/ImportExamParCourse"));
const ImportQCMBanque = lazy(() => import("./pages/ImportQCMBanque"));
const QCMBanque = lazy(() => import("./pages/QCMBanque"));
const ImportResumes = lazy(() => import("./pages/ImportResumes"));
const AddQuestions = lazy(() => import("./pages/AddQuestions"));
const ImportImages = lazy(() => import("./pages/ImportImages"));
const ImportExplications = lazy(() => import("./pages/ImportExplications"));
const GenerateExplanationsAI = lazy(() => import("./pages/GenerateExplanationsAI"));
const CreateCategoriesForCourses = lazy(() => import("./pages/CreateCategoriesForCourses"));
const Myplaylist = lazy(() => import("./pages/Myplaylist"));
const LeaderboardClient = lazy(() => import("./pages/LeaderboardClient"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const VerifyEmailFirebase = lazy(() => import("./pages/VerifyEmailFirebase"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCancel = lazy(() => import("./pages/PaymentCancel"));
const PlaylistsPage = lazy(() => import("./pages/PlaylistsPage"));
const NotesPage = lazy(() => import("./pages/NotesPage"));
const SupportPage = lazy(() => import("./pages/SupportPage"));
const NotificationAdmin = lazy(() => import("./pages/NotificationAdmin"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const TermsOfUsePage = lazy(() => import("./pages/TermsOfUsePage"));
const SubAdminPage = lazy(() => import("./pages/SubAdminPage"));
const AdminPaypalSettings = lazy(() => import("./pages/AdminPaypalSettings"));
const LandingPageAdmin = lazy(() => import("./pages/LandingPageAdmin"));
const FeedbacksAdmin = lazy(() => import("./pages/FeedbacksAdmin"));
const PrivacyPolicyAdmin = lazy(() => import("./pages/PrivacyPolicyAdmin"));
const ContactMessagesAdmin = lazy(() => import("./pages/ContactMessagesAdmin"));
const StatisticsPage = lazy(() => import("./pages/StatisticsPage"));
const SelectFreeSemester = lazy(() => import("./pages/SelectFreeSemester"));
import ProtectedAdminRoute from "./components/layout/ProtectedAdminRoute";
import ProtectedRoute from "./components/layout/ProtectedRoute";
const AdminLogin = lazy(() => import("./components/auth/AdminLogin"));
const NotFound = lazy(() => import("./pages/NotFound"));

export default function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <RouteBoundary>
      <Routes>
        <Route path="/" element={<RedesignedLandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/verify-email-firebase" element={<VerifyEmailFirebase />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms-of-use" element={<TermsOfUsePage />} />
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/cancel" element={<PaymentCancel />} />
        <Route path="/select-semester" element={<SelectFreeSemester />} />

        <Route path="/dashboard" element={<ProtectedRoute><LearnerExperienceLayout /></ProtectedRoute>}>
          <Route path="home" element={<LearnerDashboard />} />
          <Route path="playlist" element={<Myplaylist />} />
          <Route path="playlists" element={<PlaylistsPage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="note" element={<NotesPage />} />
          <Route path="leaderboard" element={<LeaderboardClient />} />
          <Route path="subscription" element={<ClientSubscriptionPage />} />
          <Route path="statistics" element={<StatisticsPage />} />
          <Route path="exams" element={<Navigate to="/dashboard/home#modules" replace />} />
          {/* <Route path="exam/:examId" element={<ExamPage />} /> */}
          <Route path="results" element={<ResultsPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="subjects" element={<Navigate to="/dashboard/home#modules" replace />} />
          <Route path="subjects/:courseId" element={<SubjectsPage />} />
          <Route
            path="calendar"
            element={<p className="text-white">calendar</p>}
          />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="support" element={<SupportPage />} />
        </Route>
        <Route path="/admin" element={<ProtectedAdminRoute><AdminLayout /></ProtectedAdminRoute>}>
          <Route path="analytics" element={<AnayticsPage />} />
          <Route path="users" element={<UsersWithTabs />} />
          <Route path="notifications" element={<NotificationAdmin />} />
          <Route path="sub-admins" element={<SubAdminPage />} />
          <Route path="subscription" element={<SubscriptionPage />} />
          <Route path="exams" element={<p>exams</p>} />
          <Route path="report-questions" element={<ReportQuestionsAdmin />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="explications" element={<Explications />} />
          <Route path="semesters" element={<Semesters />} />
          <Route path="module" element={<Module />} />
          <Route path="categoriesOfModules" element={<CategoriesOfModules />} />
          <Route path="examParYears" element={<ExamParYears />} />
          <Route path="importExamParCourse" element={<ImportExamParCourse />} />
          <Route path="examCourses" element={<ExamCourses />} />
          <Route path="qcmBanque" element={<QCMBanque />} />
          <Route path="resumes" element={<ImportResumes />} />
          <Route path="importResumes" element={<ImportResumes />} />
          <Route path="importImages" element={<ImportImages />} />
          <Route
            path="demandes-de-paiements"
            element={<DemandesDePayements />}
          />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="importExamParYears" element={<ImportExamParYears />} />
          <Route path="importQCMBanque" element={<ImportQCMBanque />} />
          <Route path="addQuestions" element={<AddQuestions />} />
          <Route path="importExplications" element={<ImportExplications />} />
          <Route path="generateExplanationsAI" element={<GenerateExplanationsAI />} />
          <Route
            path="createCategoriesForCourses"
            element={<CreateCategoriesForCourses />}
          />
          <Route path="paypal-settings" element={<AdminPaypalSettings />} />
          <Route path="landing-settings" element={<LandingPageAdmin />} />
          <Route path="feedbacks" element={<FeedbacksAdmin />} />
          <Route path="privacy-policy" element={<PrivacyPolicyAdmin />} />
          <Route path="contact-messages" element={<ContactMessagesAdmin />} />
        </Route>
        <Route path="/exam/:examId" element={<ProtectedRoute><ExamPage /></ProtectedRoute>} />

        {/* 404 Not Found - Must be last */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      </RouteBoundary>
    </Router>
  );
}
