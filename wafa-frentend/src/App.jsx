import "./index.css";
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Outlet,
} from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import RedesignedLandingPage from "./components/RedesignedLandingPage";
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import LearnerExperienceLayout from "./components/layout/LearnerExperienceLayout";
import LearnerDashboard from "./pages/LearnerDashboard";
import ExamPage from "./pages/ExamPage";
import ResultsPage from "./pages/ResultsPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import ProgressPage from "./pages/ProgressPage";
import SubjectsPage from "./pages/SubjectsPage";
import AdminLayout from "./components/layout/AdminLayout";
import AdminPage from "./pages/AdminPage";
import AnayticsPage from "./pages/AnayticsPage";
import UsersWithTabs from "./components/admin/UsersWithTabs";
import SubscriptionPage from "./pages/SubscriptionPage";
import ClientSubscriptionPage from "./pages/ClientSubscriptionPage";
import ReportQuestionsAdmin from "./pages/ReportQuestionsAdmin";
import Explications from "./pages/Explications";
import Resumes from "./pages/Resumes";
import DemandesDePayements from "./pages/DemandesDePayements";
import Leaderboard from "./pages/Leaderboard";
import Semesters from "./pages/Semesters";
import Module from "./pages/Module";
import CategoriesOfModules from "./pages/CategoriesOfModules";
import ExamParYears from "./pages/ExamParYears";
import ExamCourses from "./pages/ExamCourses";
import ImportExamParYears from "./pages/ImportExamParYears";
import ImportExamParCourse from "./pages/ImportExamParCourse";
import ImportQCMBanque from "./pages/ImportQCMBanque";
import QCMBanque from "./pages/QCMBanque";
import ImportResumes from "./pages/ImportResumes";
import AddQuestions from "./pages/AddQuestions";
import ImportImages from "./pages/ImportImages";
import ImportExplications from "./pages/ImportExplications";
import GenerateExplanationsAI from "./pages/GenerateExplanationsAI";
import CreateCategoriesForCourses from "./pages/CreateCategoriesForCourses";
import Myplaylist from "./pages/Myplaylist";
import LeaderboardClient from "./pages/LeaderboardClient";
import VerifyEmail from "./pages/VerifyEmail";
import VerifyEmailFirebase from "./pages/VerifyEmailFirebase";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ContactPage from "./pages/ContactPage";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";
import PlaylistsPage from "./pages/PlaylistsPage";
import NotesPage from "./pages/NotesPage";
import SupportPage from "./pages/SupportPage";
import NotificationAdmin from "./pages/NotificationAdmin";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsOfUsePage from "./pages/TermsOfUsePage";
import SubAdminPage from "./pages/SubAdminPage";
import AdminPaypalSettings from "./pages/AdminPaypalSettings";
import LandingPageAdmin from "./pages/LandingPageAdmin";
import FeedbacksAdmin from "./pages/FeedbacksAdmin";
import PrivacyPolicyAdmin from "./pages/PrivacyPolicyAdmin";
import ContactMessagesAdmin from "./pages/ContactMessagesAdmin";
import StatisticsPage from "./pages/StatisticsPage";
import SelectFreeSemester from "./pages/SelectFreeSemester";
import ProtectedAdminRoute from "./components/layout/ProtectedAdminRoute";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import AdminLogin from "./components/auth/AdminLogin";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <Router>
      <Toaster position="top-right" />
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
          <Route path="exams" element={<SubjectsPage />} />
          {/* <Route path="exam/:examId" element={<ExamPage />} /> */}
          <Route path="results" element={<ResultsPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="subjects" element={<SubjectsPage />} />
          <Route path="subjects/:courseId" element={<SubjectsPage />} />
          <Route
            path="calendar"
            element={<p className="text-white">calendar</p>}
          />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
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
    </Router>
  );
}
