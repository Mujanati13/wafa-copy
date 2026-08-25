import LandingPageSettings from "../models/landingPageSettingsModel.js";
import asyncHandler from '../handlers/asyncHandler.js';

export const landingPageSettingsController = {
    // Get current settings
    getSettings: asyncHandler(async (req, res) => {
        const settings = await LandingPageSettings.getSettings();
        res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.status(200).json({
            success: true,
            data: settings
        });
    }),

    // Update settings
    updateSettings: asyncHandler(async (req, res) => {
        let settings = await LandingPageSettings.findOne();

        if (!settings) {
            settings = await LandingPageSettings.create(req.body);
        } else {
            // Update only provided fields
            Object.keys(req.body).forEach(key => {
                if (req.body[key] !== undefined) {
                    settings[key] = req.body[key];
                }
            });
            await settings.save();
        }

        res.status(200).json({
            success: true,
            data: settings,
            message: "Paramètres mis à jour avec succès"
        });
    }),

    // Update branding (site name, logo)
    updateBranding: asyncHandler(async (req, res) => {
        const { siteName, siteVersion, logoUrl } = req.body;

        const settings = await LandingPageSettings.getSettings();
        if (siteName !== undefined) settings.siteName = siteName;
        if (siteVersion !== undefined) settings.siteVersion = siteVersion;
        if (logoUrl !== undefined) settings.logoUrl = logoUrl;
        await settings.save();

        res.status(200).json({
            success: true,
            data: settings,
            message: "Branding mis à jour"
        });
    }),

    // Update hero section
    updateHero: asyncHandler(async (req, res) => {
        const { heroTitle, heroSubtitle, heroDescription } = req.body;

        const settings = await LandingPageSettings.getSettings();
        if (heroTitle !== undefined) settings.heroTitle = heroTitle;
        if (heroSubtitle !== undefined) settings.heroSubtitle = heroSubtitle;
        if (heroDescription !== undefined) settings.heroDescription = heroDescription;
        await settings.save();

        res.status(200).json({
            success: true,
            data: settings,
            message: "Section Hero mise à jour"
        });
    }),

    // Update timer settings
    updateTimer: asyncHandler(async (req, res) => {
        const { timerEnabled, timerEndDate, timerTitle } = req.body;

        if (timerEnabled === true) {
            const parsedEndDate = new Date(timerEndDate);
            if (!timerEndDate || Number.isNaN(parsedEndDate.getTime()) || parsedEndDate.getTime() <= Date.now()) {
                return res.status(400).json({
                    success: false,
                    error: "La date de fin du timer doit être une date future valide"
                });
            }
        }

        const settings = await LandingPageSettings.getSettings();
        if (timerEnabled !== undefined) settings.timerEnabled = timerEnabled;
        if (timerEndDate !== undefined) settings.timerEndDate = timerEndDate;
        if (timerTitle !== undefined) settings.timerTitle = timerTitle;
        await settings.save();

        res.status(200).json({
            success: true,
            data: settings,
            message: "Paramètres du timer mis à jour"
        });
    }),

    // Update pricing
    updatePricing: asyncHandler(async (req, res) => {
        const {
            pricingTitle,
            pricingSubtitle,
            freePlanFeatures,
            premiumMonthlyPrice,
            premiumMonthlyFeatures,
            premiumAnnualPrice,
            premiumAnnualFeatures
        } = req.body;

        const settings = await LandingPageSettings.getSettings();

        if (pricingTitle !== undefined) settings.pricingTitle = pricingTitle;
        if (pricingSubtitle !== undefined) settings.pricingSubtitle = pricingSubtitle;
        if (freePlanFeatures !== undefined) settings.freePlanFeatures = freePlanFeatures;
        if (premiumMonthlyPrice !== undefined) settings.premiumMonthlyPrice = premiumMonthlyPrice;
        if (premiumMonthlyFeatures !== undefined) settings.premiumMonthlyFeatures = premiumMonthlyFeatures;
        if (premiumAnnualPrice !== undefined) settings.premiumAnnualPrice = premiumAnnualPrice;
        if (premiumAnnualFeatures !== undefined) settings.premiumAnnualFeatures = premiumAnnualFeatures;

        await settings.save();

        res.status(200).json({
            success: true,
            data: settings,
            message: "Tarification mise à jour"
        });
    }),

    // Update FAQ
    updateFAQ: asyncHandler(async (req, res) => {
        const { faqTitle, faqItems } = req.body;

        const settings = await LandingPageSettings.getSettings();
        if (faqTitle !== undefined) settings.faqTitle = faqTitle;
        if (faqItems !== undefined) settings.faqItems = faqItems;
        await settings.save();

        res.status(200).json({
            success: true,
            data: settings,
            message: "FAQ mise à jour"
        });
    }),

    // Update contact info
    updateContact: asyncHandler(async (req, res) => {
        const { contactEmail, contactPhone, whatsappNumber, facebookUrl, instagramUrl, youtubeUrl } = req.body;

        const settings = await LandingPageSettings.getSettings();
        if (contactEmail !== undefined) settings.contactEmail = contactEmail;
        if (contactPhone !== undefined) settings.contactPhone = contactPhone;
        if (whatsappNumber !== undefined) settings.whatsappNumber = whatsappNumber;
        if (facebookUrl !== undefined) settings.facebookUrl = facebookUrl;
        if (instagramUrl !== undefined) settings.instagramUrl = instagramUrl;
        if (youtubeUrl !== undefined) settings.youtubeUrl = youtubeUrl;
        await settings.save();

        res.status(200).json({
            success: true,
            data: settings,
            message: "Informations de contact mises à jour"
        });
    }),

    // Update promotion banner
    updatePromotion: asyncHandler(async (req, res) => {
        const { promotionEnabled, promotionText, promotionLink } = req.body;

        const settings = await LandingPageSettings.getSettings();
        if (promotionEnabled !== undefined) settings.promotionEnabled = promotionEnabled;
        if (promotionText !== undefined) settings.promotionText = promotionText;
        if (promotionLink !== undefined) settings.promotionLink = promotionLink;
        await settings.save();

        res.status(200).json({
            success: true,
            data: settings,
            message: "Bannière promotionnelle mise à jour"
        });
    }),
};
