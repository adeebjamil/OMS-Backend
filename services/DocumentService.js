const { supabase } = require('../config/supabase');

class DocumentService {
  static tableName = 'documents';

  // Create document
  static async create(documentData) {
    try {
      const dbData = this.toDbFormat(documentData);

      const { data, error } = await supabase
        .from(this.tableName)
        .insert([dbData])
        .select()
        .single();

      if (error) throw error;
      return this.toCamelCase(data);
    } catch (error) {
      console.error('DocumentService.create error:', error);
      throw error;
    }
  }

  // Find document by ID with populated fields
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select(`
          *,
          uploadedByUser:uploaded_by (id, name, email)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.toCamelCase(data, true);
    } catch (error) {
      console.error('DocumentService.findById error:', error);
      throw error;
    }
  }

  // Find all documents with filters
  static async find(filters = {}) {
    try {
      let query = supabase.from(this.tableName).select(`
        *,
        uploadedByUser:uploaded_by (id, name, email)
      `);

      if (filters.category) query = query.eq('category', filters.category);
      if (filters.isPublic !== undefined) query = query.eq('is_public', filters.isPublic);
      if (filters.uploadedBy) query = query.eq('uploaded_by', filters.uploadedBy);
      
      // For intern access - documents that are public OR shared with them OR uploaded by them
      if (filters.$or) {
        // Complex OR query for access control
        const publicFilter = filters.$or.find(f => f.isPublic !== undefined);
        const sharedFilter = filters.$or.find(f => f['sharedWith.userId']);
        const uploadedByFilter = filters.$or.find(f => f.uploadedBy);
        
        // Get all documents first
        const { data: allDocs } = await supabase.from(this.tableName).select(`
          *,
          uploadedByUser:uploaded_by (id, name, email)
        `);
        
        if (!allDocs) return [];
        
        const sharedUserId = sharedFilter ? sharedFilter['sharedWith.userId'] : null;
        const uploadedByUserId = uploadedByFilter ? uploadedByFilter.uploadedBy : null;
        
        // Filter documents based on OR conditions
        const filteredDocs = allDocs.filter(doc => {
          // Check if document is public
          if (publicFilter && doc.is_public === true) return true;
          
          // Check if document is shared with the user
          if (sharedUserId) {
            const sharedWith = doc.shared_with || [];
            if (sharedWith.some(share => share.userId === sharedUserId)) return true;
          }
          
          // Check if document was uploaded by the user
          if (uploadedByUserId && doc.uploaded_by === uploadedByUserId) return true;
          
          return false;
        });
        
        // Sort by created_at descending
        filteredDocs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        return filteredDocs.map(doc => this.toCamelCase(doc, true));
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(doc => this.toCamelCase(doc, true));
    } catch (error) {
      console.error('DocumentService.find error:', error);
      throw error;
    }
  }

  // Update document
  static async findByIdAndUpdate(id, updates, options = {}) {
    try {
      const dbData = this.toDbFormat(updates);

      const { data, error } = await supabase
        .from(this.tableName)
        .update(dbData)
        .eq('id', id)
        .select(`
          *,
          uploadedByUser:uploaded_by (id, name, email)
        `)
        .single();

      if (error) throw error;
      return this.toCamelCase(data, true);
    } catch (error) {
      console.error('DocumentService.findByIdAndUpdate error:', error);
      throw error;
    }
  }

  // Delete document
  static async findByIdAndDelete(id) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return this.toCamelCase(data);
    } catch (error) {
      console.error('DocumentService.findByIdAndDelete error:', error);
      throw error;
    }
  }

  // Increment download count
  static async incrementDownload(id) {
    try {
      // Get current download count
      const { data: doc, error: fetchError } = await supabase
        .from(this.tableName)
        .select('downloads')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from(this.tableName)
        .update({ downloads: (doc.downloads || 0) + 1 })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return this.toCamelCase(data);
    } catch (error) {
      console.error('DocumentService.incrementDownload error:', error);
      throw error;
    }
  }

  // Transform camelCase to snake_case for database
  static toDbFormat(data) {
    const result = {};
    
    const keyMap = {
      fileUrl: 'file_url',
      fileName: 'file_name',
      filePath: 'file_path',
      fileSize: 'file_size',
      fileType: 'file_type',
      uploadedBy: 'uploaded_by',
      sharedWith: 'shared_with',
      isPublic: 'is_public',
      expiryDate: 'expiry_date',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    };

    for (const [key, value] of Object.entries(data)) {
      if (key === '_id' || key === 'uploadedByUser') continue;
      if (keyMap[key]) {
        result[keyMap[key]] = value;
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  // Transform snake_case to camelCase from database
  static toCamelCase(data, withPopulate = false) {
    if (!data) return null;
    
    // Transform shared_with to include user info if needed
    let sharedWith = data.shared_with || [];
    
    return {
      id: data.id,
      _id: data.id,
      title: data.title,
      description: data.description,
      category: data.category,
      fileUrl: data.file_url,
      fileName: data.file_name,
      filePath: data.file_path,
      fileSize: data.file_size,
      fileType: data.file_type,
      uploadedBy: withPopulate && data.uploadedByUser ? {
        id: data.uploadedByUser.id,
        _id: data.uploadedByUser.id,
        name: data.uploadedByUser.name,
        email: data.uploadedByUser.email
      } : data.uploaded_by,
      sharedWith: sharedWith,
      isPublic: data.is_public,
      tags: data.tags || [],
      downloads: data.downloads,
      expiryDate: data.expiry_date,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

module.exports = DocumentService;
