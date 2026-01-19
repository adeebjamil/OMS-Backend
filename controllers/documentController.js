const DocumentService = require('../services/DocumentService');
const UserService = require('../services/UserService');
const { uploadFile, deleteFile, getPublicUrl } = require('../config/supabase');
const { createBulkNotifications } = require('./notificationController');

// @desc    Get all documents
// @route   GET /api/documents
// @access  Private
exports.getDocuments = async (req, res, next) => {
  try {
    console.log('📄 GET /api/documents - User:', req.user?.email || 'Not authenticated');
    
    const { category, isPublic, uploadedBy } = req.query;
    let filters = {};

    if (req.user.role === 'intern') {
      // Employees can see:
      // 1. Public documents
      // 2. Documents shared with them
      // 3. Documents they uploaded themselves
      filters.$or = [
        { isPublic: true },
        { 'sharedWith.userId': req.user.id },
        { uploadedBy: req.user.id }
      ];
    } else {
      // Admin can see all documents
      // Optional filter by uploader (employee)
      if (uploadedBy) {
        filters.uploadedBy = uploadedBy;
      }
    }

    if (category) filters.category = category;
    if (isPublic !== undefined) filters.isPublic = isPublic === 'true';

    console.log('📄 Query filters:', JSON.stringify(filters));

    const documents = await DocumentService.find(filters);

    console.log('📄 Found documents:', documents.length);

    res.status(200).json({
      success: true,
      count: documents.length,
      data: documents
    });
  } catch (error) {
    console.error('❌ Error fetching documents:', error.message);
    next(error);
  }
};

// @desc    Get single document
// @route   GET /api/documents/:id
// @access  Private
exports.getDocument = async (req, res, next) => {
  try {
    const document = await DocumentService.findById(req.params.id);

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

    // Check if file has content
    if (!req.file.size || req.file.size === 0) {
      console.log('❌ Empty file uploaded');
      return res.status(400).json({
        success: false,
        message: 'Cannot upload empty file. Please select a valid file.'
      });
    }

    console.log('📤 File details:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    // Upload file to Supabase Storage
    const uploadResult = await uploadFile(req.file, 'documents');
    console.log('📤 Upload result:', uploadResult);

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
    let shareWithAll = req.body.shareWithAll === 'true' || req.body.shareWithAll === true;
    let shareWithAdmins = req.body.shareWithAdmins === 'true' || req.body.shareWithAdmins === true;
    
    if (req.body.sharedWith) {
      try {
        sharedWith = typeof req.body.sharedWith === 'string'
          ? JSON.parse(req.body.sharedWith)
          : req.body.sharedWith;
      } catch (error) {
        sharedWith = [];
      }
    }

    // If share with all employees, get all intern IDs
    if (shareWithAll) {
      const allUsers = await UserService.find({ role: 'intern' });
      sharedWith = allUsers.map(u => ({
        userId: u.id,
        accessLevel: 'view'
      }));
    }

    // If share with all admins (for employee uploads), get all admin IDs
    if (shareWithAdmins) {
      const allAdmins = await UserService.find({ role: 'admin' });
      const adminShares = allAdmins.map(u => ({
        userId: u.id,
        accessLevel: 'view'
      }));
      sharedWith = [...sharedWith, ...adminShares];
    }

    // Create document with uploaded file info
    const documentData = {
      title: req.body.title,
      description: req.body.description || '',
      category: req.body.category || 'other',
      fileUrl: uploadResult.url,
      filePath: uploadResult.path,
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

    const document = await DocumentService.create(documentData);

    console.log('✅ Document created successfully:', document.id);

    // Create notifications for users
    try {
      let usersToNotify = [];
      
      if (documentData.isPublic) {
        // If public, notify all interns
        const interns = await UserService.find({ role: 'intern' });
        usersToNotify = interns.map(intern => intern.id);
        console.log(`📢 Public document - notifying ${usersToNotify.length} interns`);
      } else if (documentData.sharedWith && documentData.sharedWith.length > 0) {
        // If shared with specific users
        usersToNotify = documentData.sharedWith.map(share => 
          typeof share.userId === 'string' ? share.userId : share.userId
        );
        console.log(`📢 Shared document - notifying ${usersToNotify.length} specific users`);
      }

      if (usersToNotify.length > 0) {
        const notifications = usersToNotify.map(userId => ({
          userId: userId,
          type: 'document_shared',
          title: 'New Document Available',
          message: `A new document "${documentData.title}" has been uploaded`,
          relatedId: document.id,
          relatedModel: 'Document',
          link: `/dashboard/documents`,
          priority: 'normal',
          createdBy: req.user.id
        }));

        await createBulkNotifications(notifications);
        console.log(`✅ Created ${notifications.length} notifications`);
      }
    } catch (notifError) {
      console.error('❌ Error creating notifications:', notifError);
    }

    res.status(201).json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('❌ Upload error:', error.message);
    next(error);
  }
};

// @desc    Update document
// @route   PUT /api/documents/:id
// @access  Private/Admin
exports.updateDocument = async (req, res, next) => {
  try {
    const document = await DocumentService.findByIdAndUpdate(req.params.id, req.body);

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
// @access  Private (owner or admin)
exports.deleteDocument = async (req, res, next) => {
  try {
    const document = await DocumentService.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check if user is admin or the document owner
    if (req.user.role !== 'admin' && document.uploadedBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own documents'
      });
    }

    // Delete file from Supabase Storage
    if (document.filePath) {
      try {
        await deleteFile(document.filePath);
        console.log('✅ File deleted from storage:', document.filePath);
      } catch (storageError) {
        console.error('⚠️ Could not delete file from storage:', storageError);
      }
    }

    await DocumentService.findByIdAndDelete(req.params.id);

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
    const document = await DocumentService.incrementDownload(req.params.id);

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

// @desc    Download document
// @route   GET /api/documents/:id/file
// @access  Private
exports.downloadDocument = async (req, res, next) => {
  try {
    const document = await DocumentService.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Redirect to the file URL
    res.redirect(document.fileUrl);
  } catch (error) {
    next(error);
  }
};

// @desc    Send document to WhatsApp (placeholder)
// @route   POST /api/documents/:id/send-whatsapp
// @access  Private
exports.sendToWhatsApp = async (req, res, next) => {
  try {
    const document = await DocumentService.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Placeholder - WhatsApp integration would go here
    res.status(200).json({
      success: true,
      message: 'WhatsApp integration not implemented yet'
    });
  } catch (error) {
    next(error);
  }
};
