export const getNoteContext = (note = {}) => {
  const question = note.questionId;
  // Old notes on native course questions can still recover their known topic.
  // Linked yearly questions need the explicitly saved course reference.
  const course = note.examCourseId?.name ? note.examCourseId : question?.examCourseId;
  const module = note.moduleId?.name ? note.moduleId : course?.moduleId;
  const exam = question?.examId;
  const courseName = course?.name || null;
  const examName = exam?.name || exam?.title || (exam?.year ? `Examen ${exam.year}` : null);
  const sourceNames = [...new Set([courseName, examName].filter(Boolean))];
  return {
    module: module?.name ? module : null,
    courseName,
    examName,
    sourceNames,
    origin: [...new Set([module?.name, ...sourceNames].filter(Boolean))].join(" > "),
  };
};
