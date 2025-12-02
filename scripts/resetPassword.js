require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const resetPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected\n');

    // Find user
    const user = await User.findOne({ email: 'jadeeb04@gmail.com' }).select('+password');
    
    if (!user) {
      console.log('❌ User not found!');
      process.exit(1);
    }

    console.log('👤 User found:', user.email);
    console.log('Current password hash:', user.password ? user.password.substring(0, 30) + '...' : 'NO PASSWORD');
    
    // Set new password - bypass the pre-save hook by using updateOne
    const newPassword = 'jamiladeeb123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    console.log('\n🔄 Setting new password...');
    console.log('New password hash:', hashedPassword.substring(0, 30) + '...');
    
    // Update directly in database
    await User.updateOne(
      { email: 'jadeeb04@gmail.com' },
      { 
        $set: { 
          password: hashedPassword,
          status: 'active'
        } 
      }
    );
    
    console.log('✅ Password updated in database\n');
    
    // Verify the update
    const updatedUser = await User.findOne({ email: 'jadeeb04@gmail.com' }).select('+password');
    console.log('📊 Verification:');
    console.log('Email:', updatedUser.email);
    console.log('Status:', updatedUser.status);
    console.log('Password hash:', updatedUser.password.substring(0, 30) + '...');
    
    // Test password match
    const isMatch = await bcrypt.compare(newPassword, updatedUser.password);
    console.log('Password test:', isMatch ? '✅ MATCH' : '❌ NO MATCH');
    
    if (isMatch) {
      console.log('\n✅ SUCCESS! You can now login with:');
      console.log('   Email: jadeeb04@gmail.com');
      console.log('   Password: jamiladeeb123');
    } else {
      console.log('\n❌ FAILED! Password still does not match.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

resetPassword();
