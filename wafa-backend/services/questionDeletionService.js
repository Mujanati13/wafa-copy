import ExamCourse from "../models/examCourseModel.js";
import Question from "../models/questionModule.js";

const uniqueQuestionIds = (questionIds = []) => [
  ...new Map(questionIds.filter(Boolean).map((id) => [String(id), id])).values(),
];

// Questions from yearly exams can also be attached to one or more courses.
// Removing a question must remove those references too, otherwise an old link
// can keep inflating progress totals after its source exam has gone away.
export const unlinkQuestionsFromCourses = async (questionIds = []) => {
  const ids = uniqueQuestionIds(questionIds);
  if (ids.length === 0) return { matchedCount: 0, modifiedCount: 0 };

  return ExamCourse.updateMany(
    {
      $or: [
        { linkedQuestions: { $in: ids } },
        { "questionSources.questionId": { $in: ids } },
      ],
    },
    [
      {
        $set: {
          linkedQuestions: {
            $filter: {
              input: { $ifNull: ["$linkedQuestions", []] },
              as: "questionId",
              cond: { $not: [{ $in: ["$$questionId", ids] }] },
            },
          },
          questionSources: {
            $filter: {
              input: { $ifNull: ["$questionSources", []] },
              as: "source",
              cond: { $not: [{ $in: ["$$source.questionId", ids] }] },
            },
          },
        },
      },
      { $set: { totalQuestions: { $size: "$linkedQuestions" } } },
    ],
  );
};

export const deleteQuestionsAndUnlink = async (filter) => {
  const questions = await Question.find(filter).select("_id").lean();
  const questionIds = uniqueQuestionIds(questions.map((question) => question._id));

  if (questionIds.length === 0) {
    return { deletedCount: 0, questionIds };
  }

  await unlinkQuestionsFromCourses(questionIds);
  const result = await Question.deleteMany({ _id: { $in: questionIds } });

  return {
    deletedCount: result.deletedCount || 0,
    questionIds,
  };
};
