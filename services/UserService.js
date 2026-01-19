const { supabase } = require('../config/supabase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class UserService {
  static tableName = 'users';

  // Clean phone number format
  static cleanPhone(phone) {
    if (!phone) return null;
    return phone.replace(/[\+\s\-\(\)]/g, '');
  }

  // Hash password
  static async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  // Compare password
  static async comparePassword(enteredPassword, hashedPassword) {
    return bcrypt.compare(enteredPassword, hashedPassword);
  }

  // Generate JWT token
  static generateToken(user) {
    return jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
  }

  // Create user
  static async create(userData) {
    try {
      // Hash password
      if (userData.password) {
        userData.password = await this.hashPassword(userData.password);
      }

      // Clean phone
      if (userData.phone) {
        userData.phone = this.cleanPhone(userData.phone);
      }

      // Transform to snake_case for database
      const dbData = this.toDbFormat(userData);

      const { data, error } = await supabase
        .from(this.tableName)
        .insert([dbData])
        .select()
        .single();

      if (error) throw error;
      return this.toCamelCase(data);
    } catch (error) {
      console.error('UserService.create error:', error);
      throw error;
    }
  }

  // Find user by ID
  static async findById(id, includePassword = false) {
    try {
      let query = supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      const { data, error } = await query;
      
      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      
      const user = this.toCamelCase(data);
      if (!includePassword) delete user.password;
      return user;
    } catch (error) {
      console.error('UserService.findById error:', error);
      throw error;
    }
  }

  // Find user by email
  static async findByEmail(email, includePassword = false) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      const user = this.toCamelCase(data);
      if (!includePassword) delete user.password;
      return user;
    } catch (error) {
      console.error('UserService.findByEmail error:', error);
      throw error;
    }
  }

  // Find all users with optional filters
  static async find(filters = {}) {
    try {
      let query = supabase.from(this.tableName).select('*');

      if (filters.role) query = query.eq('role', filters.role);
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(user => {
        const u = this.toCamelCase(user);
        delete u.password;
        return u;
      });
    } catch (error) {
      console.error('UserService.find error:', error);
      throw error;
    }
  }

  // Update user
  static async findByIdAndUpdate(id, updates, options = {}) {
    try {
      // Hash password if being updated
      if (updates.password) {
        updates.password = await this.hashPassword(updates.password);
      }

      // Clean phone if being updated
      if (updates.phone) {
        updates.phone = this.cleanPhone(updates.phone);
      }

      const dbData = this.toDbFormat(updates);

      const { data, error } = await supabase
        .from(this.tableName)
        .update(dbData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      const user = this.toCamelCase(data);
      delete user.password;
      return user;
    } catch (error) {
      console.error('UserService.findByIdAndUpdate error:', error);
      throw error;
    }
  }

  // Delete user
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
      console.error('UserService.findByIdAndDelete error:', error);
      throw error;
    }
  }

  // Count documents
  static async countDocuments(filters = {}) {
    try {
      let query = supabase.from(this.tableName).select('id', { count: 'exact', head: true });

      if (filters.role) query = query.eq('role', filters.role);
      if (filters.status) query = query.eq('status', filters.status);

      const { count, error } = await query;

      if (error) throw error;
      return count;
    } catch (error) {
      console.error('UserService.countDocuments error:', error);
      throw error;
    }
  }

  // Find interns with supervisor info
  static async findInterns() {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select(`
          *,
          supervisor:supervisor_id (id, name, email)
        `)
        .eq('role', 'intern')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(user => {
        const u = this.toCamelCase(user);
        delete u.password;
        return u;
      });
    } catch (error) {
      console.error('UserService.findInterns error:', error);
      throw error;
    }
  }

  // Transform camelCase to snake_case for database
  static toDbFormat(data) {
    const keyMap = {
      internId: 'intern_id',
      internshipRole: 'internship_role',
      position: 'internship_role', // Map position to internship_role
      startDate: 'start_date',
      endDate: 'end_date',
      supervisorId: 'supervisor_id',
      supervisor: 'supervisor_id', // Map supervisor name/id
      emergencyContact: null, // Special handling
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    };

    const result = {};
    
    for (const [key, value] of Object.entries(data)) {
      // Skip undefined, null, or empty string values for optional fields
      if (value === undefined || value === null || value === '') {
        // Only skip if it's an optional field
        if (['endDate', 'end_date', 'supervisor', 'supervisorId', 'supervisor_id', 'position', 'internshipRole'].includes(key)) {
          continue;
        }
      }
      
      if (key === 'emergencyContact' && value) {
        result.emergency_contact_name = value.name;
        result.emergency_contact_phone = value.phone;
        result.emergency_contact_relation = value.relation;
      } else if (key === '_id' || key === 'id') {
        // Skip _id, use id if provided
        if (key === 'id' && value) result.id = value;
      } else if (key === 'supervisor' && value) {
        // Handle supervisor - could be name or ID
        // If it's a UUID, use it directly, otherwise skip (we'd need to lookup by name)
        if (typeof value === 'string' && value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          result.supervisor_id = value;
        }
        // Skip non-UUID supervisor values (names)
      } else if (keyMap[key] !== undefined) {
        if (keyMap[key] !== null && value !== undefined && value !== null && value !== '') {
          result[keyMap[key]] = value;
        }
      } else if (value !== undefined && value !== null) {
        result[key] = value;
      }
    }

    return result;
  }

  // Transform snake_case to camelCase from database
  static toCamelCase(data) {
    if (!data) return null;
    
    // Convert INT to EMP in employee ID for display
    const employeeId = data.intern_id ? data.intern_id.replace('INT', 'EMP') : null;
    
    return {
      id: data.id,
      _id: data.id, // For compatibility
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role,
      phone: data.phone,
      avatar: data.avatar,
      internId: employeeId,
      employeeId: employeeId, // Alias
      college: data.college,
      department: data.department,
      internshipRole: data.internship_role,
      position: data.internship_role, // Alias for frontend compatibility
      startDate: data.start_date,
      endDate: data.end_date,
      status: data.status,
      supervisorId: data.supervisor_id,
      supervisor: data.supervisor ? {
        id: data.supervisor.id,
        _id: data.supervisor.id,
        name: data.supervisor.name,
        email: data.supervisor.email
      } : null,
      address: data.address,
      emergencyContact: {
        name: data.emergency_contact_name,
        phone: data.emergency_contact_phone,
        relation: data.emergency_contact_relation
      },
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

module.exports = UserService;
