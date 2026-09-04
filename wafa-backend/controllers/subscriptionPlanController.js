import SubscriptionPlan from "../models/subscriptionPlanModel.js";
import asyncHandler from "../handlers/asyncHandler.js";

// Helper function to normalize features array
// Accepts both string arrays ["Feature1", "Feature2"] 
// and object arrays [{text: "Feature1", included: true}]
const normalizeFeatures = (features) => {
  if (!features || !Array.isArray(features)) return [];
  
  return features.filter(Boolean).map(f => {
    if (typeof f === 'string') {
      return { text: f.trim(), included: true };
    } else if (typeof f === 'object' && f.text) {
      return { 
        text: String(f.text).trim(), 
        included: f.included !== false
      };
    }
    return null;
  }).filter(Boolean);
};

const semesterCopy = (value = "") => String(value)
  .replace(/\b12\s+months?\b/gi, "6 months")
  .replace(/\b12\s+mois\b/gi, "6 mois")
  .replace(/\b(?:the\s+)?(?:whole\s+)?academic year\b/gi, "one semester")
  .replace(/\b(?:toute\s+votre\s+)?ann[ée]e universitaire\b/gi, "un semestre complet")
  .replace(/\ball semesters(?:\s*\([^)]*\))?/gi, "all modules in the selected semester")
  .replace(/\btous les semestres(?:\s*\([^)]*\))?/gi, "tous les modules du semestre choisi")
  .replace(/\bannual(?:ly)?\b/gi, "per semester")
  .replace(/\bannuel(?:le)?ment\b/gi, "par semestre")
  .replace(/\bannuel(?:le)?\b/gi, "Semestre");

const normalizePlanName = (name = "") => {
  const value = String(name).trim();
  const lowerName = value.toLowerCase();
  if (lowerName.includes("premium pro")) return "Premium Pro";
  if (lowerName.includes("premium")) return "Premium";
  return semesterCopy(value).trim();
};

const normalizePlan = (plan) => {
  const value = typeof plan?.toObject === "function" ? plan.toObject() : { ...plan };
  const isFreePlan = Number(value.price) === 0;
  return {
    ...value,
    name: normalizePlanName(value.name),
    description: semesterCopy(value.description),
    period: isFreePlan ? "Gratuit" : "Semestre",
    features: normalizeFeatures(value.features).map((feature) => ({
      ...feature,
      text: semesterCopy(feature.text),
    })),
  };
};

// Get all subscription plans
const getAllPlans = asyncHandler(async (req, res) => {
  const plans = await SubscriptionPlan.find()
    .sort({ order: 1, createdAt: 1 })
    .lean();

  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.status(200).json({
    success: true,
    data: plans.map(normalizePlan),
  });
});

// Public catalogue used by every customer-facing pricing surface.
const getAvailablePlans = asyncHandler(async (req, res) => {
  const plans = await SubscriptionPlan.find({ status: "Active" })
    .sort({ order: 1, createdAt: 1 })
    .lean();

  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.status(200).json({
    success: true,
    data: plans.map(normalizePlan),
  });
});

// Get single plan
const getPlanById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const plan = await SubscriptionPlan.findById(id);

  if (!plan) {
    return res.status(404).json({
      success: false,
      message: "Plan not found",
    });
  }

  res.status(200).json({
    success: true,
    data: normalizePlan(plan),
  });
});

// Create new plan (admin only)
const createPlan = asyncHandler(async (req, res) => {
  const { name, description, price, oldPrice, features, status, order, period } = req.body;

  // Validate required fields
  if (!name || price === undefined) {
    return res.status(400).json({
      success: false,
      message: "Name and price are required",
    });
  }

  const normalizedName = normalizePlanName(name);
  const existingPlan = await SubscriptionPlan.findOne({ name: normalizedName });
  if (existingPlan) {
    return res.status(409).json({
      success: false,
      message: "Plan with this name already exists",
    });
  }

  const isFreePlan = Number(price) === 0;
  const plan = new SubscriptionPlan({
    name: normalizedName,
    description: semesterCopy(description || ""),
    price,
    oldPrice: oldPrice || null,
    period: isFreePlan ? "Gratuit" : "Semester",
    features: normalizeFeatures(features).map((feature) => ({ ...feature, text: semesterCopy(feature.text) })),
    status: status || "Active",
    order: order !== undefined ? order : 0,
  });

  await plan.save();

  res.status(201).json({
    success: true,
    data: normalizePlan(plan),
    message: "Plan created successfully",
  });
});

// Update plan (admin only)
const updatePlan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, price, oldPrice, features, status, order, period } = req.body;

  const plan = await SubscriptionPlan.findById(id);

  if (!plan) {
    return res.status(404).json({
      success: false,
      message: "Plan not found",
    });
  }

  // Check for name conflict if name is being changed
  if (name && name !== plan.name) {
    const existingPlan = await SubscriptionPlan.findOne({ name });
    if (existingPlan) {
      return res.status(409).json({
        success: false,
        message: "Plan with this name already exists",
      });
    }
  }

  if (name) plan.name = normalizePlanName(name);
  if (description !== undefined) plan.description = semesterCopy(description);
  if (price !== undefined) plan.price = price;
  if (oldPrice !== undefined) plan.oldPrice = oldPrice;
  if (period !== undefined || price !== undefined) {
    plan.period = Number(price ?? plan.price) === 0 ? "Gratuit" : "Semester";
  }
  if (features !== undefined) {
    plan.features = normalizeFeatures(features).map((feature) => ({ ...feature, text: semesterCopy(feature.text) }));
  }
  if (status) plan.status = status;
  if (order !== undefined) plan.order = order;

  await plan.save();

  res.status(200).json({
    success: true,
    data: normalizePlan(plan),
    message: "Plan updated successfully",
  });
});

// Delete plan (admin only)
const deletePlan = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const plan = await SubscriptionPlan.findByIdAndDelete(id);

  if (!plan) {
    return res.status(404).json({
      success: false,
      message: "Plan not found",
    });
  }

  res.status(200).json({
    success: true,
    message: "Plan deleted successfully",
  });
});

export {
  getAllPlans,
  getAvailablePlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
};
