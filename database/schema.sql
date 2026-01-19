-- Supabase PostgreSQL Schema for OMS (Office Management System)
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'intern' CHECK (role IN ('admin', 'intern')),
    phone VARCHAR(50),
    avatar TEXT,
    intern_id VARCHAR(50) UNIQUE,
    college VARCHAR(255),
    department VARCHAR(255),
    internship_role VARCHAR(255),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
    supervisor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    address TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(50),
    emergency_contact_relation VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_intern_id ON users(intern_id);

-- =====================================================
-- TASKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'cancelled')),
    due_date TIMESTAMPTZ NOT NULL,
    start_date TIMESTAMPTZ,
    completed_date TIMESTAMPTZ,
    tags TEXT[],
    estimated_hours DECIMAL DEFAULT 0,
    actual_hours DECIMAL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task attachments (stored as JSONB array)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Task comments (stored as JSONB array)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by ON tasks(assigned_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- =====================================================
-- ATTENDANCE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS attendances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in TIMESTAMPTZ NOT NULL,
    check_out TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'present' CHECK (status IN ('present', 'absent', 'half-day', 'leave')),
    leave_type VARCHAR(50) CHECK (leave_type IN ('sick', 'casual', 'emergency', NULL)),
    leave_reason TEXT,
    leave_approved BOOLEAN,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    total_hours DECIMAL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendances(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendances(status);

-- =====================================================
-- DOCUMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'other' CHECK (category IN ('training', 'policy', 'project', 'form', 'certificate', 'other')),
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT, -- Storage path for deletion
    file_size BIGINT,
    file_type VARCHAR(100),
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_with JSONB DEFAULT '[]'::jsonb,
    is_public BOOLEAN DEFAULT FALSE,
    tags TEXT[],
    downloads INTEGER DEFAULT 0,
    expiry_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_is_public ON documents(is_public);

-- =====================================================
-- EVALUATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intern_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    evaluated_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    evaluation_type VARCHAR(50) NOT NULL CHECK (evaluation_type IN ('weekly', 'monthly', 'final')),
    period_start_date TIMESTAMPTZ NOT NULL,
    period_end_date TIMESTAMPTZ NOT NULL,
    
    -- Performance Ratings (1-5)
    rating_technical_skills INTEGER CHECK (rating_technical_skills BETWEEN 1 AND 5),
    rating_communication INTEGER CHECK (rating_communication BETWEEN 1 AND 5),
    rating_teamwork INTEGER CHECK (rating_teamwork BETWEEN 1 AND 5),
    rating_punctuality INTEGER CHECK (rating_punctuality BETWEEN 1 AND 5),
    rating_problem_solving INTEGER CHECK (rating_problem_solving BETWEEN 1 AND 5),
    rating_initiative INTEGER CHECK (rating_initiative BETWEEN 1 AND 5),
    rating_learning_ability INTEGER CHECK (rating_learning_ability BETWEEN 1 AND 5),
    
    overall_rating DECIMAL,
    strengths TEXT NOT NULL,
    areas_of_improvement TEXT NOT NULL,
    achievements TEXT,
    recommendations TEXT,
    
    -- Statistics
    stats_tasks_completed INTEGER DEFAULT 0,
    stats_tasks_assigned INTEGER DEFAULT 0,
    stats_attendance_percentage DECIMAL DEFAULT 0,
    stats_average_hours_per_day DECIMAL DEFAULT 0,
    
    certificate_generated BOOLEAN DEFAULT FALSE,
    certificate_url TEXT,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evaluations_intern ON evaluations(intern_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_type ON evaluations(evaluation_type);

-- =====================================================
-- MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    attachments JSONB DEFAULT '[]'::jsonb,
    priority VARCHAR(50) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    conversation_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'task_assigned', 'task_completed', 'evaluation_created',
        'message_received', 'document_shared', 'attendance_reminder',
        'leave_approved', 'leave_rejected', 'worklog_reviewed',
        'announcement', 'system'
    )),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_id UUID,
    related_model VARCHAR(50) CHECK (related_model IN ('Task', 'Evaluation', 'Message', 'Document', 'Attendance', 'WorkLog', 'Announcement')),
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    priority VARCHAR(50) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- =====================================================
-- WORK LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS worklogs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    tasks_completed UUID[],
    hours_worked DECIMAL DEFAULT 0,
    challenges TEXT DEFAULT '',
    learnings TEXT DEFAULT '',
    next_day_plan TEXT DEFAULT '',
    attachments JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed', 'approved')),
    
    -- Feedback
    feedback_reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    feedback_comment TEXT,
    feedback_rating INTEGER CHECK (feedback_rating BETWEEN 1 AND 5),
    feedback_reviewed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_worklogs_user ON worklogs(user_id);
CREATE INDEX IF NOT EXISTS idx_worklogs_date ON worklogs(date DESC);

-- =====================================================
-- ANNOUNCEMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'general' CHECK (type IN ('general', 'urgent', 'event', 'policy', 'achievement')),
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    published_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_audience VARCHAR(50) DEFAULT 'all' CHECK (target_audience IN ('all', 'interns', 'admins')),
    is_active BOOLEAN DEFAULT TRUE,
    expiry_date TIMESTAMPTZ,
    attachments JSONB DEFAULT '[]'::jsonb,
    read_by JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_created ON announcements(created_at DESC);

-- =====================================================
-- FUNCTIONS FOR AUTOMATIC UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_attendances_updated_at ON attendances;
CREATE TRIGGER update_attendances_updated_at
    BEFORE UPDATE ON attendances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_evaluations_updated_at ON evaluations;
CREATE TRIGGER update_evaluations_updated_at
    BEFORE UPDATE ON evaluations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_worklogs_updated_at ON worklogs;
CREATE TRIGGER update_worklogs_updated_at
    BEFORE UPDATE ON worklogs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_announcements_updated_at ON announcements;
CREATE TRIGGER update_announcements_updated_at
    BEFORE UPDATE ON announcements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCTION TO GENERATE EMPLOYEE ID
-- =====================================================
CREATE OR REPLACE FUNCTION generate_intern_id()
RETURNS TRIGGER AS $$
DECLARE
    year_suffix VARCHAR(2);
    last_sequence INTEGER;
    new_intern_id VARCHAR(20);
BEGIN
    -- Only generate for new intern/employee users
    IF NEW.role = 'intern' AND NEW.intern_id IS NULL THEN
        year_suffix := TO_CHAR(NOW(), 'YY');
        
        -- Find the last employee ID for this year
        SELECT COALESCE(MAX(CAST(SUBSTRING(intern_id FROM 6 FOR 4) AS INTEGER)), 0)
        INTO last_sequence
        FROM users
        WHERE intern_id LIKE 'EMP' || year_suffix || '-%';
        
        -- Generate EMP ID format: EMP26-0001
        new_intern_id := 'EMP' || year_suffix || '-' || LPAD((last_sequence + 1)::TEXT, 4, '0');
        NEW.intern_id := new_intern_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS generate_intern_id_trigger ON users;
CREATE TRIGGER generate_intern_id_trigger
    BEFORE INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION generate_intern_id();

-- =====================================================
-- FUNCTION TO CALCULATE ATTENDANCE HOURS
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_attendance_hours()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.check_in IS NOT NULL AND NEW.check_out IS NOT NULL THEN
        NEW.total_hours := ROUND(EXTRACT(EPOCH FROM (NEW.check_out - NEW.check_in)) / 3600, 2);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_attendance_hours_trigger ON attendances;
CREATE TRIGGER calculate_attendance_hours_trigger
    BEFORE INSERT OR UPDATE ON attendances
    FOR EACH ROW
    EXECUTE FUNCTION calculate_attendance_hours();

-- =====================================================
-- FUNCTION TO CALCULATE OVERALL RATING
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_overall_rating()
RETURNS TRIGGER AS $$
BEGIN
    NEW.overall_rating := ROUND((
        COALESCE(NEW.rating_technical_skills, 0) +
        COALESCE(NEW.rating_communication, 0) +
        COALESCE(NEW.rating_teamwork, 0) +
        COALESCE(NEW.rating_punctuality, 0) +
        COALESCE(NEW.rating_problem_solving, 0) +
        COALESCE(NEW.rating_initiative, 0) +
        COALESCE(NEW.rating_learning_ability, 0)
    )::DECIMAL / 7, 1);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_overall_rating_trigger ON evaluations;
CREATE TRIGGER calculate_overall_rating_trigger
    BEFORE INSERT OR UPDATE ON evaluations
    FOR EACH ROW
    EXECUTE FUNCTION calculate_overall_rating();

-- =====================================================
-- RLS (Row Level Security) Policies - Optional
-- =====================================================
-- Enable RLS on all tables (uncomment if needed)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE worklogs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres;
