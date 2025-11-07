require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const fixUserStatus = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');

    const result = await User.updateOne(
      { email: 'jadeeb04@gmail.com' },
      { $set: { isActive: true } }
    );

    console.log('✅ User status updated:', result);
    
    const user = await User.findOne({ email: 'jadeeb04@gmail.com' });
    console.log('\n👤 User details:');
    console.log('Email:', user.email);
    console.log('Name:', user.name);
    console.log('isActive:', user.isActive);
    console.log('Role:', user.role);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

fixUserStatus();
