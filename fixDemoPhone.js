// Quick script to fix Demo employee phone number format
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');
    
    const User = require('./models/User');
    
    // Find Demo employee and update phone to correct format
    const demo = await User.findOne({ email: 'demo@example.com' });
    
    if (demo) {
      console.log('Found Demo user:', demo.email);
      console.log('Current phone:', demo.phone);
      
      // Remove +, spaces, and hyphens from phone number
      const cleanPhone = demo.phone.replace(/[\+\s\-\(\)]/g, '');
      
      demo.phone = cleanPhone;
      await demo.save();
      
      console.log('✅ Updated phone to:', demo.phone);
      console.log('✅ Demo employee can now use forgot password!');
    } else {
      console.log('❌ Demo user not found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

connectDB();
