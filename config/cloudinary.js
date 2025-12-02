const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Cloudinary storage for documents
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'office-documents',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'],
    resource_type: 'auto',
    access_mode: 'public', // Make files publicly accessible
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      return file.originalname.split('.')[0] + '-' + uniqueSuffix;
    }
  }
});

// Configure Cloudinary storage for avatars
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'office-avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    resource_type: 'image',
    transformation: [{ width: 500, height: 500, crop: 'limit' }],
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      return 'avatar-' + uniqueSuffix;
    }
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file exists and has size
    if (!file) {
      cb(new Error('No file provided'));
      return;
    }
    
    // Accept the file
    cb(null, true);
  }
});

const uploadAvatar = multer({ 
  storage: avatarStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for avatars
  }
});

module.exports = { cloudinary, upload, uploadAvatar };
