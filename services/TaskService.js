const { supabase } = require('../config/supabase');

class TaskService {
  static tableName = 'tasks';

  // Create task
  static async create(taskData) {
    try {
      const dbData = this.toDbFormat(taskData);

      const { data, error } = await supabase
        .from(this.tableName)
        .insert([dbData])
        .select()
        .single();

      if (error) throw error;
      return this.toCamelCase(data);
    } catch (error) {
      console.error('TaskService.create error:', error);
      throw error;
    }
  }

  // Find task by ID with populated fields
  static async findById(id, populate = true) {
    try {
      let query = supabase.from(this.tableName).select(`
        *,
        assignedToUser:assigned_to (id, name, email),
        assignedByUser:assigned_by (id, name, email)
      `);

      const { data, error } = await query.eq('id', id).single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.toCamelCase(data, true);
    } catch (error) {
      console.error('TaskService.findById error:', error);
      throw error;
    }
  }

  // Find all tasks with filters
  static async find(filters = {}) {
    try {
      let query = supabase.from(this.tableName).select(`
        *,
        assignedToUser:assigned_to (id, name, email),
        assignedByUser:assigned_by (id, name, email)
      `);

      if (filters.assignedTo) query = query.eq('assigned_to', filters.assignedTo);
      if (filters.assignedBy) query = query.eq('assigned_by', filters.assignedBy);
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.priority) query = query.eq('priority', filters.priority);

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(task => this.toCamelCase(task, true));
    } catch (error) {
      console.error('TaskService.find error:', error);
      throw error;
    }
  }

  // Update task
  static async findByIdAndUpdate(id, updates, options = {}) {
    try {
      const dbData = this.toDbFormat(updates);
      
      // Handle status changes
      if (updates.status === 'completed' && !updates.completedDate) {
        dbData.completed_date = new Date().toISOString();
      }
      if (updates.status === 'in-progress' && !updates.startDate) {
        dbData.start_date = new Date().toISOString();
      }

      let query = supabase
        .from(this.tableName)
        .update(dbData)
        .eq('id', id);

      if (options.new !== false) {
        query = query.select(`
          *,
          assignedToUser:assigned_to (id, name, email),
          assignedByUser:assigned_by (id, name, email)
        `);
      }

      const { data, error } = await query.single();

      if (error) throw error;
      return this.toCamelCase(data, true);
    } catch (error) {
      console.error('TaskService.findByIdAndUpdate error:', error);
      throw error;
    }
  }

  // Delete task
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
      console.error('TaskService.findByIdAndDelete error:', error);
      throw error;
    }
  }

  // Count documents
  static async countDocuments(filters = {}) {
    try {
      let query = supabase.from(this.tableName).select('id', { count: 'exact', head: true });

      if (filters.assignedTo) query = query.eq('assigned_to', filters.assignedTo);
      if (filters.status) query = query.eq('status', filters.status);

      const { count, error } = await query;

      if (error) throw error;
      return count;
    } catch (error) {
      console.error('TaskService.countDocuments error:', error);
      throw error;
    }
  }

  // Add comment to task
  static async addComment(taskId, userId, comment) {
    try {
      // First get current comments
      const { data: task, error: fetchError } = await supabase
        .from(this.tableName)
        .select('comments')
        .eq('id', taskId)
        .single();

      if (fetchError) throw fetchError;

      const comments = task.comments || [];
      comments.push({
        userId,
        comment,
        createdAt: new Date().toISOString()
      });

      const { data, error } = await supabase
        .from(this.tableName)
        .update({ comments })
        .eq('id', taskId)
        .select(`
          *,
          assignedToUser:assigned_to (id, name, email),
          assignedByUser:assigned_by (id, name, email)
        `)
        .single();

      if (error) throw error;
      return this.toCamelCase(data, true);
    } catch (error) {
      console.error('TaskService.addComment error:', error);
      throw error;
    }
  }

  // Aggregate for statistics
  static async aggregate(pipeline) {
    // For complex aggregations, we'll use RPC or handle in controller
    // This is a simplified version
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('TaskService.aggregate error:', error);
      throw error;
    }
  }

  // Get task statistics by user
  static async getStatsByUser() {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select(`
          assigned_to,
          status,
          assignedToUser:assigned_to (id, name, email)
        `);

      if (error) throw error;

      // Group by assigned_to
      const stats = {};
      data.forEach(task => {
        const userId = task.assigned_to;
        if (!stats[userId]) {
          stats[userId] = {
            _id: userId,
            intern: task.assignedToUser,
            total: 0,
            completed: 0
          };
        }
        stats[userId].total++;
        if (task.status === 'completed') {
          stats[userId].completed++;
        }
      });

      return Object.values(stats)
        .sort((a, b) => b.completed - a.completed)
        .slice(0, 5);
    } catch (error) {
      console.error('TaskService.getStatsByUser error:', error);
      throw error;
    }
  }

  // Transform camelCase to snake_case for database
  static toDbFormat(data) {
    const result = {};
    
    const keyMap = {
      assignedTo: 'assigned_to',
      assignedBy: 'assigned_by',
      dueDate: 'due_date',
      startDate: 'start_date',
      completedDate: 'completed_date',
      estimatedHours: 'estimated_hours',
      actualHours: 'actual_hours',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    };

    for (const [key, value] of Object.entries(data)) {
      if (key === '_id') continue;
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
    
    const task = {
      id: data.id,
      _id: data.id,
      title: data.title,
      description: data.description,
      assignedTo: withPopulate && data.assignedToUser ? {
        id: data.assignedToUser.id,
        _id: data.assignedToUser.id,
        name: data.assignedToUser.name,
        email: data.assignedToUser.email
      } : data.assigned_to,
      assignedBy: withPopulate && data.assignedByUser ? {
        id: data.assignedByUser.id,
        _id: data.assignedByUser.id,
        name: data.assignedByUser.name,
        email: data.assignedByUser.email
      } : data.assigned_by,
      priority: data.priority,
      status: data.status,
      dueDate: data.due_date,
      startDate: data.start_date,
      completedDate: data.completed_date,
      attachments: data.attachments || [],
      comments: data.comments || [],
      tags: data.tags || [],
      estimatedHours: data.estimated_hours,
      actualHours: data.actual_hours,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };

    return task;
  }
}

module.exports = TaskService;
