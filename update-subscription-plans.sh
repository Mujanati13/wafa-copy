#!/bin/bash

# Script to update subscription plans in MongoDB via Docker
# Run: bash update-subscription-plans.sh (on VPS)

echo "🚀 Subscription Plans Updater"
echo "=============================="
echo ""

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose not found!"
    exit 1
fi

echo "🔄 Connecting to MongoDB..."
docker-compose exec -T mongodb mongosh mongodb://admin:changeme123@localhost:27017/wafa?authSource=admin << 'EOF'

use wafa

print("🗑️  Deleting existing plans...")
db.subscriptionplans.deleteMany({})

print("📝 Inserting new plans...")
db.subscriptionplans.insertMany([
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
])

print("✅ Plans created successfully!")
print("")
print("📋 Plans:")
print("  1. GRATUIT - 0 dh")
print("  2. PREMIUM - 90 dh (old: 120 dh)")
print("  3. PREMIUM ANNUEL - 150 dh (old: 200 dh)")

EOF

echo ""
echo "✅ All plans updated successfully!"
echo ""
echo "📱 Next steps:"
echo "  1. Clear browser cache (Ctrl+Shift+Delete)"
echo "  2. Hard refresh the page (Ctrl+Shift+R)"
echo "  3. The new plans should appear!"
