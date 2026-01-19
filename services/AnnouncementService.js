const { supabase } = require('../config/supabase');

class AnnouncementService {
  static tableName = 'announcements';

  // Create announcement
  static async create(announcementData) {
    try {
      const dbData = this.toDbFormat(announcementData);

      const { data, error } = await supabase
        .from(this.tableName)
        .insert([dbData])
        .select()
        .single();

      if (error) throw error;
      return this.toCamelCase(data);
    } catch (error) {
      console.error('AnnouncementService.create error:', error);
      throw error;
    }
  }

  // Find announcement by ID
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select(`
          *,
          publisher:published_by (id, name, email)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.toCamelCase(data, true);
    } catch (error) {
      console.error('AnnouncementService.findById error:', error);
      throw error;
    }
  }

  // Find all announcements with filters
  static async find(filters = {}) {
    try {
      let query = supabase.from(this.tableName).select(`
        *,
        publisher:published_by (id, name, email)
      `);

      if (filters.isActive !== undefined) query = query.eq('is_active', filters.isActive);
      
      // Handle $or for target audience
      if (filters.$or) {
        const audiences = filters.$or
          .filter(f => f.targetAudience)
          .map(f => f.targetAudience);
        
        if (audiences.length > 0) {
          query = query.in('target_audience', audiences);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(announcement => this.toCamelCase(announcement, true));
    } catch (error) {
      console.error('AnnouncementService.find error:', error);
      throw error;
    }
  }

  // Save (update existing announcement)
  static async save(announcement) {
    try {
      const dbData = this.toDbFormat(announcement);

      const { data, error } = await supabase
        .from(this.tableName)
        .update(dbData)
        .eq('id', announcement.id)
        .select()
        .single();

      if (error) throw error;
      return this.toCamelCase(data);
    } catch (error) {
      console.error('AnnouncementService.save error:', error);
      throw error;
    }
  }

  // Mark as read by user
  static async markAsRead(announcementId, userId) {
    try {
      // First get current readBy array
      const { data: announcement, error: fetchError } = await supabase
        .from(this.tableName)
        .select('read_by')
        .eq('id', announcementId)
        .single();

      if (fetchError) throw fetchError;

      const readBy = announcement.read_by || [];
      
      // Check if already read
      if (readBy.some(r => r.userId === userId)) {
        return this.toCamelCase(announcement);
      }

      // Add to readBy
      readBy.push({
        userId,
        readAt: new Date().toISOString()
      });

      const { data, error } = await supabase
        .from(this.tableName)
        .update({ read_by: readBy })
        .eq('id', announcementId)
        .select()
        .single();

      if (error) throw error;
      return this.toCamelCase(data);
    } catch (error) {
      console.error('AnnouncementService.markAsRead error:', error);
      throw error;
    }
  }

  // Transform camelCase to snake_case for database
  static toDbFormat(data) {
    const result = {};
    
    const keyMap = {
      publishedBy: 'published_by',
      targetAudience: 'target_audience',
      isActive: 'is_active',
      expiryDate: 'expiry_date',
      readBy: 'read_by',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    };

    for (const [key, value] of Object.entries(data)) {
      if (key === '_id' || key === 'publisher') continue;
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
    
    return {
      id: data.id,
      _id: data.id,
      title: data.title,
      content: data.content,
      type: data.type,
      priority: data.priority,
      publishedBy: withPopulate && data.publisher ? {
        id: data.publisher.id,
        _id: data.publisher.id,
        name: data.publisher.name,
        email: data.publisher.email
      } : data.published_by,
      targetAudience: data.target_audience,
      isActive: data.is_active,
      expiryDate: data.expiry_date,
      attachments: data.attachments || [],
      readBy: data.read_by || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

module.exports = AnnouncementService;
