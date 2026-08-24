import mongoose from "mongoose";

const landingPageSettingsSchema = new mongoose.Schema(
    {
        // Branding
        siteName: {
            type: String,
            default: "YourQCM",
        },
        siteVersion: {
            type: String,
            default: "v1.1",
        },
        logoUrl: {
            type: String,
            default: "",
        },

        // Hero Section
        heroTitle: {
            type: String,
            default: "Faciliter votre préparation avec YourQCM",
        },
        heroSubtitle: {
            type: String,
            default: "Révisez mieux. En moins de temps.",
        },
        heroDescription: {
            type: String,
            default: "Préparez-vous efficacement pour les examens avec notre plateforme d'exam, conçue pour les étudiants en médecine de FMPM.",
        },

        // Timer/Countdown Section
        timerEnabled: {
            type: Boolean,
            default: false,
        },
        timerEndDate: {
            type: Date,
            default: null,
        },
        timerTitle: {
            type: String,
            default: "Offre spéciale se termine dans",
        },

        // Pricing Section
        pricingTitle: {
            type: String,
            default: "Nos Abonnements",
        },
        pricingSubtitle: {
            type: String,
            default: "Choisissez le plan qui vous convient",
        },

        // Individual plan prices and features
        freePlanFeatures: {
            type: [String],
            default: ["Accès limité aux QCM", "Statistiques de base", "1 module gratuit"],
        },
        premiumMonthlyPrice: {
            type: Number,
            default: 49,
        },
        premiumMonthlyFeatures: {
            type: [String],
            default: ["Accès illimité aux QCM", "Tous les modules", "Statistiques avancées", "Support prioritaire"],
        },
        premiumAnnualPrice: {
            type: Number,
            default: 399,
        },
        premiumAnnualFeatures: {
            type: [String],
            default: ["Tout Premium mensuel", "2 mois gratuits", "Contenu exclusif", "Accès anticipé aux nouveautés"],
        },

        // FAQ Section
        faqTitle: {
            type: String,
            default: "Questions Fréquentes",
        },
        faqItems: {
            type: [{
                question: String,
                answer: String,
            }],
            default: [
                { question: "Comment fonctionne YourQCM?", answer: "YourQCM est une plateforme d'apprentissage..." },
                { question: "Puis-je annuler mon abonnement?", answer: "Oui, vous pouvez annuler à tout moment..." },
            ],
        },

        // Contact Section
        contactEmail: {
            type: String,
            default: "contact@yourqcm.online",
        },
        contactPhone: {
            type: String,
            default: "+212 6XX XXX XXX",
        },
        whatsappNumber: {
            type: String,
            default: "+212600000000",
        },

        // Social Links
        facebookUrl: {
            type: String,
            default: "",
        },
        instagramUrl: {
            type: String,
            default: "",
        },
        youtubeUrl: {
            type: String,
            default: "",
        },

        // Promotion Banner
        promotionEnabled: {
            type: Boolean,
            default: false,
        },
        promotionText: {
            type: String,
            default: "",
        },
        promotionLink: {
            type: String,
            default: "",
        },
    },
    { timestamps: true }
);

const migrateLegacyBrandText = (value) => {
    if (typeof value !== "string") return value;

    return value
        .replace(/atlas\s*qcm/gi, "YourQCM")
        .replace(/\bwafa\b/gi, "YourQCM");
};

// Ensure only one settings document exists
landingPageSettingsSchema.statics.getSettings = async function () {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
        return settings;
    }

    let changed = false;
    const brandedFields = [
        "siteName",
        "heroTitle",
        "heroSubtitle",
        "heroDescription",
        "timerTitle",
        "pricingTitle",
        "pricingSubtitle",
        "faqTitle",
        "promotionText",
    ];

    brandedFields.forEach((field) => {
        const migratedValue = migrateLegacyBrandText(settings[field]);
        if (migratedValue !== settings[field]) {
            settings[field] = migratedValue;
            changed = true;
        }
    });

    const legacyHeroTitles = new Set([
        "Préparez vos examens avec YourQCM",
        "Révisez avec méthode. Réussissez avec confiance.",
    ]);
    const legacyHeroSubtitles = new Set([
        "La plateforme #1 pour les étudiants en médecine au Maroc",
        "La plateforme #1 pour les étudiants en médecine",
        "La plateforme de préparation médicale pensée pour votre rythme.",
    ]);
    const legacyHeroDescriptions = new Set([
        "Accédez à des milliers de QCM, examens corrigés et résumés pour réussir vos études.",
        "QCM ciblés, examens corrigés, statistiques et ressources dans un seul espace.",
    ]);

    if (legacyHeroTitles.has(settings.heroTitle)) {
        settings.heroTitle = "Faciliter votre préparation avec YourQCM";
        changed = true;
    }
    if (legacyHeroSubtitles.has(settings.heroSubtitle)) {
        settings.heroSubtitle = "Révisez mieux. En moins de temps.";
        changed = true;
    }
    if (legacyHeroDescriptions.has(settings.heroDescription)) {
        settings.heroDescription = "Préparez-vous efficacement pour les examens avec notre plateforme d'exam, conçue pour les étudiants en médecine de FMPM.";
        changed = true;
    }

    if (settings.faqItems?.length) {
        const faqCount = settings.faqItems.length;
        settings.faqItems = settings.faqItems.filter((item) => {
            const question = item.question || "";
            return !/informations?\s+bancaires.*sécurisées|payment information.*secure/i.test(question);
        });
        if (settings.faqItems.length !== faqCount) changed = true;
    }

    settings.faqItems?.forEach((item) => {
        const question = migrateLegacyBrandText(item.question);
        const answer = migrateLegacyBrandText(item.answer)
            ?.replace(/FMPR\s*\(Faculté de Médecine et de Pharmacie de Rabat\)/gi, "FMPM (Faculté de Médecine et de Pharmacie de Marrakech)")
            .replace(/Faculty of Medicine and Pharmacy of Rabat/gi, "FMPM (Faculty of Medicine and Pharmacy of Marrakech)");

        if (question !== item.question) {
            item.question = question;
            changed = true;
        }
        if (answer !== item.answer) {
            item.answer = answer;
            changed = true;
        }
    });

    if (/@(atlas-qcm[.]online|wafa[.]ma)$/i.test(settings.contactEmail || "")) {
        settings.contactEmail = "contact@yourqcm.online";
        changed = true;
    }

    if (changed) await settings.save();

    return settings;
};

export default mongoose.model("LandingPageSettings", landingPageSettingsSchema);
