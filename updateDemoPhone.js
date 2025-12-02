// Update Demo employee phone to verified test number
const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    const User = mongoose.model('User', require('./models/User').schema);
    
    const demo = await User.findOne({ email: 'demo@example.com' });
    if (demo) {
      console.log('Current phone:', demo.phone);
      demo.phone = '917033772680'; // Your verified test number
      await demo.save();
      console.log('✅ Updated to:', demo.phone);
      console.log('✅ Demo can now receive WhatsApp OTP!');
    } else {
      console.log('❌ Demo user not found');
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
