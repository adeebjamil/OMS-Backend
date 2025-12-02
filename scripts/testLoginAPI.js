const axios = require('axios');

const testLogin = async () => {
  try {
    console.log('🧪 Testing Login API...\n');
    
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'jadeeb04@gmail.com',
      password: 'jamiladeeb123'
    });

    console.log('✅ Login successful!');
    console.log('Response:', response.data);
    console.log('\nToken:', response.data.token);
    
  } catch (error) {
    console.error('❌ Login failed!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Message:', error.response.data.message);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response from server');
      console.error('Is backend running on http://localhost:5000?');
    } else {
      console.error('Error:', error.message);
    }
  }
};

testLogin();
