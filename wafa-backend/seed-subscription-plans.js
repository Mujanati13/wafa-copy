import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SubscriptionPlan from './models/subscriptionPlanModel.js';

dotenv.config();

const seedSubscriptionPlans = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URL);
        console.log('✓ Connected to MongoDB');

        // Clear existing subscription plans
        await SubscriptionPlan.deleteMany({});
        console.log('✓ Cleared existing subscription plans');

        // Create 3 subscription plans matching the design
        const plans = await SubscriptionPlan.insertMany([
            {
                name: 'Gratuit',
                description: 'Accès de base pour découvrir la plateforme',
                price: 0,
                oldPrice: null,
                period: 'Semester',
                features: [
                    { text: 'un examen dans un module', included: true },
                    { text: 'Mobile-friendly interface', included: true },
                    { text: 'fonctionalités', included: false },
                    { text: 'Access to Boards', included: false },
                    { text: 'access to statistiques', included: false },
                    { text: 'Ai companion access', included: false },
                    { text: 'Early features access', included: false }
                ],
                status: 'Active',
                order: 1,
                isPopular: false
            },
            {
                name: 'Premium',
                description: 'Accès complet par semestre',
                price: 90,
                oldPrice: 120,
                period: 'Semester',
                features: [
                    { text: 'tous les modules', included: true },
                    { text: 'tous les exams', included: true },
                    { text: 'Mobile-friendly interface', included: true },
                    { text: 'fonctionalités principales', included: true },
                    { text: 'Access to Boards', included: true },
                    { text: 'access to statistiques', included: true },
                    { text: 'Ai companion access', included: true },
                    { text: 'Early features access', included: true },
                    { text: 'Community access', included: false },
                    { text: 'Playlist creation', included: false },
                    { text: 'Notes personnalisées', included: false }
                ],
                status: 'Active',
                order: 2,
                isPopular: true
            },
            {
                name: 'Premium Annuel',
                description: 'Accès complet annuel - Meilleure valeur',
                price: 120,
                oldPrice: 200,
                period: 'Annee',
                features: [
                    { text: 'tous les modules', included: true },
                    { text: 'tous les exams', included: true },
                    { text: 'Mobile-friendly interface', included: true },
                    { text: 'toutes les fonctionalités', included: true },
                    { text: 'Access to Boards', included: true },
                    { text: 'access to statistiques', included: true },
                    { text: 'Ai companion access', included: true },
                    { text: 'Early features access', included: true },
                    { text: 'Community access', included: true },
                    { text: 'Playlist creation', included: true },
                    { text: 'Notes personnalisées', included: true },
                    { text: 'Support prioritaire', included: true }
                ],
                status: 'Active',
                order: 3,
                isPopular: false
            }
        ]);

        console.log(`✓ Created ${plans.length} subscription plans:`);
        plans.forEach((plan, index) => {
            console.log(`  ${index + 1}. ${plan.name} - ${plan.price} dh/${plan.period} (${plan.features.length} features)`);
        });

        await mongoose.disconnect();
        console.log('✓ Disconnected from MongoDB');
        process.exit(0);
    } catch (error) {
        console.error('✗ Error seeding subscription plans:', error);
        process.exit(1);
    }
};

seedSubscriptionPlans();
