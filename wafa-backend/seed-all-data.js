import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

// Models
import User from './models/userModel.js';
import UserStats from './models/userStatsModel.js';
import Module from './models/moduleModel.js';
import ExamParYear from './models/examParYearModel.js';
import ExamCourse from './models/examCourseModel.js';
import CourseCategory from './models/courseCategoryModel.js';
import QCMBanque from './models/qcmBanqueModel.js';
import Question from './models/questionModule.js';
import Explanation from './models/explanationModel.js';
import Resume from './models/resumeModel.js';
import Note from './models/noteModel.js';
import Playlist from './models/playlistModel.js';
import Point from './models/pointModel.js';
import Notification from './models/notificationModel.js';
import SubscriptionPlan from './models/subscriptionPlanModel.js';
import Transaction from './models/transactionModel.js';
import ReportQuestion from './models/reportQuestions.js';
import Contact from './models/contactModel.js';
import Feedback from './models/feedbackModel.js';
import LandingPageSettings from './models/landingPageSettingsModel.js';
import PrivacyPolicy from './models/privacyPolicyModel.js';

dotenv.config();

const DEFAULT_PASSWORD = process.env.SEED_PASSWORD || 'Seed12345!';

// Upsert helper
const upsertDoc = async (Model, query, doc) => {
  return Model.findOneAndUpdate(
    query,
    { $set: doc },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

const runSeeder = async () => {
  const isFresh = process.argv.includes('--fresh') || process.argv.includes('--clear');

  console.log('====================================================');
  console.log('🚀 YourQCM Full Database Seeder');
  console.log(`📌 Mode: ${isFresh ? 'Fresh (Wipe & Seed)' : 'Upsert / Populate'}`);
  console.log('====================================================');

  const mongoUrl = process.env.MONGO_URL;
  if (!mongoUrl) {
    throw new Error('MONGO_URL environment variable is missing!');
  }

  await mongoose.connect(mongoUrl);
  console.log('✓ Connected to MongoDB');

  if (isFresh) {
    console.log('🧹 Clearing existing collections...');
    await Promise.all([
      Module.deleteMany({}),
      ExamParYear.deleteMany({}),
      ExamCourse.deleteMany({}),
      CourseCategory.deleteMany({}),
      QCMBanque.deleteMany({}),
      Question.deleteMany({}),
      Explanation.deleteMany({}),
      Resume.deleteMany({}),
      Note.deleteMany({}),
      Playlist.deleteMany({}),
      UserStats.deleteMany({}),
      Point.deleteMany({}),
      Notification.deleteMany({}),
      SubscriptionPlan.deleteMany({}),
      Transaction.deleteMany({}),
      ReportQuestion.deleteMany({}),
      Contact.deleteMany({}),
      Feedback.deleteMany({})
    ]);
    console.log('✓ Collections wiped.');
  }

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // ==========================================
  // 1. SEED USERS
  // ==========================================
  console.log('\n👤 1. Seeding Users...');
  const usersToSeed = [
    {
      username: 'admin',
      name: 'Super Administrateur',
      email: 'admin@wafa.ma',
      password: hashedPassword,
      role: 'admin',
      isAdmin: true,
      adminRole: 'super_admin',
      permissions: ['users', 'content', 'analytics', 'payments', 'notifications', 'reports', 'settings'],
      isVerified: true,
      emailVerified: true,
      isAactive: true,
      plan: 'Premium',
      currentYear: 'S10',
      semesters: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'],
      university: 'Université Mohammed V - Rabat',
      faculty: 'Faculté de Médecine et de Pharmacie'
    },
    {
      username: 'subadmin',
      name: 'Gestionnaire Contenu',
      email: 'subadmin@wafa.ma',
      password: hashedPassword,
      role: 'subadmin',
      isAdmin: false,
      adminRole: 'sub_admin',
      permissions: ['content', 'reports'],
      isVerified: true,
      emailVerified: true,
      isAactive: true,
      plan: 'Premium',
      currentYear: 'S6',
      semesters: ['S5', 'S6'],
      university: 'Université Hassan II - Casablanca',
      faculty: 'Faculté de Médecine et de Pharmacie'
    },
    {
      username: 'yassine_pro',
      name: 'Yassine El Amrani',
      email: 'yassine@wafa.ma',
      password: hashedPassword,
      role: 'student',
      isVerified: true,
      emailVerified: true,
      isAactive: true,
      plan: 'Premium Pro',
      currentYear: '3ème année',
      semesters: ['S5'],
      university: 'FMP Rabat',
      faculty: 'Médecine Générale'
    },
    {
      username: 'sarah_med',
      name: 'Sarah Benjelloun',
      email: 'sarah@wafa.ma',
      password: hashedPassword,
      role: 'student',
      isVerified: true,
      emailVerified: true,
      isAactive: true,
      plan: 'Premium',
      currentYear: '2ème année',
      semesters: ['S3'],
      university: 'FMP Casablanca',
      faculty: 'Médecine Générale'
    },
    {
      username: 'amine_extern',
      name: 'Amine Tazi',
      email: 'amine@wafa.ma',
      password: hashedPassword,
      role: 'student',
      isVerified: true,
      emailVerified: true,
      isAactive: true,
      plan: 'Premium Pro',
      currentYear: '4ème année',
      semesters: ['S7'],
      university: 'FMP Fès',
      faculty: 'Médecine Générale'
    },
    {
      username: 'kenza_intern',
      name: 'Kenza Alaoui',
      email: 'kenza@wafa.ma',
      password: hashedPassword,
      role: 'student',
      isVerified: true,
      emailVerified: true,
      isAactive: true,
      plan: 'Premium Pro',
      currentYear: '5ème année',
      semesters: ['S9'],
      university: 'FMP Marrakech',
      faculty: 'Médecine Générale'
    },
    {
      username: 'mehdi_free',
      name: 'Mehdi Naciri',
      email: 'mehdi@wafa.ma',
      password: hashedPassword,
      role: 'student',
      isVerified: true,
      emailVerified: true,
      isAactive: true,
      plan: 'Free',
      currentYear: '1ère année',
      semesters: ['S1'],
      university: 'FMP Oujda',
      faculty: 'Médecine Générale'
    }
  ];

  const createdUsers = {};
  for (const u of usersToSeed) {
    const userDoc = await upsertDoc(User, { email: u.email }, u);
    createdUsers[u.username] = userDoc;
  }
  console.log(`✓ Seeded ${Object.keys(createdUsers).length} test users`);

  // ==========================================
  // 2. SEED MODULES (S1 to S10)
  // ==========================================
  console.log('\n📚 2. Seeding Modules (S1 - S10)...');
  const modulesData = [
    { name: 'Anatomie I', semester: 'S1', color: '#2563eb', infoText: 'Ostéologie, arthrologie et myologie des membres', order: 1 },
    { name: 'Biologie & Cytologie', semester: 'S1', color: '#0891b2', infoText: 'Structure cellulaire et génétique médicale', order: 2 },
    { name: 'Physiologie I', semester: 'S2', color: '#7c3aed', infoText: 'Physiologie neuromusculaire et respiratoire', order: 3 },
    { name: 'Biochimie Médicale', semester: 'S2', color: '#ca8a04', infoText: 'Enzymologie, bioénergétique et métabolisme', order: 4 },
    { name: 'Histologie & Embryologie', semester: 'S3', color: '#db2777', infoText: 'Tissus fondamentaux et développement embryonnaire', order: 5 },
    { name: 'Microbiologie & Immunologie', semester: 'S3', color: '#16a34a', infoText: 'Bactériologie, virologie et immunité de base', order: 6 },
    { name: 'Pharmacologie Générale', semester: 'S4', color: '#ea580c', infoText: 'Pharmacocinétique, pharmacodynamie et cibles', order: 7 },
    { name: 'Sémiologie Médicale', semester: 'S4', color: '#4f46e5', infoText: 'Examen clinique, signes physiques et fonctionnels', order: 8 },
    { name: 'Cardiologie & Vasculaire', semester: 'S5', color: '#dc2626', infoText: 'Insuffisance cardiaque, HTA, coronaropathies, valvulopathies', order: 9 },
    { name: 'Pneumologie', semester: 'S5', color: '#0284c7', infoText: 'Asthme, BPCO, pneumonies, tuberculose, cancer bronchique', order: 10 },
    { name: 'Gastro-Entérologie', semester: 'S6', color: '#d97706', infoText: 'Ulcères, hépatites, cirrhoses, MICI, pancréatites', order: 11 },
    { name: 'Néphrologie & Urologie', semester: 'S6', color: '#9333ea', infoText: 'Insuffisance rénale, glomérulonéphrites, lithiases', order: 12 },
    { name: 'Pédiatrie', semester: 'S7', color: '#059669', infoText: 'Développement psychomoteur, néonatalogie, pathologies infantiles', order: 13 },
    { name: 'Neurologie', semester: 'S7', color: '#6366f1', infoText: 'AVC, épilepsie, céphalées, sclérose en plaques', order: 14 },
    { name: 'Gynécologie-Obstétrique', semester: 'S8', color: '#ec4899', infoText: 'Suivi de grossesse, accouchement, pathologie gynécologique', order: 15 },
    { name: 'Psychiatrie', semester: 'S8', color: '#8b5cf6', infoText: 'Troubles de l\'humeur, schizophrénie, anxiété, addictions', order: 16 },
    { name: 'Urgences & Réanimation', semester: 'S9', color: '#e11d48', infoText: 'Polytraumatisé, états de choc, détresses respiratoires', order: 17 },
    { name: 'Maladies Infectieuses', semester: 'S9', color: '#10b981', infoText: 'Sepsis, antibiothérapie, VIH, méningites', order: 18 },
    { name: 'Thérapeutique & Synthèse', semester: 'S10', color: '#3b82f6', infoText: 'Dossiers cliniques progressifs et prescriptions', order: 19 },
    { name: 'Médecine Légale & Éthique', semester: 'S10', color: '#64748b', infoText: 'Déontologie, certificats, responsabilité médicale', order: 20 }
  ];

  const createdModules = {};
  for (const m of modulesData) {
    const modDoc = await upsertDoc(Module, { name: m.name }, {
      ...m,
      imageUrl: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&auto=format&fit=crop&q=60',
      difficulty: 'medium',
      category: 'Exam par years'
    });
    createdModules[m.name] = modDoc;
  }
  console.log(`✓ Seeded ${Object.keys(createdModules).length} modules`);

  // ==========================================
  // 3. SEED EXAMS (ExamParYear)
  // ==========================================
  console.log('\n📝 3. Seeding Exams (ExamParYear)...');
  const createdExams = [];
  const years = [2022, 2023, 2024, 2025];
  for (const modName of ['Anatomie I', 'Physiologie I', 'Cardiologie & Vasculaire', 'Pneumologie', 'Pédiatrie', 'Gastro-Entérologie']) {
    const mod = createdModules[modName];
    if (!mod) continue;

    for (const yr of years) {
      const examDoc = await upsertDoc(ExamParYear, {
        moduleId: mod._id,
        year: yr,
        name: `${modName} — Session Normale ${yr}`
      }, {
        name: `${modName} — Session Normale ${yr}`,
        moduleId: mod._id,
        year: yr,
        infoText: `Épreuve officielle de ${modName} - Session Normale ${yr}`,
        imageUrl: mod.imageUrl
      });
      createdExams.push(examDoc);
    }
  }
  console.log(`✓ Seeded ${createdExams.length} annual exams`);

  // ==========================================
  // 4. SEED QCM BANQUES
  // ==========================================
  console.log('\n🏦 4. Seeding QCM Banks...');
  const createdBanks = [];
  for (const modName of ['Anatomie I', 'Cardiologie & Vasculaire', 'Pédiatrie', 'Neurologie']) {
    const mod = createdModules[modName];
    if (!mod) continue;

    const bankDoc = await upsertDoc(QCMBanque, {
      name: `Banque Nationale QCM — ${modName}`,
      moduleId: mod._id
    }, {
      name: `Banque Nationale QCM — ${modName}`,
      moduleId: mod._id,
      infoText: `Compilation de questions d'entraînement et d'annales pour ${modName}`
    });
    createdBanks.push(bankDoc);
  }
  console.log(`✓ Seeded ${createdBanks.length} QCM banks`);

  // ==========================================
  // 5. SEED COURSE CATEGORIES & COURSES
  // ==========================================
  console.log('\n🏷️ 5. Seeding Course Categories & Exam Courses...');
  const cardioModule = createdModules['Cardiologie & Vasculaire'];
  const anatModule = createdModules['Anatomie I'];

  const categoryCardio = await upsertDoc(CourseCategory, {
    name: 'Pathologies Ischémiques & Coronaires',
    moduleId: cardioModule._id
  }, {
    name: 'Pathologies Ischémiques & Coronaires',
    moduleId: cardioModule._id,
    description: 'Syndromes coronariens aigus et chroniques',
    color: '#dc2626',
    status: 'active'
  });

  const categoryAnat = await upsertDoc(CourseCategory, {
    name: 'Ostéologie du Membre Supérieur',
    moduleId: anatModule._id
  }, {
    name: 'Ostéologie du Membre Supérieur',
    moduleId: anatModule._id,
    description: 'Clavicule, scapula, humérus, radius, ulna et main',
    color: '#2563eb',
    status: 'active'
  });

  // ==========================================
  // 6. SEED QUESTIONS
  // ==========================================
  console.log('\n❓ 6. Seeding High Quality Questions...');
  const questionsToSeed = [
    // Cardio Exam 2024 Question 1
    {
      examId: createdExams.find(e => e.name.includes('Cardiologie') && e.year === 2024)?._id,
      questionNumber: 1,
      text: 'Concernant l\'infarctus du myocarde avec sus-décalage du segment ST (STEMI), quelle est l\'affirmation exacte ?',
      options: [
        { text: 'La reperfusion coronarienne doit être réalisée en urgence absolue.', isCorrect: true },
        { text: 'La coronarographie est systématiquement différée à 48 heures.', isCorrect: false },
        { text: 'La troponine reste élevée pendant seulement 2 heures.', isCorrect: false },
        { text: 'L\'ECG 12 dérivations n\'a aucune valeur diagnostique.', isCorrect: false },
        { text: 'L\'aspirine est formellement contre-indiquée en phase aiguë.', isCorrect: false }
      ],
      note: 'Dans le STEMI, le temps est du muscle : la désobstruction coronaire par angioplastie primaire immédiate est la pierre angulaire du traitement.',
      sessionLabel: 'Session Principale 2024'
    },
    // Cardio Exam 2024 Question 2
    {
      examId: createdExams.find(e => e.name.includes('Cardiologie') && e.year === 2024)?._id,
      questionNumber: 2,
      text: 'Quels sont les signes cliniques majeurs de l\'insuffisance ventriculaire gauche aiguë ? (QCM à choix multiple)',
      options: [
        { text: 'Orthopnée et polypnée superficielle.', isCorrect: true },
        { text: 'Râles crépitants bilatéraux aux bases pulmonaires.', isCorrect: true },
        { text: 'Galop protodiastolique B3.', isCorrect: true },
        { text: 'Turgescence jugulaire isolée sans atteinte pulmonaire.', isCorrect: false },
        { text: 'Hépatomégalie douloureuse pure.', isCorrect: false }
      ],
      note: 'L\'insuffisance ventriculaire gauche entraîne une stase pulmonaire rétrograde (dyspnée, râles crépitants, B3). Les signes hépatiques et la turgescence jugulaire caractérisent l\'IVD.',
      sessionLabel: 'Session Principale 2024'
    },
    // Anat Exam 2024 Question 1
    {
      examId: createdExams.find(e => e.name.includes('Anatomie') && e.year === 2024)?._id,
      questionNumber: 1,
      text: 'Quel nerf chemine dans le sillon du nerf radial de la diaphyse humérale ?',
      options: [
        { text: 'Le nerf radial', isCorrect: true },
        { text: 'Le nerf médian', isCorrect: false },
        { text: 'Le nerf ulnaire', isCorrect: false },
        { text: 'Le nerf musculocutané', isCorrect: false },
        { text: 'Le nerf axillaire', isCorrect: false }
      ],
      note: 'Le nerf radial parcourt la face postérieure de l\'humérus dans le sillon du nerf radial (gouttière radiale) accompagné de l\'artère brachiale profonde.',
      sessionLabel: 'Session Principale 2024'
    },
    // Anat Exam 2024 Question 2
    {
      examId: createdExams.find(e => e.name.includes('Anatomie') && e.year === 2024)?._id,
      questionNumber: 2,
      text: 'Quel muscle s\'insère sur la tubérosité du radius et assure la supination ?',
      options: [
        { text: 'Le muscle biceps brachial', isCorrect: true },
        { text: 'Le muscle triceps brachial', isCorrect: false },
        { text: 'Le muscle coracobrachial', isCorrect: false },
        { text: 'Le muscle rond pronateur', isCorrect: false },
        { text: 'Le muscle anconé', isCorrect: false }
      ],
      note: 'Le tendon distal du biceps brachial se termine sur la tubérosité radiale (bicipitale). C\'est le plus puissant supinateur de l\'avant-bras en flexion.',
      sessionLabel: 'Session Principale 2024'
    },
    // QCM Banque Cardio Question 1
    {
      qcmBanqueId: createdBanks.find(b => b.name.includes('Cardiologie'))?._id,
      questionNumber: 1,
      text: 'Quelle est la principale anomalie auscultatoire du rétrécissement aortique calcifié ?',
      options: [
        { text: 'Un souffle mésosystolique éjectionnel râpeux au foyer aortique irradiant aux carotides', isCorrect: true },
        { text: 'Un souffle holodiastolique doux au foyer pulmonaire', isCorrect: false },
        { text: 'Un roulement diastolique avec éclat de B1 à la pointe', isCorrect: false },
        { text: 'Un souffle continu en tunnel sous-claviculaire gauche', isCorrect: false }
      ],
      note: 'Le rétrécissement aortique se manifeste typiquement par un souffle systolique éjectionnel rude, râpeux, maximal au 2ème EIC droit et irradiant vers les vaisseaux du cou.',
      sessionLabel: 'Banque d\'entraînement'
    },
    // QCM Banque Anat Question 1
    {
      qcmBanqueId: createdBanks.find(b => b.name.includes('Anatomie'))?._id,
      questionNumber: 1,
      text: 'Parmi les structures suivantes, laquelle traverse le canal carpien ?',
      options: [
        { text: 'Le nerf médian', isCorrect: true },
        { text: 'Le nerf ulnaire', isCorrect: false },
        { text: 'L\'artère radiale', isCorrect: false },
        { text: 'L\'artère ulnaire', isCorrect: false }
      ],
      note: 'Le canal carpien contient les 9 tendons fléchisseurs des doigts et le nerf médian. Le nerf ulnaire et l\'artère ulnaire passent dans la loge de Guyon.',
      sessionLabel: 'Banque d\'entraînement'
    }
  ];

  const createdQuestions = [];
  for (const q of questionsToSeed) {
    const qDoc = await upsertDoc(Question, { text: q.text }, q);
    createdQuestions.push(qDoc);
  }
  console.log(`✓ Seeded ${createdQuestions.length} medical questions`);

  // Seed ExamCourse with questions
  await upsertDoc(ExamCourse, {
    name: 'Syndromes Coronariens Aigus',
    moduleId: cardioModule._id
  }, {
    name: 'Syndromes Coronariens Aigus',
    moduleId: cardioModule._id,
    category: categoryCardio.name,
    description: 'Prise en charge diagnostique et thérapeutique des SCA ST+ et ST-',
    difficulty: 'medium',
    color: '#dc2626',
    status: 'active',
    linkedQuestions: createdQuestions.filter(q => q.text.includes('STEMI') || q.text.includes('ventriculaire')).map(q => q._id),
    totalQuestions: 2
  });

  // ==========================================
  // 7. SEED EXPLANATIONS & RESUMES
  // ==========================================
  console.log('\n💡 7. Seeding Explanations & Summaries...');
  const firstQ = createdQuestions[0];
  const secondQ = createdQuestions[1];

  await upsertDoc(Explanation, {
    questionId: firstQ._id,
    userId: createdUsers['yassine_pro']._id
  }, {
    questionId: firstQ._id,
    userId: createdUsers['yassine_pro']._id,
    title: 'Rappel physiopathologique et clinique du STEMI',
    contentText: 'Lors d\'une occlusion coronaire aiguë complète, la nécrose myocardique s\'étend de l\'endocarde vers l\'épicarde en quelques heures. L\'angioplastie primaire avec pose de stent actif dans les 120 minutes réduit drastiquement la mortalité.',
    status: 'approved',
    upvotes: 8,
    isAiGenerated: false,
    aiProvider: 'manual'
  });

  await upsertDoc(Resume, {
    title: 'Fiche Synthèse : Prise en charge des SCA',
    moduleId: cardioModule._id
  }, {
    title: 'Fiche Synthèse : Prise en charge des SCA',
    moduleId: cardioModule._id,
    courseName: 'Syndromes Coronariens Aigus',
    pdfUrl: 'https://example.com/fiches/sca-recap.pdf',
    status: 'approved',
    isAdminUpload: true,
    uploader: createdUsers['admin']._id
  });

  // ==========================================
  // 8. SEED NOTES & PLAYLISTS
  // ==========================================
  console.log('\n📌 8. Seeding Student Notes & Playlists...');
  const yassine = createdUsers['yassine_pro'];

  await upsertDoc(Note, {
    userId: yassine._id,
    title: 'Formules et critères ECG d\'urgence'
  }, {
    userId: yassine._id,
    title: 'Formules et critères ECG d\'urgence',
    content: 'Critères de Sgarbossa en cas de BBG + STEMI :\n1. Sus-décalage concordant >= 1mm (5 pts)\n2. Sous-décalage concordant en V1-V3 >= 1mm (3 pts)\n3. Sus-décalage discordant >= 5mm (2 pts)',
    questionId: firstQ._id,
    moduleId: cardioModule._id,
    tags: ['cardiologie', 'ecg', 'urgences'],
    color: '#3b82f6',
    isPinned: true
  });

  await upsertDoc(Note, {
    userId: yassine._id,
    title: 'Pièges fréquents en Anatomie du bras'
  }, {
    userId: yassine._id,
    title: 'Pièges fréquents en Anatomie du bras',
    content: 'Ne pas confondre la loge de Guyon (nerf ulnaire) et le canal carpien (nerf médian). Le nerf radial innerve la face postérieure.',
    moduleId: anatModule._id,
    tags: ['anatomie', 'membres'],
    color: '#fbbf24',
    isPinned: false
  });

  await upsertDoc(Playlist, {
    userId: yassine._id,
    title: 'Top QCM Urgences & Cardio'
  }, {
    userId: yassine._id,
    title: 'Top QCM Urgences & Cardio',
    description: 'Ma sélection de questions clés pour réviser l\'examen du module',
    questionIds: createdQuestions.map(q => q._id),
    moduleId: cardioModule._id,
    isPublic: true,
    color: '#dc2626'
  });

  // ==========================================
  // 9. SEED USER STATS & LEADERBOARD COHORTS
  // ==========================================
  console.log('\n🏆 9. Seeding User Statistics & Leaderboard Activity...');
  const userStatsToSeed = [
    {
      user: createdUsers['yassine_pro'],
      totalPoints: 480,
      bluePoints: 120,
      greenPoints: 60,
      questionsAttempted: 160,
      correctAnswers: 142,
      wrongAnswers: 18,
      streak: 12,
      timeSpent: 14400,
      exams: 8,
      score: 88.75
    },
    {
      user: createdUsers['sarah_med'],
      totalPoints: 390,
      bluePoints: 80,
      greenPoints: 30,
      questionsAttempted: 130,
      correctAnswers: 110,
      wrongAnswers: 20,
      streak: 9,
      timeSpent: 10800,
      exams: 6,
      score: 84.6
    },
    {
      user: createdUsers['amine_extern'],
      totalPoints: 560,
      bluePoints: 160,
      greenPoints: 90,
      questionsAttempted: 210,
      correctAnswers: 190,
      wrongAnswers: 20,
      streak: 15,
      timeSpent: 19200,
      exams: 11,
      score: 90.4
    },
    {
      user: createdUsers['kenza_intern'],
      totalPoints: 620,
      bluePoints: 200,
      greenPoints: 120,
      questionsAttempted: 240,
      correctAnswers: 225,
      wrongAnswers: 15,
      streak: 21,
      timeSpent: 24000,
      exams: 14,
      score: 93.75
    },
    {
      user: createdUsers['mehdi_free'],
      totalPoints: 45,
      bluePoints: 0,
      greenPoints: 0,
      questionsAttempted: 15,
      correctAnswers: 12,
      wrongAnswers: 3,
      streak: 2,
      timeSpent: 1200,
      exams: 1,
      score: 80
    }
  ];

  for (const s of userStatsToSeed) {
    await upsertDoc(UserStats, { userId: s.user._id }, {
      userId: s.user._id,
      totalQuestionsAttempted: s.questionsAttempted,
      totalCorrectAnswers: s.correctAnswers,
      totalIncorrectAnswers: s.wrongAnswers,
      totalTimeSpent: s.timeSpent,
      totalExamsCompleted: s.exams,
      averageScore: s.score,
      currentStreak: s.streak,
      longestStreak: s.streak + 4,
      questionsAnswered: s.questionsAttempted,
      correctAnswers: s.correctAnswers,
      wrongAnswers: s.wrongAnswers,
      totalPoints: s.totalPoints,
      bluePoints: s.bluePoints,
      greenPoints: s.greenPoints,
      totalQuestionsInSystem: createdQuestions.length,
      percentageAnswered: Math.min(100, Math.round((s.questionsAttempted / (createdQuestions.length || 1)) * 100)),
      moduleProgress: [
        {
          moduleId: cardioModule._id,
          moduleName: cardioModule.name,
          questionsAttempted: Math.floor(s.questionsAttempted * 0.6),
          correctAnswers: Math.floor(s.correctAnswers * 0.6),
          wrongAnswers: Math.floor(s.wrongAnswers * 0.6),
          incorrectAnswers: Math.floor(s.wrongAnswers * 0.6),
          completionPercentage: 85,
          averageScore: s.score,
          timeSpent: Math.floor(s.timeSpent * 0.6)
        },
        {
          moduleId: anatModule._id,
          moduleName: anatModule.name,
          questionsAttempted: Math.floor(s.questionsAttempted * 0.4),
          correctAnswers: Math.floor(s.correctAnswers * 0.4),
          wrongAnswers: Math.floor(s.wrongAnswers * 0.4),
          incorrectAnswers: Math.floor(s.wrongAnswers * 0.4),
          completionPercentage: 70,
          averageScore: s.score - 5,
          timeSpent: Math.floor(s.timeSpent * 0.4)
        }
      ],
      achievements: [
        {
          achievementId: 'first_streak_7',
          achievementName: 'Série de 7 jours',
          description: 'A étudié 7 jours consécutifs avec assiduité'
        },
        {
          achievementId: 'master_cardio',
          achievementName: 'Expert Cardiologie',
          description: 'A complété avec succès plus de 50 QCM en cardiologie'
        }
      ]
    });

    // Create point entries
    await upsertDoc(Point, { userId: s.user._id, description: 'Points initiaux - Activité QCM' }, {
      userId: s.user._id,
      amount: s.totalPoints,
      type: 'bonus',
      description: 'Points initiaux - Activité QCM',
      metadata: { seed: true }
    });
  }
  console.log(`✓ Seeded stats & achievements for ${userStatsToSeed.length} active students`);

  // ==========================================
  // 10. SEED NOTIFICATIONS
  // ==========================================
  console.log('\n🔔 10. Seeding Notifications...');
  const notificationsToSeed = [
    {
      userId: yassine._id,
      type: 'exam_result',
      title: 'Résultat d\'examen disponible',
      message: 'Félicitations ! Vous avez obtenu 18/20 à l\'épreuve Cardiologie 2024.',
      link: '/dashboard/results',
      read: false
    },
    {
      userId: yassine._id,
      type: 'achievement',
      title: 'Nouveau Badge Débloqué !',
      message: 'Vous avez débloqué le badge \'Expert Cardiologie\'.',
      link: '/dashboard/profile',
      read: false
    },
    {
      userId: yassine._id,
      type: 'system',
      title: 'Mise à jour des annales 2025',
      message: 'De nouvelles sessions 2025 ont été ajoutées pour le semestre en cours.',
      link: '/dashboard/exams',
      read: true
    }
  ];

  for (const n of notificationsToSeed) {
    await upsertDoc(Notification, { userId: n.userId, title: n.title }, n);
  }
  console.log(`✓ Seeded ${notificationsToSeed.length} notifications`);

  // ==========================================
  // 11. SEED SUBSCRIPTION PLANS & TRANSACTIONS
  // ==========================================
  console.log('\n💳 11. Seeding Subscription Plans & Transactions...');
  const plans = [
    {
      name: 'Plan Gratuit',
      description: 'Découvrez la plateforme avec un semestre gratuit au choix',
      price: 0,
      oldPrice: 0,
      period: 'Gratuit',
      order: 1,
      isPopular: false,
      status: 'Active',
      features: [
        { text: 'Accès au semestre gratuit de votre choix', included: true },
        { text: 'Accès aux QCM & corrections de base', included: true },
        { text: 'Explications détaillées de la communauté', included: true },
        { text: 'Playlists & notes personnalisées', included: false },
        { text: 'Classement de promotion', included: false }
      ]
    },
    {
      name: 'Premium',
      description: 'Accès illimité à tous les modules d\'un semestre complet',
      price: 199,
      oldPrice: 299,
      period: 'Semestre',
      order: 2,
      isPopular: true,
      status: 'Active',
      features: [
        { text: 'Accès complet à tous les modules du semestre', included: true },
        { text: 'Toutes les annales corrigées 2018-2025', included: true },
        { text: 'Explications IA & fiches de révision', included: true },
        { text: 'Playlists & notes illimitées', included: true },
        { text: 'Statistiques avancées & classement', included: true }
      ]
    },
    {
      name: 'Premium Pro',
      description: 'L\'expérience intégrale pour un semestre complet',
      price: 399,
      oldPrice: 599,
      period: 'Semestre',
      order: 3,
      isPopular: false,
      status: 'Active',
      features: [
        { text: 'Accès intégral à tous les modules du semestre choisi', included: true },
        { text: 'Banque QCM complète & annales illimitées', included: true },
        { text: 'Génération d\'explications par IA illimitée', included: true },
        { text: 'Fiches de révision téléchargeables en PDF', included: true },
        { text: 'Support prioritaire 7j/7', included: true }
      ]
    }
  ];

  for (const p of plans) {
    await upsertDoc(SubscriptionPlan, { name: p.name }, p);
  }

  // Transactions
  await upsertDoc(Transaction, { paypalOrderId: 'TX_DEMO_2026_001' }, {
    user: yassine._id,
    amount: 399,
    currency: 'MAD',
    status: 'completed',
    paypalOrderId: 'TX_DEMO_2026_001',
    plan: 'Premium Pro',
    duration: '6months',
    paymentMethod: 'PayPal',
    semesters: ['S5'],
    metadata: { seed: true }
  });

  await upsertDoc(Transaction, { paypalOrderId: 'TX_DEMO_2026_002' }, {
    user: createdUsers['sarah_med']._id,
    amount: 199,
    currency: 'MAD',
    status: 'completed',
    paypalOrderId: 'TX_DEMO_2026_002',
    plan: 'Premium',
    duration: '6months',
    paymentMethod: 'Virement',
    semesters: ['S3'],
    metadata: { seed: true }
  });
  console.log('✓ Seeded subscription plans and transaction records');

  // ==========================================
  // 12. SEED QUESTION REPORTS & SUPPORT TICKETS
  // ==========================================
  console.log('\n🚩 12. Seeding Question Reports & Support Messages...');
  await upsertDoc(ReportQuestion, {
    userId: yassine._id,
    questionId: secondQ._id
  }, {
    userId: yassine._id,
    questionId: secondQ._id,
    reason: 'Erreur dans la proposition D',
    details: 'La proposition D mentionne une turgescence isolée, qui est plutôt le signe d\'une IVD pure.',
    status: 'pending'
  });

  await upsertDoc(Contact, { email: yassine.email, subject: 'Question sur le renouvellement semestriel' }, {
    name: yassine.name,
    email: yassine.email,
    subject: 'Question sur le renouvellement semestriel',
    message: 'Bonjour, je souhaite savoir si le passage en 4ème année conserve l\'historique des statistiques et mes playlists.',
    status: 'pending',
    priority: 'medium',
    userId: yassine._id
  });

  await upsertDoc(Feedback, { name: 'Dr. Yassine E.', role: 'Interne en Médecine' }, {
    name: 'Dr. Yassine E.',
    role: 'Interne en Médecine',
    message: 'YourQCM m\'a permis de réviser toutes les annales méthodiquement et de réussir mes examens de semestre avec mention.',
    rating: 5,
    isApproved: true,
    isFeatured: true,
    order: 1
  });

  await upsertDoc(Feedback, { name: 'Sarah B.', role: 'Étudiante 3ème année' }, {
    name: 'Sarah B.',
    role: 'Étudiante 3ème année',
    message: 'L\'interface moderne, le mode sombre et le système d\'explications détaillées font toute la différence.',
    rating: 5,
    isApproved: true,
    isFeatured: true,
    order: 2
  });

  // ==========================================
  // 13. SEED SETTINGS & POLICIES
  // ==========================================
  console.log('\n⚙️ 13. Seeding Platform Settings & Policies...');
  const existingSettings = await LandingPageSettings.findOne();
  if (!existingSettings) {
    await LandingPageSettings.create({
      siteName: 'YourQCM Medical Learning',
      promotionEnabled: true,
      promotionText: 'Offre Rentrée 2026 : -30% sur tous les abonnements Premium !',
      promotionLink: '/dashboard/subscription'
    });
  }

  const existingPolicy = await PrivacyPolicy.findOne();
  if (!existingPolicy) {
    await PrivacyPolicy.create({
      content: 'Politique de confidentialité et protection des données personnelles de la plateforme YourQCM.',
      termsOfUse: 'Conditions générales d\'utilisation et d\'accès aux services pédagogiques YourQCM.',
      lastUpdatedBy: createdUsers['admin']._id,
      termsLastUpdatedBy: createdUsers['admin']._id,
      termsLastUpdatedAt: new Date()
    });
  }

  console.log('\n====================================================');
  console.log('✅ ALL TEST DATA SEEDED SUCCESSFULLY!');
  console.log('====================================================');
  console.log('🔑 Credentials summary:');
  console.log(`  • Super Admin : admin@wafa.ma / ${DEFAULT_PASSWORD}`);
  console.log(`  • Sub Admin   : subadmin@wafa.ma / ${DEFAULT_PASSWORD}`);
  console.log(`  • Premium Pro : yassine@wafa.ma / ${DEFAULT_PASSWORD}`);
  console.log(`  • Premium Sem : sarah@wafa.ma / ${DEFAULT_PASSWORD}`);
  console.log(`  • Free User   : mehdi@wafa.ma / ${DEFAULT_PASSWORD}`);
  console.log('====================================================');
};

runSeeder()
  .catch((err) => {
    console.error('❌ Seeder execution failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
  });
