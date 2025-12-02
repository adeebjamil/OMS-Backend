require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const testLogin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');

    // Find admin user
    const admin = await User.findOne({ email: 'jadeeb04@gmail.com' });
    
    if (!admin) {
      console.log('❌ Admin user not found!');
      process.exit(1);
    }

    console.log('\n📧 Admin User Found:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Name:', admin.name);
    console.log('Email:', admin.email);
    console.log('Role:', admin.role);
    console.log('Phone:', admin.phone);
    console.log('Status:', admin.isActive ? 'Active' : 'Inactive');
    console.log('Password Hash:', admin.password ? admin.password.substring(0, 20) + '...' : 'NO PASSWORD');

    // Activate user if inactive
    if (!admin.isActive) {
      admin.isActive = true;
      await admin.save();
      console.log('✅ User activated!');
    }

    // Test password
    const testPassword = 'jamiladeeb123';
    
    if (!admin.password) {
      console.log('\n❌ NO PASSWORD SET! Setting password now...');
      const salt = await bcrypt.genSalt(10);
      admin.password = await bcrypt.hash(testPassword, salt);
      await admin.save();
      console.log('✅ Password set successfully!');
    } else {
      const isMatch = await bcrypt.compare(testPassword, admin.password);
      
      console.log('\n🔑 Password Test:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Testing password:', testPassword);
      console.log('Password Match:', isMatch ? '✅ YES' : '❌ NO');

      if (!isMatch) {
        console.log('\n❌ Password does not match!');
        console.log('Resetting password to: jamiladeeb123');
        
        const salt = await bcrypt.genSalt(10);
        admin.password = await bcrypt.hash(testPassword, salt);
        await admin.save();
        
        console.log('✅ Password reset successfully!');
      }
    }

    console.log('\n✅ Login is now ready with:');
    console.log('   Email: jadeeb04@gmail.com');
    console.log('   Password: jamiladeeb123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

testLogin();
