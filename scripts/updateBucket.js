require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uspedejixdrvxnxufgsx.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function updateBucket() {
  try {
    console.log('🔧 Updating OMS bucket settings...\n');

    // Update bucket to allow all mime types (remove restriction)
    const { data, error } = await supabase.storage.updateBucket('OMS', {
      public: true,
      allowedMimeTypes: [
        // Images
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        // PDF
        'application/pdf',
        // Word
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        // Excel
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        // PowerPoint
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        // Text
        'text/plain',
        'text/csv',
        'text/html',
        // Archives
        'application/zip',
        'application/x-rar-compressed',
        // Others
        'application/json',
        'application/xml'
      ],
      fileSizeLimit: 10485760 // 10MB
    });

    if (error) {
      console.error('❌ Error updating bucket:', error);
      return;
    }

    console.log('✅ Bucket updated successfully!');
    console.log('📦 Bucket data:', data);

    // Get bucket info
    const { data: bucketInfo, error: infoError } = await supabase.storage.getBucket('OMS');
    
    if (infoError) {
      console.error('❌ Error getting bucket info:', infoError);
      return;
    }

    console.log('\n📋 Current bucket settings:');
    console.log('   Name:', bucketInfo.name);
    console.log('   Public:', bucketInfo.public);
    console.log('   File Size Limit:', bucketInfo.file_size_limit ? `${bucketInfo.file_size_limit / (1024 * 1024)}MB` : 'None');
    console.log('   Allowed Mime Types:', bucketInfo.allowed_mime_types?.length || 'All');

  } catch (err) {
    console.error('❌ Script error:', err);
  }

  process.exit(0);
}

updateBucket();
