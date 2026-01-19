const { supabase } = require('../config/supabase');

class MessageService {
  static tableName = 'messages';

  // Create message
  static async create(messageData) {
    try {
      const dbData = this.toDbFormat(messageData);

      const { data, error } = await supabase
        .from(this.tableName)
        .insert([dbData])
        .select()
        .single();

      if (error) throw error;
      return this.toCamelCase(data);
    } catch (error) {
      console.error('MessageService.create error:', error);
      throw error;
    }
  }

  // Find message by ID
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select(`
          *,
          senderUser:sender_id (id, name, email, avatar),
          recipientUser:recipient_id (id, name, email, avatar)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.toCamelCase(data, true);
    } catch (error) {
      console.error('MessageService.findById error:', error);
      throw error;
    }
  }

  // Find all messages with filters
  static async find(filters = {}) {
    try {
      let query = supabase.from(this.tableName).select(`
        *,
        senderUser:sender_id (id, name, email, avatar, intern_id),
        recipientUser:recipient_id (id, name, email, avatar, intern_id)
      `);

      // Handle $or for sender/recipient (used for both employee view and admin filter)
      if (filters.$or) {
        const senderFilter = filters.$or.find(f => f.sender);
        const recipientFilter = filters.$or.find(f => f.recipient);
        
        if (senderFilter && recipientFilter) {
          const userId = senderFilter.sender;
          query = query.or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);
        }
      }
      // If no $or filter and admin, return all messages (no filter applied)

      if (filters.conversationId) {
        query = query.eq('conversation_id', filters.conversationId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(message => this.toCamelCase(message, true));
    } catch (error) {
      console.error('MessageService.find error:', error);
      throw error;
    }
  }

  // Save (update existing message)
  static async save(message) {
    try {
      const dbData = this.toDbFormat(message);

      const { data, error } = await supabase
        .from(this.tableName)
        .update(dbData)
        .eq('id', message.id)
        .select()
        .single();

      if (error) throw error;
      return this.toCamelCase(data);
    } catch (error) {
      console.error('MessageService.save error:', error);
      throw error;
    }
  }

  // Get conversations (aggregated)
  static async getConversations(userId) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select(`
          *,
          senderUser:sender_id (id, name, email, avatar),
          recipientUser:recipient_id (id, name, email, avatar)
        `)
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by conversation_id
      const conversationMap = new Map();
      
      data.forEach(message => {
        const convId = message.conversation_id;
        if (!conversationMap.has(convId)) {
          conversationMap.set(convId, {
            _id: convId,
            lastMessage: this.toCamelCase(message, true),
            unreadCount: 0
          });
        }
        
        // Count unread messages for this user
        if (message.recipient_id === userId && !message.is_read) {
          const conv = conversationMap.get(convId);
          conv.unreadCount++;
        }
      });

      return Array.from(conversationMap.values());
    } catch (error) {
      console.error('MessageService.getConversations error:', error);
      throw error;
    }
  }

  // Transform camelCase to snake_case for database
  static toDbFormat(data) {
    const result = {};
    
    const keyMap = {
      sender: 'sender_id',
      recipient: 'recipient_id',
      isRead: 'is_read',
      readAt: 'read_at',
      conversationId: 'conversation_id',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    };

    for (const [key, value] of Object.entries(data)) {
      if (key === '_id' || key === 'senderUser' || key === 'recipientUser') continue;
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
      sender: withPopulate && data.senderUser ? {
        id: data.senderUser.id,
        _id: data.senderUser.id,
        name: data.senderUser.name,
        email: data.senderUser.email,
        avatar: data.senderUser.avatar,
        internId: data.senderUser.intern_id ? data.senderUser.intern_id.replace('INT', 'EMP') : null,
        employeeId: data.senderUser.intern_id ? data.senderUser.intern_id.replace('INT', 'EMP') : null
      } : data.sender_id,
      recipient: withPopulate && data.recipientUser ? {
        id: data.recipientUser.id,
        _id: data.recipientUser.id,
        name: data.recipientUser.name,
        email: data.recipientUser.email,
        avatar: data.recipientUser.avatar,
        internId: data.recipientUser.intern_id ? data.recipientUser.intern_id.replace('INT', 'EMP') : null,
        employeeId: data.recipientUser.intern_id ? data.recipientUser.intern_id.replace('INT', 'EMP') : null
      } : data.recipient_id,
      subject: data.subject,
      message: data.message,
      isRead: data.is_read,
      readAt: data.read_at,
      attachments: data.attachments || [],
      priority: data.priority,
      conversationId: data.conversation_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

module.exports = MessageService;
