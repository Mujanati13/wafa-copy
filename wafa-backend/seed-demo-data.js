import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import Module from "./models/moduleModel.js";
import ExamParYear from "./models/examParYearModel.js";
import ExamCourse from "./models/examCourseModel.js";
import CourseCategory from "./models/courseCategoryModel.js";
import QCMBanque from "./models/qcmBanqueModel.js";
import Question from "./models/questionModule.js";
import Resume from "./models/resumeModel.js";
import User from "./models/userModel.js";
import UserStats from "./models/userStatsModel.js";
import Notification from "./models/notificationModel.js";
import Note from "./models/noteModel.js";
import Playlist from "./models/playlistModel.js";
import Point from "./models/pointModel.js";
import Explanation from "./models/explanationModel.js";
import ReportQuestion from "./models/reportQuestions.js";
import SubscriptionPlan from "./models/subscriptionPlanModel.js";
import Transaction from "./models/transactionModel.js";
import Feedback from "./models/feedbackModel.js";
import Contact from "./models/contactModel.js";
import LandingPageSettings from "./models/landingPageSettingsModel.js";
import PrivacyPolicy from "./models/privacyPolicyModel.js";

dotenv.config();

const DEMO_PREFIX = "DEMO_SEED_2026";
const DEMO_PASSWORD = process.env.DEMO_SEED_PASSWORD;

const ensure = async (Model, filter, document) => Model.findOneAndUpdate(
  filter,
  { $setOnInsert: document },
  { new: true, upsert: true, setDefaultsOnInsert: true }
);

const ensureUser = async (document) => {
  const existing = await User.findOne({ email: document.email });
  if (existing) return existing;

  return User.create({
    ...document,
    password: await bcrypt.hash(DEMO_PASSWORD, 10),
    emailVerified: true,
  });
};

const questionOptions = (correctAnswer, alternatives) => [
  { text: correctAnswer, isCorrect: true },
  ...alternatives.map((text) => ({ text, isCorrect: false })),
];

