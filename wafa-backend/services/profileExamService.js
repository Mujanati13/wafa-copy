import mongoose from "mongoose";
import ExamCourse from "../models/examCourseModel.js";
import ExamParYear from "../models/examParYearModel.js";
import QCMBanque from "../models/qcmBanqueModel.js";
import Question from "../models/questionModule.js";

// Read actual question membership, not cached totals or historical counters.
export const loadProfileExams = async (answeredQuestions) => {
  const answers = answeredQuestions instanceof Map
    ? [...answeredQuestions.values()]
    : Object.values(answeredQuestions || {});
  const ids = [...new Set(answers.map((answer) => String(answer?.examId || "")))]
    .filter((id) => mongoose.isValidObjectId(id));
  if (!ids.length) return [];
  const [courses, annualExams, banks] = await Promise.all([
    ExamCourse.find({ _id: { $in: ids } }).select("linkedQuestions")
      .populate({ path: "linkedQuestions", select: "_id" }).lean(),
    ExamParYear.find({ _id: { $in: ids } }).select("_id").lean(),
    QCMBanque.find({ _id: { $in: ids } }).select("_id").lean(),
  ]);
  const questions = annualExams.length || banks.length
    ? await Question.find({ $or: [
      { examId: { $in: annualExams.map((exam) => exam._id) } },
      { qcmBanqueId: { $in: banks.map((exam) => exam._id) } },
    ] }).select("_id examId qcmBanqueId").lean()
    : [];
  const byExam = new Map();
  for (const question of questions) {
    for (const id of [question.examId, question.qcmBanqueId].filter(Boolean)) {
      const key = String(id);
      if (!byExam.has(key)) byExam.set(key, []);
      byExam.get(key).push(question._id);
    }
  }
  return [
    ...courses.map((course) => ({ _id: course._id, questionIds: course.linkedQuestions })),
    ...[...annualExams, ...banks].map((exam) => ({
      _id: exam._id, questionIds: byExam.get(String(exam._id)) || [],
    })),
  ];
};
