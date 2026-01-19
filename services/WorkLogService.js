const { supabase } = require('../config/supabase');

class WorkLogService {
  static tableName = 'worklogs';

  // Create work log
  static async create(workLogData) {
    try {
      const dbData = this.toDbFormat(workLogData);

      const { data, error } = await supabase
        .from(this.tableName)
        .insert([dbData])
        .select()
        .single();

      if (error) throw error;
      return this.toCamelCase(data);
    } catch (error) {
      console.error('WorkLogService.create error:', error);
      throw error;
    }
  }

  // Find work log by ID
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select(`
          *,
          user:user_id (id, name, email),
          reviewer:feedback_reviewed_by (id, name, email)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.toCamelCase(data, true);
    } catch (error) {
      console.error('WorkLogService.findById error:', error);
      throw error;
    }
  }

  // Find all work logs with filters
  static async find(filters = {}) {
    try {
      let query = supabase.from(this.tableName).select(`
        *,
        user:user_id (id, name, email),
        reviewer:feedback_reviewed_by (id, name, email)
      `);

      if (filters.userId) query = query.eq('user_id', filters.userId);
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.startDate && filters.endDate) {
        query = query
          .gte('date', filters.startDate)
          .lte('date', filters.endDate);
      }
      if (filters.date) {
        if (filters.date.$gte) {
          query = query.gte('date', new Date(filters.date.$gte).toISOString().split('T')[0]);
        }
        if (filters.date.$lte) {
          query = query.lte('date', new Date(filters.date.$lte).toISOString().split('T')[0]);
        }
      }

      const { data, error } = await query.order('date', { ascending: false });

      if (error) throw error;
      return data.map(workLog => this.toCamelCase(workLog, true));
    } catch (error) {
      console.error('WorkLogService.find error:', error);
      throw error;
    }
  }

  // Update work log
  static async findByIdAndUpdate(id, updates, options = {}) {
    try {
      const dbData = this.toDbFormat(updates);

      const { data, error } = await supabase
        .from(this.tableName)
        .update(dbData)
        .eq('id', id)
        .select(`
          *,
          user:user_id (id, name, email),
          reviewer:feedback_reviewed_by (id, name, email)
        `)
        .single();

      if (error) throw error;
      return this.toCamelCase(data, true);
    } catch (error) {
      console.error('WorkLogService.findByIdAndUpdate error:', error);
      throw error;
    }
  }

  // Delete work log
  static async deleteOne(filters) {
    try {
      let query = supabase.from(this.tableName).delete();
      
      if (filters.id) query = query.eq('id', filters.id);

      const { data, error } = await query.select().single();

      if (error) throw error;
      return this.toCamelCase(data);
    } catch (error) {
      console.error('WorkLogService.deleteOne error:', error);
      throw error;
    }
  }

  // Save (update existing work log instance)
  static async save(workLog) {
    try {
      const dbData = this.toDbFormat(workLog);

      const { data, error } = await supabase
        .from(this.tableName)
        .update(dbData)
        .eq('id', workLog.id)
        .select()
        .single();

      if (error) throw error;
      return this.toCamelCase(data);
    } catch (error) {
      console.error('WorkLogService.save error:', error);
      throw error;
    }
  }

  // Count documents
  static async countDocuments(filters = {}) {
    try {
      let query = supabase.from(this.tableName).select('id', { count: 'exact', head: true });

      if (filters.userId) query = query.eq('user_id', filters.userId);
      if (filters.status) query = query.eq('status', filters.status);

      const { count, error } = await query;

      if (error) throw error;
      return count;
    } catch (error) {
      console.error('WorkLogService.countDocuments error:', error);
      throw error;
    }
  }

  // Aggregate for statistics
  static async aggregateHours(userId) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('hours_worked')
        .eq('user_id', userId);

      if (error) throw error;
      
      const totalHours = data.reduce((sum, log) => sum + (log.hours_worked || 0), 0);
      return [{ _id: null, totalHours }];
    } catch (error) {
      console.error('WorkLogService.aggregateHours error:', error);
      throw error;
    }
  }

  // Aggregate average rating
  static async aggregateAvgRating(userId) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('feedback_rating')
        .eq('user_id', userId)
        .not('feedback_rating', 'is', null);

      if (error) throw error;
      
      if (data.length === 0) return [];
      
      const avgRating = data.reduce((sum, log) => sum + log.feedback_rating, 0) / data.length;
      return [{ _id: null, avgRating }];
    } catch (error) {
      console.error('WorkLogService.aggregateAvgRating error:', error);
      throw error;
    }
  }

  // Transform camelCase to snake_case for database
  static toDbFormat(data) {
    const result = {};
    
    const keyMap = {
      userId: 'user_id',
      tasksCompleted: 'tasks_completed',
      hoursWorked: 'hours_worked',
      nextDayPlan: 'next_day_plan',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    };

    for (const [key, value] of Object.entries(data)) {
      // Skip fields that shouldn't be updated or are populated relations
      if (key === '_id' || key === 'id' || key === 'user' || key === 'reviewer') continue;
      
      // Handle nested feedback object
      if (key === 'feedback' && value) {
        // Extract just the UUID if reviewedBy is an object
        const reviewedBy = value.reviewedBy;
        if (reviewedBy && typeof reviewedBy === 'object') {
          result.feedback_reviewed_by = reviewedBy.id || reviewedBy._id;
        } else {
          result.feedback_reviewed_by = reviewedBy;
        }
        result.feedback_comment = value.comment;
        result.feedback_rating = value.rating;
        result.feedback_reviewed_at = value.reviewedAt;
        continue;
      }
      
      // Handle userId - extract just the UUID if it's an object
      if (key === 'userId' && value) {
        if (typeof value === 'object') {
          result.user_id = value.id || value._id;
        } else {
          result.user_id = value;
        }
        continue;
      }
      
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
      userId: withPopulate && data.user ? {
        id: data.user.id,
        _id: data.user.id,
        name: data.user.name,
        email: data.user.email
      } : data.user_id,
      date: data.date,
      title: data.title,
      description: data.description,
      tasksCompleted: data.tasks_completed || [],
      hoursWorked: data.hours_worked,
      challenges: data.challenges,
      learnings: data.learnings,
      nextDayPlan: data.next_day_plan,
      attachments: data.attachments || [],
      status: data.status,
      feedback: {
        reviewedBy: withPopulate && data.reviewer ? {
          id: data.reviewer.id,
          _id: data.reviewer.id,
          name: data.reviewer.name,
          email: data.reviewer.email
        } : data.feedback_reviewed_by,
        comment: data.feedback_comment,
        rating: data.feedback_rating,
        reviewedAt: data.feedback_reviewed_at
      },
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

module.exports = WorkLogService;
