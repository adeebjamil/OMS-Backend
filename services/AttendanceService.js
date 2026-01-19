const { supabase } = require('../config/supabase');

class AttendanceService {
  static tableName = 'attendances';

  // Create attendance record
  static async create(attendanceData) {
    try {
      const dbData = this.toDbFormat(attendanceData);

      const { data, error } = await supabase
        .from(this.tableName)
        .insert([dbData])
        .select()
        .single();

      if (error) throw error;
      return this.toCamelCase(data);
    } catch (error) {
      console.error('AttendanceService.create error:', error);
      throw error;
    }
  }

  // Find attendance by ID
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select(`
          *,
          user:user_id (id, name, email),
          approvedByUser:approved_by (id, name, email)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.toCamelCase(data, true);
    } catch (error) {
      console.error('AttendanceService.findById error:', error);
      throw error;
    }
  }

  // Find one matching record
  static async findOne(filters = {}) {
    try {
      let query = supabase.from(this.tableName).select('*');

      if (filters.userId) query = query.eq('user_id', filters.userId);
      if (filters.date) {
        if (filters.date.$gte) {
          query = query.gte('date', filters.date.$gte.toISOString().split('T')[0]);
        }
        if (filters.date.$lte) {
          query = query.lte('date', filters.date.$lte.toISOString().split('T')[0]);
        }
      }
      if (filters.checkOut === null) {
        query = query.is('check_out', null);
      }

      const { data, error } = await query.limit(1).single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.toCamelCase(data);
    } catch (error) {
      console.error('AttendanceService.findOne error:', error);
      throw error;
    }
  }

  // Find all attendance records with filters
  static async find(filters = {}) {
    try {
      let query = supabase.from(this.tableName).select(`
        *,
        user:user_id (id, name, email),
        approvedByUser:approved_by (id, name, email)
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
      }
      if (filters.leaveApproved === null) {
        query = query.is('leave_approved', null);
      }

      const { data, error } = await query.order('date', { ascending: false });

      if (error) throw error;
      return data.map(record => this.toCamelCase(record, true));
    } catch (error) {
      console.error('AttendanceService.find error:', error);
      throw error;
    }
  }

  // Update attendance
  static async save(attendance) {
    try {
      const dbData = this.toDbFormat(attendance);
      
      // Calculate total hours if both check-in and check-out exist
      if (attendance.checkIn && attendance.checkOut) {
        const hours = (new Date(attendance.checkOut) - new Date(attendance.checkIn)) / (1000 * 60 * 60);
        dbData.total_hours = Math.round(hours * 100) / 100;
      }

      const { data, error } = await supabase
        .from(this.tableName)
        .update(dbData)
        .eq('id', attendance.id)
        .select()
        .single();

      if (error) throw error;
      return this.toCamelCase(data);
    } catch (error) {
      console.error('AttendanceService.save error:', error);
      throw error;
    }
  }

  // Count documents
  static async countDocuments(filters = {}) {
    try {
      let query = supabase.from(this.tableName).select('id', { count: 'exact', head: true });

      if (filters.userId) query = query.eq('user_id', filters.userId);
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.date) {
        if (filters.date.$gte) {
          query = query.gte('date', new Date(filters.date.$gte).toISOString().split('T')[0]);
        }
      }
      if (filters.leaveApproved === null) {
        query = query.is('leave_approved', null);
      }
      if (filters.totalHours) {
        if (filters.totalHours.$gt !== undefined) {
          query = query.gt('total_hours', filters.totalHours.$gt);
        }
      }

      const { count, error } = await query;

      if (error) throw error;
      return count;
    } catch (error) {
      console.error('AttendanceService.countDocuments error:', error);
      throw error;
    }
  }

  // Get sum of total hours
  static async sumTotalHours(userId) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('total_hours')
        .eq('user_id', userId)
        .gt('total_hours', 0);

      if (error) throw error;
      
      return data.reduce((sum, record) => sum + (record.total_hours || 0), 0);
    } catch (error) {
      console.error('AttendanceService.sumTotalHours error:', error);
      throw error;
    }
  }

  // Aggregate for statistics
  static async aggregateByStatus(filters = {}) {
    try {
      let query = supabase
        .from(this.tableName)
        .select('status');

      if (filters.date) {
        if (filters.date.$gte) {
          query = query.gte('date', new Date(filters.date.$gte).toISOString().split('T')[0]);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      // Group by status
      const stats = {};
      data.forEach(record => {
        if (!stats[record.status]) {
          stats[record.status] = { _id: record.status, count: 0 };
        }
        stats[record.status].count++;
      });

      return Object.values(stats);
    } catch (error) {
      console.error('AttendanceService.aggregateByStatus error:', error);
      throw error;
    }
  }

  // Transform camelCase to snake_case for database
  static toDbFormat(data) {
    const result = {};
    
    const keyMap = {
      userId: 'user_id',
      checkIn: 'check_in',
      checkOut: 'check_out',
      leaveType: 'leave_type',
      leaveReason: 'leave_reason',
      leaveApproved: 'leave_approved',
      approvedBy: 'approved_by',
      totalHours: 'total_hours',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    };

    for (const [key, value] of Object.entries(data)) {
      if (key === '_id' || key === 'id' || key === 'user' || key === 'approvedByUser') continue;
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
      checkIn: data.check_in,
      checkOut: data.check_out,
      status: data.status,
      leaveType: data.leave_type,
      leaveReason: data.leave_reason,
      leaveApproved: data.leave_approved,
      approvedBy: withPopulate && data.approvedByUser ? {
        id: data.approvedByUser.id,
        _id: data.approvedByUser.id,
        name: data.approvedByUser.name,
        email: data.approvedByUser.email
      } : data.approved_by,
      totalHours: data.total_hours,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

module.exports = AttendanceService;
