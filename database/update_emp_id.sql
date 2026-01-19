-- =====================================================
-- UPDATE: Change INT to EMP for Employee IDs
-- Run this in Supabase SQL Editor
-- =====================================================

-- First, update existing INT IDs to EMP
UPDATE users SET intern_id = REPLACE(intern_id, 'INT', 'EMP') WHERE intern_id LIKE 'INT%';

-- Recreate the function to generate EMP IDs instead of INT
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
        
        -- Find the last employee ID for this year (check both EMP and INT for backwards compatibility)
        SELECT COALESCE(MAX(CAST(SUBSTRING(intern_id FROM 6 FOR 4) AS INTEGER)), 0)
        INTO last_sequence
        FROM users
        WHERE intern_id LIKE 'EMP' || year_suffix || '-%' 
           OR intern_id LIKE 'INT' || year_suffix || '-%';
        
        -- Generate EMP ID format: EMP26-0001
        new_intern_id := 'EMP' || year_suffix || '-' || LPAD((last_sequence + 1)::TEXT, 4, '0');
        NEW.intern_id := new_intern_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verify the trigger exists
DROP TRIGGER IF EXISTS generate_intern_id_trigger ON users;
CREATE TRIGGER generate_intern_id_trigger
    BEFORE INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION generate_intern_id();
