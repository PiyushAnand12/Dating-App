import multer from 'multer';

// ─── Constants ───────────────────────────────────────────────────────────────

const LIMITS = {
  photo: 5  * 1024 * 1024, //  5 MB
  video: 20 * 1024 * 1024, // 20 MB
  audio: 10 * 1024 * 1024, // 10 MB
};

const ALLOWED_MIME_TYPES = {
  photo: new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
  video: new Set(['video/mp4']),
  audio: new Set(['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/x-m4a']),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a multer file filter that accepts only the MIME types
 * belonging to the given upload category.
 */
const buildFileFilter = (category) => (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES[category].has(file.mimetype)) {
    cb(null, true);
    return;
  }

  const allowed = [...ALLOWED_MIME_TYPES[category]].join(', ');
  const err = new Error(
    `Unsupported file type "${file.mimetype}". Allowed for ${category}: ${allowed}`,
  );
  err.code       = 'UNSUPPORTED_FILE_TYPE';
  err.statusCode = 415;
  cb(err, false);
};

/**
 * Wrap a multer instance so that multer's own errors are normalised.
 */
const wrapSingle = (upload, field) => (req, res, next) => {
  upload.single(field)(req, res, (err) => {
    if (!err) {
      next();
      return;
    }

    if (err.code === 'LIMIT_FILE_SIZE') {
      const maxSize = field === 'kycVideo' ? '20 MB' : '5 MB';
      err.message    = `File too large. Maximum allowed size is ${maxSize}.`;
      err.code       = 'FILE_TOO_LARGE';
      err.statusCode = 413;
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      err.message    = `Unexpected field "${err.field}".`;
      err.code       = 'UNEXPECTED_FIELD';
      err.statusCode = 400;
    } else if (!err.statusCode) {
      err.statusCode = 400;
    }

    next(err);
  });
};

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Build a ready-to-use upload middleware for a given category.
 */
export const createUploadMiddleware = (category, field) => {
  if (!ALLOWED_MIME_TYPES[category]) {
    throw new Error(`Unknown upload category "${category}"`);
  }

  const upload = multer({
    storage: multer.memoryStorage(),
    limits:  { fileSize: LIMITS[category] },
    fileFilter: buildFileFilter(category),
  });

  const middlewares = [wrapSingle(upload, field)];

  return middlewares;
};

// ─── Pre-built middleware ─────────────────────────────────────────────────────

export const uploadProfilePhoto = createUploadMiddleware('photo', 'avatar');
export const uploadKycVideo = createUploadMiddleware('video', 'kycVideo');
export const uploadVoiceNote = createUploadMiddleware('audio', 'voice');
export const uploadReportEvidence = createUploadMiddleware('photo', 'evidence');

/** Accepts a story file (photo or video) and processes if photo. */
export const uploadStoryMedia = (req, res, next) => {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: LIMITS.video },
    fileFilter: (_req, file, cb) => {
      const allAllowed = new Set([...ALLOWED_MIME_TYPES.photo, ...ALLOWED_MIME_TYPES.video]);
      if (allAllowed.has(file.mimetype)) {
        cb(null, true);
      } else {
        const err = new Error(`Unsupported type "${file.mimetype}" for stories.`);
        err.statusCode = 415;
        cb(err, false);
      }
    }
  });

  wrapSingle(upload, 'story')(req, res, (err) => {
    if (err) return next(err);
    next();
  });
};

export default { 
  createUploadMiddleware, 
  uploadProfilePhoto, 
  uploadKycVideo, 
  uploadStoryMedia, 
  uploadVoiceNote,
  uploadReportEvidence
};
