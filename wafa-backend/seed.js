import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import Module from './models/moduleModel.js';
import ExamParYear from './models/examParYearModel.js';
import Question from './models/questionModule.js';
import Explanation from './models/explanationModel.js';
import Resume from './models/resumeModel.js';
import User from './models/userModel.js';

dotenv.config();

const seedData = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URL);
        console.log('✓ Connected to MongoDB');

        // Clear existing data (except admin users)
        await Module.deleteMany({});
        await ExamParYear.deleteMany({});
        await Question.deleteMany({});
        await Explanation.deleteMany({});
        await Resume.deleteMany({});
        console.log('✓ Cleared existing data');

        // Create or get test user for explanations and resumes
        let testUser = await User.findOne({ email: 'seeduser@wafa.ma' });
        if (!testUser) {
            const hashedPassword = await bcrypt.hash('Seed123!@#', 10);
            testUser = await User.create({
                username: 'seeduser',
                email: 'seeduser@wafa.ma',
                password: hashedPassword,
                university: '',
                faculty: 'Faculté de Médecine',
                currentYear: 'S3',
                role: 'student',
                isVerified: true
            });
            console.log('✓ Created test user for seed data');
        } else {
            console.log('✓ Using existing test user');
        }

        // Create Modules
        const modules = await Module.insertMany([
            {
                name: 'Anatomie',
                semester: 'S1',
                imageUrl: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56',
                infoText: 'Étude de la structure du corps humain'
            },
            {
                name: 'Physiologie',
                semester: 'S2',
                imageUrl: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef',
                infoText: 'Étude du fonctionnement des organes'
            },
            {
                name: 'Biochimie',
                semester: 'S1',
                imageUrl: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69',
                infoText: 'Étude des processus chimiques dans les organismes vivants'
            },
            {
                name: 'Pharmacologie',
                semester: 'S3',
                imageUrl: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de',
                infoText: 'Étude des médicaments et de leurs effets'
            }
        ]);
        console.log(`✓ Created ${modules.length} modules`);

        // Create Exams for each module
        const exams = [];
        for (const module of modules) {
            const moduleExams = await ExamParYear.insertMany([
                {
                    name: `${module.name} - Examen 2023`,
                    moduleId: module._id,
                    year: 2023,
                    imageUrl: module.imageUrl,
                    infoText: `Examen de ${module.name} - Session 2023`
                },
                {
                    name: `${module.name} - Examen 2024`,
                    moduleId: module._id,
                    year: 2024,
                    imageUrl: module.imageUrl,
                    infoText: `Examen de ${module.name} - Session 2024`
                }
            ]);
            exams.push(...moduleExams);
        }
        console.log(`✓ Created ${exams.length} exams`);

        // Create Questions for first exam (Anatomie 2023)
        const anatomieExam = exams.find(e => e.year === 2023 && e.name.includes('Anatomie'));
        const questions = await Question.insertMany([
            {
                examId: anatomieExam._id,
                text: 'Quelle est la fonction principale du cœur?',
                options: [
                    { text: 'Filtrer le sang', isCorrect: false },
                    { text: 'Pomper le sang', isCorrect: true },
                    { text: 'Produire des hormones', isCorrect: false },
                    { text: 'Stocker le sang', isCorrect: false },
                    { text: 'Oxygéner le sang', isCorrect: false }
                ],
                note: 'Le cœur est un muscle qui pompe le sang dans tout le corps',
                sessionLabel: 'Session Principale'
            },
            {
                examId: anatomieExam._id,
                text: 'Combien de chambres possède le cœur humain?',
                options: [
                    { text: 'Deux', isCorrect: false },
                    { text: 'Trois', isCorrect: false },
                    { text: 'Quatre', isCorrect: true },
                    { text: 'Cinq', isCorrect: false },
                    { text: 'Six', isCorrect: false }
                ],
                note: 'Le cœur possède 4 chambres: 2 oreillettes et 2 ventricules',
                sessionLabel: 'Session Principale'
            },
            {
                examId: anatomieExam._id,
                text: 'Quel est l\'os le plus long du corps humain?',
                options: [
                    { text: 'Tibia', isCorrect: false },
                    { text: 'Fémur', isCorrect: true },
                    { text: 'Humérus', isCorrect: false },
                    { text: 'Radius', isCorrect: false },
                    { text: 'Péroné', isCorrect: false }
                ],
                note: 'Le fémur est l\'os de la cuisse, le plus long et le plus solide',
                sessionLabel: 'Session Principale'
            },
            {
                examId: anatomieExam._id,
                text: 'Combien de paires de côtes possède le corps humain?',
                options: [
                    { text: '10 paires', isCorrect: false },
                    { text: '11 paires', isCorrect: false },
                    { text: '12 paires', isCorrect: true },
                    { text: '13 paires', isCorrect: false },
                    { text: '14 paires', isCorrect: false }
                ],
                note: 'Le thorax contient 12 paires de côtes',
                sessionLabel: 'Session Principale'
            },
            {
                examId: anatomieExam._id,
                text: 'Quelle artère transporte le sang oxygéné du cœur vers le corps?',
                options: [
                    { text: 'Veine cave', isCorrect: false },
                    { text: 'Artère pulmonaire', isCorrect: false },
                    { text: 'Aorte', isCorrect: true },
                    { text: 'Veine pulmonaire', isCorrect: false },
                    { text: 'Artère carotide', isCorrect: false }
                ],
                note: 'L\'aorte est la plus grande artère du corps',
                sessionLabel: 'Session Principale'
            }
        ]);
        console.log(`✓ Created ${questions.length} questions`);

        // Create Explanations (linked to questions and user)
        const explanations = await Explanation.insertMany([
            {
                userId: testUser._id,
                questionId: questions[0]._id,
                title: 'Explication - Fonction du cœur',
                contentText: 'Le cœur est un muscle qui pompe le sang dans tout le corps via le système cardiovasculaire.',
                imageUrl: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8',
                status: 'approved'
            },
            {
                userId: testUser._id,
                questionId: questions[1]._id,
                title: 'Explication - Chambres du cœur',
                contentText: 'Le cœur possède 4 chambres: 2 oreillettes (atria) en haut et 2 ventricules en bas.',
                imageUrl: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56',
                status: 'approved'
            },
            {
                userId: testUser._id,
                questionId: questions[2]._id,
                title: 'Explication - Le fémur',
                contentText: 'Le fémur est l\'os de la cuisse, le plus long et le plus solide du corps humain.',
                status: 'approved'
            }
        ]);
        console.log(`✓ Created ${explanations.length} explanations`);

        // Create Resumes (linked to modules and courses)
        const resumes = await Resume.insertMany([
            {
                moduleId: modules[0]._id, // Cardiologie module
                courseName: 'Système Cardiovasculaire',
                title: 'Résumé - Système Cardiovasculaire',
                pdfUrl: 'https://example.com/resume-cardiovasculaire.pdf',
                status: 'approved',
                isAdminUpload: true
            },
            {
                moduleId: modules[0]._id, // Cardiologie module
                courseName: 'Anatomie du Cœur',
                title: 'Résumé - Anatomie du Cœur',
                pdfUrl: 'https://example.com/resume-coeur.pdf',
                status: 'approved',
                isAdminUpload: true
            },
            {
                moduleId: modules[1]._id, // Anatomie module
                courseName: 'Système Squelettique',
                title: 'Résumé - Système Squelettique',
                pdfUrl: 'https://example.com/resume-squelette.pdf',
                status: 'approved',
                isAdminUpload: true
            }
        ]);
        console.log(`✓ Created ${resumes.length} resumes`);

        console.log('\n============================================================');
        console.log('✓ Database seeded successfully!');
        console.log('============================================================');
        console.log(`Modules: ${modules.length}`);
        console.log(`Exams: ${exams.length}`);
        console.log(`Questions: ${questions.length}`);
        console.log(`Explanations: ${explanations.length}`);
        console.log(`Resumes: ${resumes.length}`);
        console.log('============================================================\n');

        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

seedData();
