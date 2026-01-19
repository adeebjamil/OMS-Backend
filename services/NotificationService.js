const { supabase } = require('../config/supabase');

class NotificationService {
  static tableName = 'notifications';

  // Create notification
  static async create(notificationData) {
    try {
      const dbData = this.toDbFormat(notificationData);

      const { data, error } = await supabase
        .from(this.tableName)
        .insert([dbData])
        .select()
        .single();

      if (error) throw error;
      return this.toCamelCase(data);
    } catch (error) {
      console.error('NotificationService.create error:', error);
      throw error;
    }
  }

  // Create multiple notifications
  static async insertMany(notifications) {
    try {
      const dbDataArray = notifications.map(n => this.toDbFormat(n));

      const { data, error } = await supabase
        .from(this.tableName)
        .insert(dbDataArray)
        .select();

      if (error) throw error;
      return data.map(n => this.toCamelCase(n));
    } catch (error) {
      console.error('NotificationService.insertMany error:', error);
      throw error;
    }
  }

  // Find notification by ID
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select(`
          *,
          creator:created_by (id, name, avatar)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.toCamelCase(data, true);
    } catch (error) {
      console.error('NotificationService.findById error:', error);
      throw error;
    }
  }

  // Find all notifications with filters
  static async find(filters = {}, options = {}) {
    try {
      let query = supabase.from(this.tableName).select(`
        *,
        creator:created_by (id, name, avatar)
      `);

      if (filters.userId) query = query.eq('user_id', filters.userId);
      if (filters.isRead !== undefined) query = query.eq('is_read', filters.isRead);
      if (filters.type) query = query.eq('type', filters.type);

      query = query.order('created_at', { ascending: false });

      if (options.limit) query = query.limit(options.limit);
      if (options.skip) query = query.range(options.skip, options.skip + (options.limit || 50) - 1);

      const { data, error } = await query;

      if (error) throw error;
      return data.map(notification => this.toCamelCase(notification, true));
    } catch (error) {
      console.error('NotificationService.find error:', error);
      throw error;
    }
  }

  // Find one and update
  static async findOneAndUpdate(filters, updates, options = {}) {
    try {
      const dbUpdates = this.toDbFormat(updates);
      
      let query = supabase.from(this.tableName).update(dbUpdates);
      
      if (filters._id) query = query.eq('id', filters._id);
      if (filters.userId) query = query.eq('user_id', filters.userId);

      if (options.new !== false) {
        query = query.select().single();
      }

      const { data, error } = await query;

      if (error) throw error;
      return options.new !== false ? this.toCamelCase(data) : null;
    } catch (error) {
      console.error('NotificationService.findOneAndUpdate error:', error);
      throw error;
    }
  }

  // Find one and delete
  static async findOneAndDelete(filters) {
    try {
      let query = supabase.from(this.tableName).delete();
      
      if (filters._id) query = query.eq('id', filters._id);
      if (filters.userId) query = query.eq('user_id', filters.userId);

      const { data, error } = await query.select().single();

      if (error) throw error;
      return this.toCamelCase(data);
    } catch (error) {
      console.error('NotificationService.findOneAndDelete error:', error);
      throw error;
    }
  }

  // Update many notifications
  static async updateMany(filters, updates) {
    try {
      const dbUpdates = this.toDbFormat(updates);
      
      let query = supabase.from(this.tableName).update(dbUpdates);
      
      if (filters.userId) query = query.eq('user_id', filters.userId);
      if (filters.isRead === false) query = query.eq('is_read', false);

      const { error } = await query;

      if (error) throw error;
      return { acknowledged: true };
    } catch (error) {
      console.error('NotificationService.updateMany error:', error);
      throw error;
    }
  }

  // Count documents
  static async countDocuments(filters = {}) {
    try {
      let query = supabase.from(this.tableName).select('id', { count: 'exact', head: true });

      if (filters.userId) query = query.eq('user_id', filters.userId);
      if (filters.isRead !== undefined) query = query.eq('is_read', filters.isRead);

      const { count, error } = await query;

      if (error) throw error;
      return count;
    } catch (error) {
      console.error('NotificationService.countDocuments error:', error);
      throw error;
    }
  }

  // Transform camelCase to snake_case for database
  static toDbFormat(data) {
    const result = {};
    
    const keyMap = {
      userId: 'user_id',
      relatedId: 'related_id',
      relatedModel: 'related_model',
      isRead: 'is_read',
      createdBy: 'created_by',
      expiresAt: 'expires_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    };

    for (const [key, value] of Object.entries(data)) {
      if (key === '_id' || key === 'creator') continue;
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
      userId: data.user_id,
      type: data.type,
      title: data.title,
      message: data.message,
      relatedId: data.related_id,
      relatedModel: data.related_model,
      link: data.link,
      isRead: data.is_read,
      priority: data.priority,
      createdBy: withPopulate && data.creator ? {
        id: data.creator.id,
        _id: data.creator.id,
        name: data.creator.name,
        avatar: data.creator.avatar
      } : data.created_by,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

module.exports = NotificationService;
