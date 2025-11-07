const Document = require('../models/Document');
const { cloudinary } = require('../config/cloudinary');
const { sendWhatsAppDocument } = require('../config/whatsapp');
const { createBulkNotifications } = require('./notificationController');
const User = require('../models/User');

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

    // Create notifications for users
    try {
      let usersToNotify = [];
      
      if (documentData.isPublic) {
        // If public, notify all interns
        const interns = await User.find({ role: 'intern' }).select('_id');
        usersToNotify = interns.map(intern => intern._id.toString());
        console.log(`📢 Public document - notifying ${usersToNotify.length} interns`);
      } else if (documentData.sharedWith && documentData.sharedWith.length > 0) {
        // If shared with specific users
        usersToNotify = documentData.sharedWith.map(share => 
          typeof share.userId === 'string' ? share.userId : share.userId.toString()
        );
        console.log(`📢 Shared document - notifying ${usersToNotify.length} specific users`);
      }

      if (usersToNotify.length > 0) {
        const notifications = usersToNotify.map(userId => ({
          userId: userId,
          type: 'document_shared',
          title: 'New Document Available',
          message: `A new document "${documentData.title}" has been uploaded`,
          relatedId: document._id,
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
      // Don't fail the upload if notifications fail
    }

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

    // Stream the file through our server
    try {
      console.log('📥 Download Request:');
      console.log('  - File:', document.fileName);
      console.log('  - URL:', document.fileUrl);
      console.log('  - Type:', document.fileType);
      console.log('  - Size:', document.fileSize);
      
      const axios = require('axios');
      
      // Fetch file from Cloudinary
      const response = await axios.get(document.fileUrl, { 
        responseType: 'stream',
        timeout: 30000,
        maxRedirects: 5
      });
      
      console.log('✅ Cloudinary response received');
      console.log('  - Status:', response.status);
      console.log('  - Content-Type:', response.headers['content-type']);
      
      // Set headers for download
      res.setHeader('Content-Type', document.fileType || response.headers['content-type'] || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.fileName)}"`);
      res.setHeader('Cache-Control', 'no-cache');
      
      // Handle stream errors
      response.data.on('error', (streamError) => {
        console.error('❌ Stream error:', streamError);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Error streaming file'
          });
        }
      });
      
      // Pipe the Cloudinary stream to response
      response.data.pipe(res);
      
      console.log('✅ File streaming started');
      
    } catch (downloadError) {
      console.error('❌ Download error:');
      console.error('  - Message:', downloadError.message);
      console.error('  - Status:', downloadError.response?.status);
      console.error('  - Data:', downloadError.response?.data);
      console.error('  - URL:', document.fileUrl);
      
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: `Error downloading file: ${downloadError.message}`
        });
      }
    }
  } catch (error) {
    console.error('❌ Download error:', error);
    next(error);
  }
};

// @desc    Send document to WhatsApp
// @route   POST /api/documents/:id/send-whatsapp
// @access  Private (Admin and Intern)
exports.sendToWhatsApp = async (req, res, next) => {
  try {
    const { phone, message } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Validate phone number format
    const phoneRegex = /^[1-9]\d{9,14}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number. Use format: country code + number (e.g., 919876543210)'
      });
    }

    const document = await Document.findById(req.params.id)
      .populate('uploadedBy', 'name email');

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check if user has access
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

    // Prepare caption
    const caption = message || `📄 ${document.title}\n\n${document.description || 'Document shared from Office Hub'}\n\nCategory: ${document.category}\nShared by: ${req.user.name}`;

    console.log(`📱 Sending document to WhatsApp: ${phone}`);
    console.log(`📄 Document: ${document.title}`);
    console.log(`🔗 URL: ${document.fileUrl}`);

    // Send document via WhatsApp
    const whatsappResult = await sendWhatsAppDocument(
      phone,
      document.fileUrl,
      document.fileName,
      caption
    );

    if (!whatsappResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send document via WhatsApp',
        error: whatsappResult.error
      });
    }

    console.log(`✅ Document sent successfully to ${phone}`);

    res.status(200).json({
      success: true,
      message: 'Document sent to WhatsApp successfully',
      data: {
        document: {
          id: document._id,
          title: document.title,
          fileName: document.fileName
        },
        recipient: phone.replace(/.(?=.{4})/g, '*'), // Mask phone
        whatsappMessageId: whatsappResult.data?.messages?.[0]?.id
      }
    });
  } catch (error) {
    console.error('❌ WhatsApp send error:', error);
    next(error);
  }
};

