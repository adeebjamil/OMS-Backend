require('dotenv').config();
const { supabase } = require('../config/supabase');

async function checkEvaluations() {
  try {
    console.log('Checking evaluations table...\n');
    
    const { data: evaluations, error } = await supabase
      .from('evaluations')
      .select('*');
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log(`Found ${evaluations.length} evaluations\n`);
    
    if (evaluations.length > 0) {
      console.log('Evaluations:');
      evaluations.forEach(e => {
        console.log(`- ID: ${e.id}, Intern: ${e.intern_id}, Type: ${e.evaluation_type}, Published: ${e.is_published}`);
      });
    }
    
    // Also check users
    const { data: users } = await supabase
      .from('users')
      .select('id, name, email, role');
    
    console.log('\nUsers in database:');
    users.forEach(u => {
      console.log(`- ${u.name} (${u.email}) - ${u.role} - ID: ${u.id}`);
    });
    
  } catch (err) {
    console.error('Script error:', err);
  }
  process.exit(0);
}

checkEvaluations();
