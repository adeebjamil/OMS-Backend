const { supabase } = require('../config/supabase');

class EvaluationService {
  static tableName = 'evaluations';

  // Create evaluation
  static async create(evaluationData) {
    try {
      const dbData = this.toDbFormat(evaluationData);

      const { data, error } = await supabase
        .from(this.tableName)
        .insert([dbData])
        .select()
        .single();

      if (error) throw error;
      return this.toCamelCase(data);
    } catch (error) {
      console.error('EvaluationService.create error:', error);
      throw error;
    }
  }

  // Find evaluation by ID
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select(`
          *,
          intern:intern_id (id, name, email),
          evaluator:evaluated_by (id, name, email)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.toCamelCase(data, true);
    } catch (error) {
      console.error('EvaluationService.findById error:', error);
      throw error;
    }
  }

  // Find all evaluations with filters
  static async find(filters = {}) {
    try {
      let query = supabase.from(this.tableName).select(`
        *,
        intern:intern_id (id, name, email),
        evaluator:evaluated_by (id, name, email)
      `);

      if (filters.internId) query = query.eq('intern_id', filters.internId);
      if (filters.evaluationType) query = query.eq('evaluation_type', filters.evaluationType);
      if (filters.isPublished !== undefined) query = query.eq('is_published', filters.isPublished);

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(evaluation => this.toCamelCase(evaluation, true));
    } catch (error) {
      console.error('EvaluationService.find error:', error);
      throw error;
    }
  }

  // Update evaluation
  static async findByIdAndUpdate(id, updates, options = {}) {
    try {
      const dbData = this.toDbFormat(updates);

      const { data, error } = await supabase
        .from(this.tableName)
        .update(dbData)
        .eq('id', id)
        .select(`
          *,
          intern:intern_id (id, name, email),
          evaluator:evaluated_by (id, name, email)
        `)
        .single();

      if (error) throw error;
      return this.toCamelCase(data, true);
    } catch (error) {
      console.error('EvaluationService.findByIdAndUpdate error:', error);
      throw error;
    }
  }

  // Delete evaluation
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
      console.error('EvaluationService.findByIdAndDelete error:', error);
      throw error;
    }
  }

  // Save (for updating existing evaluation instance)
  static async save(evaluation) {
    try {
      const dbData = this.toDbFormat(evaluation);

      const { data, error } = await supabase
        .from(this.tableName)
        .update(dbData)
        .eq('id', evaluation.id)
        .select()
        .single();

      if (error) throw error;
      return this.toCamelCase(data);
    } catch (error) {
      console.error('EvaluationService.save error:', error);
      throw error;
    }
  }

  // Populate intern info
  static async populate(evaluation, field) {
    try {
      if (field === 'internId') {
        const { data, error } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('id', evaluation.internId)
          .single();

        if (!error && data) {
          evaluation.internId = {
            id: data.id,
            _id: data.id,
            name: data.name,
            email: data.email
          };
        }
      }
      return evaluation;
    } catch (error) {
      console.error('EvaluationService.populate error:', error);
      return evaluation;
    }
  }

  // Transform camelCase to snake_case for database
  static toDbFormat(data) {
    const result = {};
    
    const keyMap = {
      internId: 'intern_id',
      evaluatedBy: 'evaluated_by',
      evaluationType: 'evaluation_type',
      periodStartDate: 'period_start_date',
      periodEndDate: 'period_end_date',
      overallRating: 'overall_rating',
      areasOfImprovement: 'areas_of_improvement',
      certificateGenerated: 'certificate_generated',
      certificateUrl: 'certificate_url',
      isPublished: 'is_published',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    };

    for (const [key, value] of Object.entries(data)) {
      if (key === '_id' || key === 'intern' || key === 'evaluator') continue;
      
      // Handle nested period object
      if (key === 'period' && value) {
        result.period_start_date = value.startDate;
        result.period_end_date = value.endDate;
        continue;
      }
      
      // Handle nested ratings object
      if (key === 'ratings' && value) {
        result.rating_technical_skills = value.technicalSkills;
        result.rating_communication = value.communication;
        result.rating_teamwork = value.teamwork;
        result.rating_punctuality = value.punctuality;
        result.rating_problem_solving = value.problemSolving;
        result.rating_initiative = value.initiative;
        result.rating_learning_ability = value.learningAbility;
        continue;
      }
      
      // Handle nested stats object
      if (key === 'stats' && value) {
        result.stats_tasks_completed = value.tasksCompleted;
        result.stats_tasks_assigned = value.tasksAssigned;
        result.stats_attendance_percentage = value.attendancePercentage;
        result.stats_average_hours_per_day = value.averageHoursPerDay;
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
      internId: withPopulate && data.intern ? {
        id: data.intern.id,
        _id: data.intern.id,
        name: data.intern.name,
        email: data.intern.email
      } : data.intern_id,
      evaluatedBy: withPopulate && data.evaluator ? {
        id: data.evaluator.id,
        _id: data.evaluator.id,
        name: data.evaluator.name,
        email: data.evaluator.email
      } : data.evaluated_by,
      evaluationType: data.evaluation_type,
      period: {
        startDate: data.period_start_date,
        endDate: data.period_end_date
      },
      ratings: {
        technicalSkills: data.rating_technical_skills,
        communication: data.rating_communication,
        teamwork: data.rating_teamwork,
        punctuality: data.rating_punctuality,
        problemSolving: data.rating_problem_solving,
        initiative: data.rating_initiative,
        learningAbility: data.rating_learning_ability
      },
      overallRating: data.overall_rating,
      strengths: data.strengths,
      areasOfImprovement: data.areas_of_improvement,
      achievements: data.achievements,
      recommendations: data.recommendations,
      stats: {
        tasksCompleted: data.stats_tasks_completed,
        tasksAssigned: data.stats_tasks_assigned,
        attendancePercentage: data.stats_attendance_percentage,
        averageHoursPerDay: data.stats_average_hours_per_day
      },
      certificateGenerated: data.certificate_generated,
      certificateUrl: data.certificate_url,
      isPublished: data.is_published,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

module.exports = EvaluationService;
