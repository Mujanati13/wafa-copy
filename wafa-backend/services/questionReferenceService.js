import Question from "../models/questionModule.js";
import ExamParYear from "../models/examParYearModel.js";
import ExamCourse from "../models/examCourseModel.js";
import QCMBanque from "../models/qcmBanqueModel.js";

export const getQuestionReferences = async (questionId) => {
  const question = await Question.findById(questionId)
    .select("examId examCourseId qcmBanqueId").lean();
  if (!question) return null;

  // Older questions created directly in course/QCM mode stored the parent ID
  // in examId. Resolve each collection without treating a course as a year exam.
  const directCourseIds = [question.examCourseId, question.examId].filter(Boolean);
  const qcmId = question.qcmBanqueId || question.examId;
  const [yearlyExam, courses, qcmBanque] = await Promise.all([
    question.examId ? ExamParYear.findById(question.examId).select("name year").lean() : null,
    ExamCourse.find({
      $or: [
        { linkedQuestions: question._id },
        ...(directCourseIds.length ? [{ _id: { $in: directCourseIds } }] : []),
      ],
    }).select("name").sort({ name: 1, _id: 1 }).lean(),
    qcmId ? QCMBanque.findById(qcmId).select("name").lean() : null,
  ]);
  return { yearlyExam, courses, qcmBanque };
};
