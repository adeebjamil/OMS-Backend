const Document = require('../models/Document');
const { cloudinary } = require('../config/cloudinary');

// @desc    Get all documents
// @route   GET /api/documents
// @access  Private
exports.getDocuments = async (req, res, next) => {
  try {
    console.log('📄 GET /api/documents - User:', req.user?.email || 'Not authenticated');
    
    const { category, isPublic } = req.query;
    let query = {};

    if (req.user.role === 'intern') {
      query.$or = [
        { isPublic: true },
        { 'sharedWith.userId': req.user.id }
      ];
    }

    if (category) query.category = category;
    if (isPublic !== undefined) query.isPublic = isPublic;

    console.log('📄 Query:', JSON.stringify(query));

    const documents = await Document.find(query)
      .populate('uploadedBy', 'name email')
      .populate('sharedWith.userId', 'name email')
      .sort({ createdAt: -1 });

    console.log('📄 Found documents:', documents.length);

    res.status(200).json({
      success: true,
      count: documents.length,
      data: documents
    });
  } catch (error) {
    console.error('❌ Error fetching documents:', error.message);
    console.error('Stack:', error.stack);
    next(error);
  }
};

// @desc    Get single document
// @route   GET /api/documents/:id
// @access  Private
exports.getDocument = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('uploadedBy', 'name email')
      .populate('sharedWith.userId', 'name email');

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    res.status(200).json({
      success: true,
      data: document
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload document
// @route   POST /api/documents
// @access  Private/Admin
exports.uploadDocument = async (req, res, next) => {
  try {
    console.log('📤 POST /api/documents - Upload Request');
    console.log('📤 User:', req.user?.email);
    console.log('📤 File:', req.file ? req.file.originalname : 'NO FILE');
    console.log('📤 Body:', req.body);
    
    // Check if file was uploaded
    if (!req.file) {
      console.log('❌ No file in request');
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    console.log('📤 File details:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });

    // Parse tags if it's a string
    let tags = [];
    if (req.body.tags) {
      try {
        tags = typeof req.body.tags === 'string' 
          ? req.body.tags.split(',').map(t => t.trim()).filter(t => t)
          : req.body.tags;
      } catch (error) {
        tags = [];
      }
    }

    // Parse sharedWith if it exists
    let sharedWith = [];
    if (req.body.sharedWith) {
      try {
        sharedWith = typeof req.body.sharedWith === 'string'
          ? JSON.parse(req.body.sharedWith)
          : req.body.sharedWith;
      } catch (error) {
        sharedWith = [];
      }
    }

    // Create document with uploaded file info
    const documentData = {
      title: req.body.title,
      description: req.body.description || '',
      category: req.body.category || 'other',
      fileUrl: req.file.path, // Cloudinary URL
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      uploadedBy: req.user.id,
      isPublic: req.body.isPublic === 'true' || req.body.isPublic === true,
      tags: tags,
      sharedWith: sharedWith,
      expiryDate: req.body.expiryDate || null
    };

    console.log('📤 Creating document with data:', documentData);

    const document = await Document.create(documentData);

    console.log('✅ Document created successfully:', document._id);

    res.status(201).json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('❌ Upload error:', error.message);
    console.error('Stack:', error.stack);
    
    // If document creation fails, delete the uploaded file from Cloudinary
    if (req.file && req.file.filename) {
      try {
        await cloudinary.uploader.destroy(req.file.filename);
      } catch (deleteError) {
        console.error('Error deleting file from Cloudinary:', deleteError);
      }
    }
    next(error);
  }
};

// @desc    Update document
// @route   PUT /api/documents/:id
// @access  Private/Admin
exports.updateDocument = async (req, res, next) => {
  try {
    const document = await Document.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    res.status(200).json({
      success: true,
      data: document
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete document
// @route   DELETE /api/documents/:id
// @access  Private/Admin
exports.deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Extract public_id from Cloudinary URL to delete the file
    if (document.fileUrl) {
      try {
        // Extract public_id from URL (format: https://res.cloudinary.com/.../office-documents/filename)
        const urlParts = document.fileUrl.split('/');
        const publicIdWithExtension = urlParts.slice(-2).join('/'); // Get folder/filename
        const publicId = publicIdWithExtension.split('.')[0]; // Remove extension
        
        await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
      } catch (cloudinaryError) {
        console.error('Error deleting file from Cloudinary:', cloudinaryError);
        // Continue with document deletion even if Cloudinary deletion fails
      }
    }

    await Document.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Increment download count
// @route   PUT /api/documents/:id/download
// @access  Private
exports.incrementDownload = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    document.downloads += 1;
    await document.save();

    res.status(200).json({
      success: true,
      data: document
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download document file
// @route   GET /api/documents/:id/file
// @access  Private
exports.downloadDocument = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check if user has access (admin or document is public or shared with user)
    if (req.user.role !== 'admin' && !document.isPublic) {
      const hasAccess = document.sharedWith.some(
        share => share.userId.toString() === req.user.id
      );
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this document'
        });
      }
    }

    // Redirect to Cloudinary URL with attachment flag for download
    const urlParts = document.fileUrl.split('/upload/');
    let downloadUrl = document.fileUrl;
    
    if (urlParts.length === 2) {
      // Add fl_attachment to force download instead of display
      downloadUrl = `${urlParts[0]}/upload/fl_attachment/${urlParts[1]}`;
    }

    res.redirect(downloadUrl);
  } catch (error) {
    console.error('❌ Download error:', error);
    next(error);
  }
};
