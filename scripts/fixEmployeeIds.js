require('dotenv').config();
const { supabase } = require('../config/supabase');

async function fixEmployeeIds() {
  try {
    console.log('Fixing employee IDs...\n');
    
    // Get all employees ordered by start_date
    const { data: employees, error } = await supabase
      .from('users')
      .select('id, name, intern_id, start_date, role')
      .eq('role', 'intern')
      .order('start_date', { ascending: true });
    
    if (error) {
      console.error('Error fetching employees:', error);
      return;
    }
    
    console.log(`Found ${employees.length} employees\n`);
    
    // Group employees by year (from start_date)
    const employeesByYear = {};
    
    for (const emp of employees) {
      const startDate = new Date(emp.start_date);
      const year = startDate.getFullYear().toString().slice(-2); // e.g., "24" for 2024
      
      if (!employeesByYear[year]) {
        employeesByYear[year] = [];
      }
      employeesByYear[year].push(emp);
    }
    
    // Assign sequential IDs per year
    let totalSequence = 0;
    for (const year of Object.keys(employeesByYear).sort()) {
      for (const emp of employeesByYear[year]) {
        totalSequence++;
        const newId = `EMP${year}-${String(totalSequence).padStart(4, '0')}`;
        
        console.log(`Updating ${emp.name}: ${emp.intern_id || 'null'} -> ${newId}`);
        
        const { error: updateError } = await supabase
          .from('users')
          .update({ intern_id: newId })
          .eq('id', emp.id);
        
        if (updateError) {
          console.error(`Error updating ${emp.name}:`, updateError);
        }
      }
    }
    
    console.log('\n✅ Employee IDs fixed successfully!');
    
    // Show updated data
    const { data: updated } = await supabase
      .from('users')
      .select('name, intern_id, start_date')
      .eq('role', 'intern')
      .order('start_date', { ascending: true });
    
    console.log('\nUpdated employees:');
    updated.forEach(emp => {
      console.log(`  - ${emp.name}: ${emp.intern_id} (started: ${new Date(emp.start_date).toLocaleDateString()})`);
    });
    
  } catch (err) {
    console.error('Script error:', err);
  }
  process.exit(0);
}

fixEmployeeIds();
