const { supabase } = require('../config/supabase');

class TeamService {
  static tableName = 'teams';

  // Create team
  static async create(teamData) {
    try {
      const dbData = this.toDbFormat(teamData);

      const { data, error } = await supabase
        .from(this.tableName)
        .insert([dbData])
        .select()
        .single();

      if (error) throw error;
      return this.toCamelCase(data);
    } catch (error) {
      console.error('TeamService.create error:', error);
      throw error;
    }
  }

  // Find team by ID with populated leader and members
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select(`
          *,
          leaderUser:team_leader (id, name, email, avatar, department, internship_role)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      const team = this.toCamelCase(data);

      // Fetch member details
      if (team.members && team.members.length > 0) {
        const { data: memberData, error: memberError } = await supabase
          .from('users')
          .select('id, name, email, avatar, department, internship_role, status, intern_id')
          .in('id', team.members);

        if (!memberError && memberData) {
          team.memberDetails = memberData.map(m => ({
            id: m.id,
            _id: m.id,
            name: m.name,
            email: m.email,
            avatar: m.avatar,
            department: m.department,
            internshipRole: m.internship_role,
            status: m.status,
            internId: m.intern_id
          }));
        }
      }

      return team;
    } catch (error) {
      console.error('TeamService.findById error:', error);
      throw error;
    }
  }

  // Find all teams
  static async find(filters = {}) {
    try {
      let query = supabase
        .from(this.tableName)
        .select(`
          *,
          leaderUser:team_leader (id, name, email, avatar, department, internship_role)
        `);

      if (filters.status) query = query.eq('status', filters.status);
      if (filters.createdBy) query = query.eq('created_by', filters.createdBy);

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // For each team, fetch member details
      const teams = await Promise.all(
        data.map(async (team) => {
          const t = this.toCamelCase(team);

          if (t.members && t.members.length > 0) {
            const { data: memberData } = await supabase
              .from('users')
              .select('id, name, email, avatar, department, internship_role, status, intern_id')
              .in('id', t.members);

            if (memberData) {
              t.memberDetails = memberData.map(m => ({
                id: m.id,
                _id: m.id,
                name: m.name,
                email: m.email,
                avatar: m.avatar,
                department: m.department,
                internshipRole: m.internship_role,
                status: m.status,
                internId: m.intern_id
              }));
            }
          }

          return t;
        })
      );

      return teams;
    } catch (error) {
      console.error('TeamService.find error:', error);
      throw error;
    }
  }

  // Update team
  static async findByIdAndUpdate(id, updates) {
    try {
      const dbData = this.toDbFormat(updates);
      dbData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from(this.tableName)
        .update(dbData)
        .eq('id', id)
        .select(`
          *,
          leaderUser:team_leader (id, name, email, avatar, department, internship_role)
        `)
        .single();

      if (error) throw error;

      const team = this.toCamelCase(data);

      // Fetch member details
      if (team.members && team.members.length > 0) {
        const { data: memberData } = await supabase
          .from('users')
          .select('id, name, email, avatar, department, internship_role, status, intern_id')
          .in('id', team.members);

        if (memberData) {
          team.memberDetails = memberData.map(m => ({
            id: m.id,
            _id: m.id,
            name: m.name,
            email: m.email,
            avatar: m.avatar,
            department: m.department,
            internshipRole: m.internship_role,
            status: m.status,
            internId: m.intern_id
          }));
        }
      }

      return team;
    } catch (error) {
      console.error('TeamService.findByIdAndUpdate error:', error);
      throw error;
    }
  }

  // Delete team
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
      console.error('TeamService.findByIdAndDelete error:', error);
      throw error;
    }
  }

  // Find teams where user is a member or leader
  static async findByUserId(userId) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select(`
          *,
          leaderUser:team_leader (id, name, email, avatar, department, internship_role)
        `)
        .or(`team_leader.eq.${userId},members.cs.{${userId}}`)
        .eq('status', 'active');

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const teams = data.map(team => {
        const t = this.toCamelCase(team);
        t.isLeader = team.team_leader === userId;
        return t;
      });

      return teams;
    } catch (error) {
      console.error('TeamService.findByUserId error:', error);
      throw error;
    }
  }

  // Transform camelCase to snake_case for database
  static toDbFormat(data) {
    const result = {};

    const keyMap = {
      teamName: 'team_name',
      teamLeader: 'team_leader',
      createdBy: 'created_by',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    };

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      if (key === '_id' || key === 'id') {
        if (key === 'id' && value) result.id = value;
      } else if (keyMap[key] !== undefined) {
        result[keyMap[key]] = value;
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  // Transform snake_case to camelCase from database
  static toCamelCase(data) {
    if (!data) return null;

    return {
      id: data.id,
      _id: data.id,
      teamName: data.team_name,
      description: data.description,
      teamLeader: data.team_leader,
      leaderDetails: data.leaderUser
        ? {
            id: data.leaderUser.id,
            _id: data.leaderUser.id,
            name: data.leaderUser.name,
            email: data.leaderUser.email,
            avatar: data.leaderUser.avatar,
            department: data.leaderUser.department,
            internshipRole: data.leaderUser.internship_role,
          }
        : null,
      members: data.members || [],
      memberDetails: [],
      status: data.status,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

module.exports = TeamService;
