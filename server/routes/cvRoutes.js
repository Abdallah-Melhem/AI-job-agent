const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { uploadCV, getCVs, downloadCV, deleteCV, parseCV } = require('../controllers/cvController');
const { protect } = require('../middleware/authMiddleware');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Allowed extensions and MIME types (PDF, DOCX, TXT, RTF)
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt', '.rtf'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/octet-stream',
  'text/plain',
  'application/rtf',
  'text/rtf'
];

// Multer storage with safe UUID filename
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const rawExt = path.extname(file.originalname).toLowerCase();
    const safeExt = rawExt.replace(/[^a-z0-9.]/g, '');
    cb(null, `${uuidv4()}${safeExt}`);
  }
});

// File validation filter
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isAllowedExt = ALLOWED_EXTENSIONS.includes(ext);
  const isAllowedMime = ALLOWED_MIME_TYPES.includes(file.mimetype);

  if (isAllowedExt && (isAllowedMime || file.mimetype === 'application/octet-stream')) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file format "${ext}". Please upload a PDF, DOCX, TXT, or RTF document.`), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// Safe upload wrapper middleware to handle Multer errors gracefully
const handleUpload = (req, res, next) => {
  upload.single('cv')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          message: 'File size exceeds the 5MB limit. Please upload a smaller file.'
        });
      }
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message || 'File upload rejected.' });
    }
    next();
  });
};

router.route('/')
  .get(protect, getCVs);

router.post('/upload', protect, handleUpload, uploadCV);

router.post('/:id/parse', protect, parseCV);

router.get('/:id/download', protect, downloadCV);
router.get('/:id/file', protect, downloadCV);

router.route('/:id')
  .delete(protect, deleteCV);

module.exports = router;
