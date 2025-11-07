require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'jadeeb04@gmail.com' });
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists!');
      console.log('Email:', existingAdmin.email);
      console.log('Name:', existingAdmin.name);
      console.log('Role:', existingAdmin.role);
      
      // Update password if needed
      const salt = await bcrypt.genSalt(10);
      existingAdmin.password = await bcrypt.hash('jamiladeeb123', salt);
      await existingAdmin.save();
      console.log('✅ Password updated successfully!');
      
      process.exit(0);
    }

    // Create new admin user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('jamiladeeb123', salt);

    const admin = await User.create({
      name: 'Adeeb Jamil',
      email: 'jadeeb04@gmail.com',
      password: hashedPassword,
      role: 'admin',
      phone: '918409528159', // Your WhatsApp number
      joiningDate: new Date(),
      isActive: true,
      department: 'Management',
      position: 'System Administrator'
    });

    console.log('✅ Admin user created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:', admin.email);
    console.log('👤 Name:', admin.name);
    console.log('🔑 Password: jamiladeeb123');
    console.log('👔 Role:', admin.role);
    console.log('📱 Phone:', admin.phone);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🚀 You can now login at:');
    console.log('   https://oms-frontend-beta.vercel.app/login');
    console.log('\n   Email: jadeeb04@gmail.com');
    console.log('   Password: jamiladeeb123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

createAdmin();
