const express = require('express');
const {
  getDocuments,
  getDocument,
  uploadDocument,
  updateDocument,
  deleteDocument,
  incrementDownload,
  downloadDocument,
  sendToWhatsApp
} = require('../controllers/documentController');
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

const router = express.Router();

router.use(protect); // All routes require authentication

router.put('/:id/download', incrementDownload);
router.get('/:id/file', downloadDocument);  // Must be before /:id route
router.post('/:id/send-whatsapp', sendToWhatsApp);  // Send document to WhatsApp

// Multer error handler middleware
const handleMulterError = (err, req, res, next) => {
  if (err) {
    console.error('❌ Multer error:', err.message);
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload error'
    });
  }
  next();
};

router.route('/')
  .get(getDocuments)
  .post(authorize('admin'), (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        console.error('❌ Upload middleware error:', err);
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload failed'
        });
      }
      next();
    });
  }, uploadDocument);

router.route('/:id')
  .get(getDocument)
  .put(authorize('admin'), updateDocument)
  .delete(authorize('admin'), deleteDocument);

module.exports = router;
