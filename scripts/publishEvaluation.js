require('dotenv').config();
const { supabase } = require('../config/supabase');

async function publishEvaluation() {
  try {
    const evaluationId = '52196deb-88a8-4739-97a4-d5c76856f01a';
    
    const { data, error } = await supabase
      .from('evaluations')
      .update({ is_published: true })
      .eq('id', evaluationId)
      .select()
      .single();
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log('✅ Evaluation published successfully!');
    console.log('ID:', data.id);
    console.log('Published:', data.is_published);
    
  } catch (err) {
    console.error('Script error:', err);
  }
  process.exit(0);
}

publishEvaluation();
