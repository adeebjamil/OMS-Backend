/**
 * Create Admin User in Supabase
 * 
 * Usage: node scripts/createAdminSupabase.js
 */

require('dotenv').config();
const { supabase } = require('../config/supabase');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║            Create Admin User in Supabase                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const adminData = {
    email: 'jadeeb04@gmail.com',
    password: 'Lovosis@2026',
    name: 'Admin',
    role: 'admin',
    status: 'active',
    department: 'Management',
    position: 'System Administrator'
  };

  try {
    // Check if user already exists
    console.log('🔍 Checking if admin already exists...');
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('email', adminData.email)
      .single();

    if (existingUser) {
      console.log('\n⚠️  Admin user already exists!');
      console.log('   Email:', existingUser.email);
      console.log('   Name:', existingUser.name);
      console.log('   Role:', existingUser.role);
      console.log('   ID:', existingUser.id);
      process.exit(0);
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminData.password, salt);

    // Create admin user
    console.log('📝 Creating admin user...');
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([{
        email: adminData.email,
        password: hashedPassword,
        name: adminData.name,
        role: adminData.role,
        status: adminData.status,
        department: adminData.department,
        internship_role: adminData.position,
        start_date: new Date().toISOString()
      }])
      .select('id, email, name, role, status, department, internship_role, created_at')
      .single();

    if (createError) {
      console.error('\n❌ Error creating admin:', createError.message);
      process.exit(1);
    }

    console.log('\n✅ Admin user created successfully!\n');
    console.log('   ════════════════════════════════════════');
    console.log('   📧 Email:', newUser.email);
    console.log('   🔑 Password:', adminData.password);
    console.log('   👤 Name:', newUser.name);
    console.log('   🎭 Role:', newUser.role);
    console.log('   📊 Status:', newUser.status);
    console.log('   🏢 Department:', newUser.department);
    console.log('   💼 Position:', newUser.internship_role);
    console.log('   🆔 ID:', newUser.id);
    console.log('   📅 Created:', new Date(newUser.created_at).toLocaleString());
    console.log('   ════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

createAdmin();