const seedDemoData = async () => {
  if (!process.env.MONGO_URL) {
    throw new Error("MONGO_URL is required");
  }

  if (!DEMO_PASSWORD || DEMO_PASSWORD.length < 12) {
    throw new Error("Set DEMO_SEED_PASSWORD to a unique password of at least 12 characters before seeding");
  }

  await mongoose.connect(process.env.MONGO_URL);
  console.log("Connected to MongoDB");

  const semesters = [
    ["S1", "Anatomie clinique", "Bases anatomiques et repères cliniques"],
    ["S2", "Physiologie intégrée", "Fonctionnement des grands systèmes"],
    ["S3", "Biochimie médicale", "Métabolisme et applications cliniques"],
    ["S4", "Pharmacologie générale", "Principes de prescription et thérapeutique"],
    ["S5", "Imagerie médicale", "Introduction au diagnostic par imagerie"],
    ["S6", "Cardiologie", "Pathologies cardiovasculaires fréquentes"],
    ["S7", "Pédiatrie", "Santé et pathologies de l'enfant"],
    ["S8", "Médecine interne", "Raisonnement clinique multidisciplinaire"],
    ["S9", "Urgences", "Évaluation et prise en charge initiale"],
    ["S10", "Gynécologie-obstétrique", "Suivi de grossesse et santé reproductive"],
  ];
  const colors = ["#2563eb", "#7c3aed", "#db2777", "#ea580c", "#ca8a04", "#16a34a", "#0891b2", "#4f46e5", "#dc2626", "#9333ea"];

  const modules = {};
  for (const [index, [semester, subject, infoText]] of semesters.entries()) {
    const name = `Démo ${semester} — ${subject}`;
    modules[semester] = await ensure(Module, { name }, {
      name,
      semester,
      infoText,
      color: colors[index],
      order: 900 + index,
      category: "Exam par years",
      difficulty: "medium",
      contentType: "text",
      textContent: `Contenu de démonstration pour le ${semester}.`,
    });
  }

  const freeStudent = await ensureUser({
    username: "Demo Free Student",
    name: "Demo Free Student",
    email: "demo.free@wafa.test",
    plan: "Free",
    semesters: [],
    freeModules: [],
    hasUsedFreeSemester: false,
    university: "Université de démonstration",
    faculty: "Médecine",
    currentYear: "S1",
  });
  const student = await ensureUser({
    username: "Demo Premium Student",
    name: "Demo Premium Student",
    email: "demo.student@wafa.test",
    plan: "Premium",
    semesters: ["S1", "S2", "S3"],
    freeModules: [modules.S1.name],
    hasUsedFreeSemester: true,
    university: "Université de démonstration",
    faculty: "Médecine",
    currentYear: "S3",
  });
  const admin = await ensureUser({
    username: "Demo Administrator",
    name: "Demo Administrator",
    email: "demo.admin@wafa.test",
    isAdmin: true,
    adminRole: "super_admin",
    permissions: ["users", "content", "analytics", "payments", "notifications", "reports", "settings"],
    plan: "Premium",
    semesters: ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10"],
    hasUsedFreeSemester: true,
    university: "Université de démonstration",
    faculty: "Médecine",
    currentYear: "S10",
  });

  const anatomyExam = await ensure(ExamParYear, {
    name: "Démo Anatomie — Examen 2025",
    moduleId: modules.S1._id,
  }, {
    name: "Démo Anatomie — Examen 2025",
    moduleId: modules.S1._id,
    year: 2025,
    infoText: "Examen de démonstration avec correction.",
  });
  const physiologyExam = await ensure(ExamParYear, {
    name: "Démo Physiologie — Examen 2025",
    moduleId: modules.S2._id,
  }, {
    name: "Démo Physiologie — Examen 2025",
    moduleId: modules.S2._id,
    year: 2025,
    infoText: "Examen de démonstration avec correction.",
  });

  const qcmBank = await ensure(QCMBanque, { name: "Démo Banque QCM Anatomie" }, {
    name: "Démo Banque QCM Anatomie",
    moduleId: modules.S1._id,
    infoText: "Banque de questions de démonstration.",
  });

  const anatomyQuestion = await ensure(Question, {
    examId: anatomyExam._id,
    text: "Quel os est le plus long du corps humain ?",
  }, {
    examId: anatomyExam._id,
    questionNumber: 1,
    text: "Quel os est le plus long du corps humain ?",
    options: questionOptions("Le fémur", ["Le tibia", "L'humérus", "Le radius"]),
    note: "Le fémur est l'os le plus long et le plus résistant du corps humain.",
    sessionLabel: "Session de démonstration",
  });
  const heartQuestion = await ensure(Question, {
    examId: anatomyExam._id,
    text: "Combien de cavités possède le cœur humain ?",
  }, {
    examId: anatomyExam._id,
    questionNumber: 2,
    text: "Combien de cavités possède le cœur humain ?",
    options: questionOptions("Quatre", ["Deux", "Trois", "Cinq"]),
    note: "Le cœur comporte deux oreillettes et deux ventricules.",
    sessionLabel: "Session de démonstration",
  });
  const physiologyQuestion = await ensure(Question, {
    examId: physiologyExam._id,
    text: "Quel organe sécrète l'insuline ?",
  }, {
    examId: physiologyExam._id,
    questionNumber: 1,
    text: "Quel organe sécrète l'insuline ?",
    options: questionOptions("Le pancréas", ["Le foie", "Le rein", "La thyroïde"]),
    note: "Les cellules bêta du pancréas sécrètent l'insuline.",
    sessionLabel: "Session de démonstration",
  });
  const qcmQuestion = await ensure(Question, {
    qcmBanqueId: qcmBank._id,
    text: "Quelle structure protège principalement le cerveau ?",
  }, {
    qcmBanqueId: qcmBank._id,
    questionNumber: 1,
    text: "Quelle structure protège principalement le cerveau ?",
    options: questionOptions("La boîte crânienne", ["La cage thoracique", "Le bassin", "La colonne lombaire"]),
    note: "La boîte crânienne forme une protection osseuse autour de l'encéphale.",
  });

  const courseCategory = await ensure(CourseCategory, { name: "Démo — Bases d'anatomie" }, {
    name: "Démo — Bases d'anatomie",
    moduleId: modules.S1._id,
    description: "Parcours de révision de démonstration.",
    color: "#2563eb",
    status: "active",
  });
  await ensure(ExamCourse, {
    name: "Démo — Anatomie du membre inférieur",
    moduleId: modules.S1._id,
  }, {
    name: "Démo — Anatomie du membre inférieur",
    moduleId: modules.S1._id,
    category: courseCategory.name,
    description: "Cours de démonstration lié à des questions d'examen.",
    difficulty: "easy",
    color: "#2563eb",
    status: "active",
    linkedQuestions: [anatomyQuestion._id, heartQuestion._id],
    questionSources: [
      { questionId: anatomyQuestion._id, examParYearId: anatomyExam._id, yearName: anatomyExam.name, questionNumber: 1 },
      { questionId: heartQuestion._id, examParYearId: anatomyExam._id, yearName: anatomyExam.name, questionNumber: 2 },
    ],
    totalQuestions: 2,
  });
  await ensure(Resume, { title: "Démo — Fiche Anatomie clinique", moduleId: modules.S1._id }, {
    moduleId: modules.S1._id,
    courseName: "Anatomie du membre inférieur",
    title: "Démo — Fiche Anatomie clinique",
    pdfUrl: "https://example.com/demo-anatomie.pdf",
    status: "approved",
    isAdminUpload: true,
  });

  await ensure(Explanation, { userId: student._id, questionId: anatomyQuestion._id, title: "Démo — Explication du fémur" }, {
    userId: student._id,
    questionId: anatomyQuestion._id,
    title: "Démo — Explication du fémur",
    contentText: "Le fémur est l'os de la cuisse. Il supporte une grande partie du poids du corps.",
    status: "approved",
    upvotes: 3,
    isAiGenerated: false,
    aiProvider: "manual",
  });
  await ensure(ReportQuestion, { userId: student._id, questionId: heartQuestion._id }, {
    userId: student._id,
    questionId: heartQuestion._id,
    details: "Signalement de démonstration pour tester la liste des rapports.",
    status: "pending",
  });
  await ensure(Note, { userId: student._id, title: "Démo — Révision anatomie" }, {
    userId: student._id,
    title: "Démo — Révision anatomie",
    content: "Réviser les os longs, les articulations et la circulation cardiaque.",
    questionId: anatomyQuestion._id,
    moduleId: modules.S1._id,
    tags: ["anatomie", "demo"],
    color: "#fbbf24",
    isPinned: true,
  });
  await ensure(Playlist, { userId: student._id, title: "Démo — Questions à refaire" }, {
    userId: student._id,
    title: "Démo — Questions à refaire",
    description: "Questions enregistrées pour une révision ciblée.",
    questionIds: [anatomyQuestion._id, heartQuestion._id, physiologyQuestion._id, qcmQuestion._id],
    moduleId: modules.S1._id,
    isPublic: false,
    color: "#2563eb",
  });
  await ensure(UserStats, { userId: student._id }, {
    userId: student._id,
    totalQuestionsAttempted: 12,
    totalCorrectAnswers: 9,
    totalIncorrectAnswers: 3,
    totalTimeSpent: 840,
    totalExamsCompleted: 2,
    averageScore: 75,
    currentStreak: 3,
    longestStreak: 7,
    questionsAnswered: 12,
    correctAnswers: 9,
    wrongAnswers: 3,
    totalPoints: 15,
    normalPoints: 12,
    bluePoints: 3,
    totalQuestionsInSystem: 4,
    percentageAnswered: 100,
    moduleProgress: [{
      moduleId: modules.S1._id,
      moduleName: modules.S1.name,
      questionsAttempted: 8,
      correctAnswers: 6,
      wrongAnswers: 2,
      incorrectAnswers: 2,
      completionPercentage: 100,
      averageScore: 75,
      timeSpent: 520,
    }],
    achievements: [{
      achievementId: "demo-first-exam",
      achievementName: "Premier examen terminé",
      description: "Donnée de démonstration",
    }],
  });
  await ensure(Point, { userId: student._id, "metadata.seedKey": `${DEMO_PREFIX}_points` }, {
    userId: student._id,
    type: "bonus",
    amount: 15,
    questionId: anatomyQuestion._id,
    moduleId: modules.S1._id,
    examId: anatomyExam._id,
    description: "Points de démonstration",
    metadata: { seedKey: `${DEMO_PREFIX}_points` },
  });
  await ensure(Notification, { userId: student._id, title: "Bienvenue dans les données de démonstration" }, {
    userId: student._id,
    type: "system",
    title: "Bienvenue dans les données de démonstration",
    message: "Explorez les modules, QCM, notes, playlists et statistiques disponibles.",
    link: "/dashboard/home",
    read: false,
  });

  const plans = [
    { name: "Démo Gratuit", description: "Accès à un module", price: 0, period: "Gratuit", order: 90, isPopular: false },
    { name: "Démo Premium Semestre", description: "Accès à tous les modules d'un semestre", price: 49, oldPrice: 69, period: "Semestre", order: 91, isPopular: true },
    { name: "Démo Premium Annuel", description: "Accès complet à tous les semestres", price: 399, oldPrice: 499, period: "Annuel", order: 92, isPopular: false },
  ];
  for (const plan of plans) {
    await ensure(SubscriptionPlan, { name: plan.name }, {
      ...plan,
      status: "Active",
      features: [
        { text: "Questions et examens de démonstration", included: true },
        { text: "Statistiques de progression", included: true },
      ],
    });
  }
  await ensure(Transaction, { paypalOrderId: `${DEMO_PREFIX}_ORDER_001` }, {
    user: student._id,
    amount: 49,
    currency: "MAD",
    status: "completed",
    paypalOrderId: `${DEMO_PREFIX}_ORDER_001`,
    plan: "Premium",
    duration: "6months",
    paymentMethod: "Contact",
    semesters: ["S1", "S2", "S3"],
    metadata: { seedKey: DEMO_PREFIX },
  });
  await ensure(Feedback, { name: "Sara B.", message: "Les QCM de démonstration sont très utiles pour réviser." }, {
    name: "Sara B.",
    role: "Étudiante en médecine",
    message: "Les QCM de démonstration sont très utiles pour réviser.",
    rating: 5,
    isApproved: true,
    isFeatured: true,
    order: 90,
  });
  await ensure(Contact, { email: "demo.student@wafa.test", subject: "Démo — Question sur un abonnement" }, {
    name: student.name,
    email: student.email,
    subject: "Démo — Question sur un abonnement",
    message: "Message de démonstration pour tester la boîte de réception administrateur.",
    status: "pending",
    priority: "medium",
    userId: student._id,
  });

  const landingSettings = await LandingPageSettings.findOne();
  if (!landingSettings) {
    await LandingPageSettings.create({
      siteName: "YourQCM Demo",
      promotionEnabled: true,
      promotionText: "Données de démonstration chargées",
      promotionLink: "/register",
    });
  }
  const privacyPolicy = await PrivacyPolicy.findOne();
  if (!privacyPolicy) {
    await PrivacyPolicy.create({
      content: "Politique de confidentialité de démonstration.",
      termsOfUse: "Conditions d'utilisation de démonstration.",
      lastUpdatedBy: admin._id,
      termsLastUpdatedBy: admin._id,
      termsLastUpdatedAt: new Date(),
    });
  }

  console.log("Demo data seeded successfully.");
  console.log("Accounts created or reused:");
  console.log("  demo.free@wafa.test (free-semester selection)");
  console.log("  demo.student@wafa.test (premium student data)");
  console.log("  demo.admin@wafa.test (super admin)");
  console.log("All accounts use the DEMO_SEED_PASSWORD supplied for this run.");
};

seedDemoData()
  .catch((error) => {
    console.error("Demo data seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
