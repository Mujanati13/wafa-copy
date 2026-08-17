#!/usr/bin/env node

/**
 * Script to update subscription plans in MongoDB
 * Run: node update-subscription-plans.js
 */

const mongoose = require('mongoose');
const path = require('path');

// MongoDB connection string
const MONGO_URL = process.env.MONGO_URL || 'mongodb://admin:changeme123@localhost:27017/wafa?authSource=admin';

// Define subscription plan schema
const subscriptionPlanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  oldPrice: Number,
  period: { type: String, required: true },
  order: Number,
  features: [{
    text: String,
    included: Boolean
  }]
});

const SubscriptionPlan = mongoose.model('subscriptionplan', subscriptionPlanSchema, 'subscriptionplans');

// Plans data
const plansData = [
  {
    name: "GRATUIT",
    price: 0,
    period: "Gratuit",
    order: 1,
    features: [
      { text: "1 examen dans 1 module", included: true },
      { text: "Questions triées", included: true },
      { text: "Interface adaptée aux mobiles", included: true },
      { text: "Pourcentage des réponses", included: true },
      { text: "Accès aux classements", included: false },
      { text: "Accès aux statistiques", included: false },
      { text: "Explication des étudiants", included: false },
      { text: "Explication de l'IA", included: false },
      { text: "Accès à la communauté votes", included: false },
      { text: "Création de playlists", included: false },
      { text: "Notes personnalisées", included: false },
      { text: "Assistance prioritaire", included: false }
    ]
  },
  {
    name: "PREMIUM",
    price: 90,
    oldPrice: 120,
    period: "Semestre",
    order: 2,
    features: [
      { text: "Tous les modules", included: true },
      { text: "Questions triées", included: true },
      { text: "Interface adaptée aux mobiles", included: true },
      { text: "Pourcentage des réponses", included: true },
      { text: "Accès aux classements", included: true },
      { text: "Accès aux statistiques", included: true },
      { text: "Explication des étudiants", included: true },
      { text: "Explication de l'IA", included: false },
      { text: "Accès à la communauté votes", included: false },
      { text: "Création de playlists", included: false },
      { text: "Notes personnalisées", included: false },
      { text: "Assistance prioritaire", included: false }
    ]
  },
  {
    name: "PREMIUM ANNUEL",
    price: 150,
    oldPrice: 200,
    period: "Annuel",
    order: 3,
    features: [
      { text: "Tous les modules", included: true },
      { text: "Questions triées", included: true },
      { text: "Interface adaptée aux mobiles", included: true },
      { text: "Pourcentage des réponses", included: true },
      { text: "Accès aux classements", included: true },
      { text: "Accès aux statistiques", included: true },
      { text: "Explication des étudiants", included: true },
      { text: "Explication de l'IA", included: true },
      { text: "Accès à la communauté votes", included: true },
      { text: "Création de playlists", included: true },
      { text: "Notes personnalisées", included: true },
      { text: "Assistance prioritaire", included: true }
    ]
  }
];

async function updatePlans() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    console.log(`📍 URL: ${MONGO_URL}`);

    await mongoose.connect(MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connected to MongoDB');

    console.log('🗑️  Deleting existing plans...');
    const deleteResult = await SubscriptionPlan.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} old plans`);

    console.log('📝 Inserting new plans...');
    const insertResult = await SubscriptionPlan.insertMany(plansData);
    console.log(`✅ Inserted ${insertResult.length} new plans`);

    console.log('\n📋 Plans created:');
    plansData.forEach((plan, index) => {
      console.log(`\n${index + 1}. ${plan.name}`);
      console.log(`   💰 Price: ${plan.price} dh`);
      console.log(`   ⏰ Period: ${plan.period}`);
      console.log(`   ✨ Features: ${plan.features.filter(f => f.included).length} included`);
    });

    console.log('\n✅ All plans updated successfully!');
    console.log('\n📱 Now clear your browser cache and reload:');
    console.log('   1. Press Ctrl+Shift+Delete');
    console.log('   2. Select "All time" and clear everything');
    console.log('   3. Reload the page');

    await mongoose.connection.close();
    console.log('\n✅ Disconnected from MongoDB');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating plans:');
    console.error(error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n⚠️  Cannot connect to MongoDB!');
      console.error('Make sure:');
      console.error('  1. MongoDB is running: docker-compose up -d mongodb');
      console.error('  2. You\'re in the project directory');
      console.error('  3. The connection string is correct');
    }
    
    process.exit(1);
  }
}

console.log('🚀 Subscription Plans Updater\n');
updatePlans();
