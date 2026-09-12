import User from '../models/userModel.js';
import UserStats from '../models/userStatsModel.js';
import Report from '../models/reportQuestions.js';
import Explanation from '../models/explanationModel.js';
import Transaction from '../models/transactionModel.js';
import Contact from '../models/contactModel.js';
import asyncHandler from '../handlers/asyncHandler.js';

const students = { isAdmin: { $ne: true } };
const enabledStudents = { ...students, isAactive: true, isBlocked: { $ne: true } };

export const getOverviewStats = asyncHandler(async (req, res) => {
  const [totalUsers, activeUsers, activeSubscriptions, answers] = await Promise.all([
    User.countDocuments(students),
    User.countDocuments(enabledStudents),
    User.countDocuments({ ...enabledStudents, plan: /^Premium/, $or: [
      { planExpiry: { $gt: new Date() } }, { planExpiry: null },
    ] }),
    UserStats.aggregate([
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'student' } },
      { $match: { 'student.0': { $exists: true }, 'student.isAdmin': { $ne: true } } },
      { $project: { count: { $size: { $filter: {
        input: { $objectToArray: { $ifNull: ['$answeredQuestions', {}] } },
        as: 'answer', cond: { $eq: ['$$answer.v.isVerified', true] },
      } } } } },
      { $group: { _id: null, total: { $sum: '$count' } } },
    ]),
  ]);
  res.set('Cache-Control', 'no-store');
  res.json({ success: true, data: {
    totalUsers, activeUsers, activeSubscriptions,
    conversionRate: totalUsers ? Number((activeSubscriptions / totalUsers * 100).toFixed(2)) : 0,
    verifiedAnswers: answers[0]?.total || 0,
  } });
});

export const getOverviewActivity = asyncHandler(async (req, res) => {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));
  const types = ['user', 'report', 'explanation', 'payment', 'contact'];
  const type = req.query.type || 'all';
  if (type !== 'all' && !types.includes(type)) {
    return res.status(400).json({ success: false, message: 'Type d’activité invalide.' });
  }
  const sources = [
    ['user', User, students, 'username name createdAt', null, 'Nouvelle inscription', '/admin/users'],
    ['report', Report, {}, 'userId details status questionId createdAt', 'userId', 'Question signalée', '/admin/report-questions'],
    ['explanation', Explanation, {}, 'userId title status questionId createdAt', 'userId', 'Explication ajoutée', '/admin/explications'],
    ['payment', Transaction, { paymentMethod: { $in: ['Bank Transfer', 'Contact'] } }, 'user amount currency plan status createdAt', 'user', 'Demande de paiement', '/admin/demandes-de-paiements'],
    ['contact', Contact, {}, 'name subject status createdAt', null, 'Message de contact', '/admin/contact-messages'],
  ];
  const groups = await Promise.all(sources.filter(([key]) => type === 'all' || type === key).map(async ([key, model, filter, fields, owner, action, href]) => {
    let query = model.find(filter).select(fields).sort({ createdAt: -1, _id: -1 }).limit(limit);
    if (owner) query = query.populate(owner, 'username name');
    const rows = await query.lean();
    return rows.map(row => ({
      id: `${key}:${row._id}`, resourceId: String(row._id), type: key, action, href,
      user: (owner ? row[owner]?.name || row[owner]?.username : row.name || row.username) || 'Utilisateur supprimé',
      detail: String(row.title || row.subject || row.details || (key === 'payment' ? `${row.plan} · ${row.amount} ${row.currency}` : '')).slice(0, 240),
      status: row.status || null, time: row.createdAt,
    }));
  }));
  const activity = groups.flat().sort((a, b) => new Date(b.time) - new Date(a.time) || b.id.localeCompare(a.id));
  res.set('Cache-Control', 'no-store');
  res.json({ success: true, data: activity.slice(0, limit) });
});
