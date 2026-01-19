const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://uspedejixdrvxnxufgsx.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Create Supabase client with service role key for backend operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Create a public client for non-sensitive operations
const supabasePublic = createClient(supabaseUrl, supabaseAnonKey);

// Storage bucket name
const STORAGE_BUCKET = 'OMS';

// Helper function to get public URL for a file
const getPublicUrl = (filePath) => {
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
};

// Helper function to upload file to Supabase Storage
const uploadFile = async (file, folder = 'documents') => {
  try {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${folder}/${uniqueSuffix}.${fileExtension}`;

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) {
      console.error('❌ Storage upload error:', error);
      throw error;
    }

    const publicUrl = getPublicUrl(fileName);
    
    return {
      path: fileName,
      url: publicUrl,
      size: file.size,
      mimetype: file.mimetype,
      originalname: file.originalname
    };
  } catch (error) {
    console.error('❌ Upload error:', error);
    throw error;
  }
};

// Helper function to delete file from Supabase Storage
const deleteFile = async (filePath) => {
  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error('❌ Storage delete error:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('❌ Delete error:', error);
    throw error;
  }
};

// Helper function to upload avatar
const uploadAvatar = async (file, userId) => {
  try {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `avatars/${userId}-${uniqueSuffix}.${fileExtension}`;

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true
      });

    if (error) {
      console.error('❌ Avatar upload error:', error);
      throw error;
    }

    return getPublicUrl(fileName);
  } catch (error) {
    console.error('❌ Avatar upload error:', error);
    throw error;
  }
};

module.exports = {
  supabase,
  supabasePublic,
  supabaseUrl,
  STORAGE_BUCKET,
  getPublicUrl,
  uploadFile,
  deleteFile,
  uploadAvatar
};
