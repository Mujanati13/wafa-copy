import multer from "multer";
import fs from "fs";
import path from "path";
import {
  isAllowedResumeFile,
  MAX_RESUME_FILE_SIZE,
  sanitizeResumeFilename,
} from "../utils/resumeUpload.js";

// Configure Multer to use memory storage
const storage = multer.memoryStorage();

// File filter for images
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Veuillez télécharger une image valide"), false);
  }
};

// File filter for PDFs
const pdfFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Veuillez télécharger un fichier PDF valide"), false);
  }
};

// File filter for documents (PDF, Images, Word)
const documentFilter = (req, file, cb) => {
  if (isAllowedResumeFile(file)) {
    cb(null, true);
  } else {
    cb(new Error("Veuillez télécharger un fichier valide (PDF, Image, ou Word)"), false);
  }
};

// File filter for Excel files
const excelFilter = (req, file, cb) => {
  const allowedMimes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-excel", // .xls
    "text/csv" // .csv
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Veuillez télécharger un fichier Excel valide (.xlsx, .xls, .csv)"), false);
  }
};

// Upload middleware for profile pictures
export const uploadProfilePicture = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: imageFilter,
}).single("profilePicture");

// Upload middleware for PDFs
export const uploadPDF = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max for PDFs
  },
  fileFilter: pdfFilter,
});

const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads", "resumes");
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => cb(null, sanitizeResumeFilename(file.originalname)),
});

// Disk-backed upload keeps large study documents out of Node's heap.
export const uploadDocument = multer({
  storage: resumeStorage,
  limits: {
    fileSize: MAX_RESUME_FILE_SIZE,
  },
  fileFilter: documentFilter,
});

// Save profile picture locally
export const saveProfilePictureLocally = async (buffer, userId) => {
  const uploadDir = path.join(process.cwd(), 'uploads', 'profiles');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  const filename = `profile-${userId}-${Date.now()}.jpg`;
  const filePath = path.join(uploadDir, filename);
  
  await fs.promises.writeFile(filePath, buffer);
  
  return {
    secure_url: `/uploads/profiles/${filename}`,
    public_id: filename
  };
};

// Configure disk storage for question images
const questionImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'questions');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extensionByMime = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/gif": ".gif",
    };
    cb(null, `question-${uniqueSuffix}${extensionByMime[file.mimetype]}`);
  }
});

const questionImageFilter = (req, file, cb) => {
  const supportedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
  if (supportedTypes.has(file.mimetype)) return cb(null, true);
  return cb(new Error("Format non pris en charge. Utilisez JPG, PNG, WebP ou GIF."), false);
};

// Upload middleware for question images (multiple)
export const uploadQuestionImages = multer({
  storage: questionImageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max per image
  },
  fileFilter: questionImageFilter,
}).array("images", 10); // Max 10 images

// Upload middleware for Excel files
export const uploadExcelFile = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: excelFilter,
}).single("file");

// Helper function to delete image from local storage
export const deleteFromLocalStorage = async (filename) => {
  try {
    const filePath = path.join(process.cwd(), 'uploads', filename);
    await fs.promises.unlink(filePath);
  } catch (error) {
    console.error("Error deleting from local storage:", error);
  }
};

export default {
  uploadProfilePicture,
  uploadPDF,
  uploadDocument,
  saveProfilePictureLocally,
  deleteFromLocalStorage,
  uploadQuestionImages,
  uploadExcelFile
};
