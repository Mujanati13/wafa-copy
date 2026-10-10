import Note from "../models/noteModel.js";
import asyncHandler from "../handlers/asyncHandler.js";
import { NotificationController } from "./notificationController.js";
import ExamCourse from "../models/examCourseModel.js";
import Question from "../models/questionModule.js";

const coursePopulation = {
  path: "examCourseId",
  select: "name moduleId",
  populate: { path: "moduleId", select: "name semester" },
};

const populateNoteContext = (query) => query
  .populate("moduleId", "name semester")
  .populate(coursePopulation)
  .populate({
    path: "questionId",
    select: "text questionNumber options images examId examCourseId",
    populate: [
      { path: "examId", select: "name year title type" },
      coursePopulation,
    ],
  });

const resolveCourseContext = async (examCourseId, questionId) => {
  if (!examCourseId) return null;
  if (!/^[a-fA-F0-9]{24}$/.test(examCourseId) || !/^[a-fA-F0-9]{24}$/.test(questionId || "")) {
    throw Object.assign(new Error("A valid course and question are required"), { statusCode: 400 });
  }
  const course = await ExamCourse.findById(examCourseId).select("moduleId linkedQuestions");
  const question = await Question.findById(questionId).select("examCourseId");
  if (!course || !question) {
    throw Object.assign(new Error("Course or question not found"), { statusCode: 404 });
  }
  const linked = course.linkedQuestions.some(id => String(id) === String(questionId));
  if (!linked && String(question.examCourseId || "") !== String(examCourseId)) {
    throw Object.assign(new Error("This question does not belong to the selected course"), { statusCode: 400 });
  }
  return { examCourseId: course._id, moduleId: course.moduleId };
};

export const noteController = {
  // Create new note
  create: asyncHandler(async (req, res) => {
    const { title, content, questionId, moduleId, examCourseId, tags, color } = req.body;
    const userId = req.user._id;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Title and content are required",
      });
    }

    const courseContext = await resolveCourseContext(examCourseId, questionId);
    const note = await Note.create({
      userId,
      title,
      content,
      questionId: questionId || null,
      moduleId: moduleId || null,
      examCourseId: null,
      ...courseContext,
      tags: tags || [],
      color: color || "#fbbf24",
    });

    // Create notification for new note
    try {
      await NotificationController.createNotification(
        userId,
        "note_created",
        "Nouvelle note créée",
        `Votre note "${title}" a été créée avec succès`,
        "/dashboard/note"
      );
    } catch (error) {
      console.error("Error creating notification:", error);
    }

    res.status(201).json({
      success: true,
      message: "Note created successfully",
      data: note,
    });
  }),

  // Get all user's notes
  getAll: asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { moduleId, questionId, examCourseId, tag, search } = req.query;

    const query = { userId };
    if (moduleId) query.moduleId = moduleId;
    if (questionId) query.questionId = questionId;
    // The exam modal requests a separate note for each course context. Null
    // also matches older notes with no course reference in MongoDB.
    if (examCourseId === "null") query.examCourseId = null;
    else if (examCourseId) {
      if (!/^[a-fA-F0-9]{24}$/.test(examCourseId)) {
        return res.status(400).json({ success: false, message: "Invalid course ID" });
      }
      query.examCourseId = examCourseId;
    }
    if (tag) query.tags = tag;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }

    const notes = await populateNoteContext(Note.find(query))
      .sort({ isPinned: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      data: notes,
    });
  }),

  // Get single note
  getById: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

    const note = await populateNoteContext(Note.findOne({ _id: id, userId }));

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    res.status(200).json({
      success: true,
      data: note,
    });
  }),

  // Update note
  update: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;
    const { title, content, questionId, moduleId, examCourseId, tags, color, isPinned } =
      req.body;

    const note = await Note.findOne({ _id: id, userId });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    if (title) note.title = title;
    if (content !== undefined) note.content = content;
    if (questionId !== undefined) note.questionId = questionId;
    if (moduleId !== undefined) note.moduleId = moduleId;
    if (examCourseId !== undefined || (questionId !== undefined && note.examCourseId)) {
      const courseContext = await resolveCourseContext(
        examCourseId === undefined ? note.examCourseId : examCourseId,
        questionId === undefined ? note.questionId : questionId,
      );
      if (courseContext) Object.assign(note, courseContext);
      else note.examCourseId = null;
    }
    if (tags) note.tags = tags;
    if (color) note.color = color;
    if (isPinned !== undefined) note.isPinned = isPinned;

    await note.save();

    res.status(200).json({
      success: true,
      message: "Note updated successfully",
      data: note,
    });
  }),

  // Toggle pin status
  togglePin: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

    const note = await Note.findOne({ _id: id, userId });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    note.isPinned = !note.isPinned;
    await note.save();

    res.status(200).json({
      success: true,
      message: `Note ${note.isPinned ? "pinned" : "unpinned"} successfully`,
      data: note,
    });
  }),

  // Delete note
  delete: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

    const note = await Note.findOneAndDelete({ _id: id, userId });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Note deleted successfully",
    });
  }),

  // Get notes by module
  getByModule: asyncHandler(async (req, res) => {
    const { moduleId } = req.params;
    const userId = req.user._id;

    const notes = await populateNoteContext(Note.find({ userId, moduleId }))
      .sort({ isPinned: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      data: notes,
    });
  }),

  // Get notes by question
  getByQuestion: asyncHandler(async (req, res) => {
    const { questionId } = req.params;
    const userId = req.user._id;

    const notes = await populateNoteContext(Note.find({ userId, questionId })).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      data: notes,
    });
  }),
};
