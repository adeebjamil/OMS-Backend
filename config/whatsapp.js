const axios = require('axios');

// WhatsApp Cloud API Configuration
// Get these from: https://developers.facebook.com/apps/
const WHATSAPP_CONFIG = {
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '', // Your WhatsApp Phone Number ID
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '', // Your Access Token
  apiVersion: 'v18.0',
  apiUrl: 'https://graph.facebook.com'
};

// Send WhatsApp Message
const sendWhatsAppMessage = async (to, message) => {
  try {
    // Validate configuration
    if (!WHATSAPP_CONFIG.phoneNumberId || !WHATSAPP_CONFIG.accessToken) {
      console.error('❌ WhatsApp credentials not configured!');
      console.error('Phone Number ID:', WHATSAPP_CONFIG.phoneNumberId ? '✅ Set' : '❌ Missing');
      console.error('Access Token:', WHATSAPP_CONFIG.accessToken ? '✅ Set' : '❌ Missing');
      return { 
        success: false, 
        error: 'WhatsApp credentials not configured in .env file' 
      };
    }

    const url = `${WHATSAPP_CONFIG.apiUrl}/${WHATSAPP_CONFIG.apiVersion}/${WHATSAPP_CONFIG.phoneNumberId}/messages`;
    
    console.log(`📱 Sending WhatsApp to: ${to}`);
    console.log(`🔗 API URL: ${url}`);
    
    const data = {
      messaging_product: 'whatsapp',
      to: to, // Phone number in format: 919876543210 (country code + number, no + or spaces)
      type: 'text',
      text: {
        body: message
      }
    };

    const response = await axios.post(url, data, {
      headers: {
        'Authorization': `Bearer ${WHATSAPP_CONFIG.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ WhatsApp message sent successfully:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ WhatsApp API Error Details:');
    console.error('Status:', error.response?.status);
    console.error('Error Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('Error Message:', error.message);
    
    // Check for common errors
    if (error.response?.data?.error?.code === 131026) {
      console.error('⚠️  Recipient phone not in test numbers. Add it in Meta Dashboard!');
    }
    
    return { 
      success: false, 
      error: error.response?.data || error.message,
      details: error.response?.data?.error?.message || 'WhatsApp API error'
    };
  }
};

// Send WhatsApp OTP - Using Template for Development Mode
const sendWhatsAppOTP = async (phoneNumber, otp) => {
  try {
    const url = `${WHATSAPP_CONFIG.apiUrl}/${WHATSAPP_CONFIG.apiVersion}/${WHATSAPP_CONFIG.phoneNumberId}/messages`;
    
    console.log(`� Sending OTP via WhatsApp Template to: ${phoneNumber}`);
    console.log(`🔐 OTP: ${otp}`);
    console.log(`⚠️  Using hello_world template (Development Mode limitation)`);
    
    // In Development mode, we can only use pre-approved templates
    // The hello_world template doesn't support variables, so we'll send it
    // and display the OTP in console/debug mode
    const data = {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'template',
      template: {
        name: 'hello_world',
        language: {
          code: 'en_US'
        }
      }
    };

    const response = await axios.post(url, data, {
      headers: {
        'Authorization': `Bearer ${WHATSAPP_CONFIG.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ WhatsApp template message sent successfully');
    console.log('📝 Message ID:', response.data.messages?.[0]?.id);
    console.log('');
    console.log('⚠️  DEVELOPMENT MODE LIMITATION:');
    console.log('   The user will receive "Hello World" message');
    console.log(`   The actual OTP is: ${otp}`);
    console.log('   For production, create a custom OTP template in Meta Business Manager');
    console.log('');
    
    return { 
      success: true, 
      data: response.data,
      otp: otp, // Return OTP for debug display
      developmentMode: true
    };
  } catch (error) {
    console.error('❌ WhatsApp API Error Details:');
    console.error('Status:', error.response?.status);
    console.error('Error Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('Error Message:', error.message);
    
    return { 
      success: false, 
      error: error.response?.data || error.message,
      details: error.response?.data?.error?.message || 'WhatsApp API error'
    };
  }
};

// Send Document via WhatsApp
const sendWhatsAppDocument = async (to, documentUrl, filename, caption = '') => {
  try {
    const url = `${WHATSAPP_CONFIG.apiUrl}/${WHATSAPP_CONFIG.apiVersion}/${WHATSAPP_CONFIG.phoneNumberId}/messages`;
    
    const data = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'document',
      document: {
        link: documentUrl, // Public URL of the document
        filename: filename,
        caption: caption
      }
    };

    const response = await axios.post(url, data, {
      headers: {
        'Authorization': `Bearer ${WHATSAPP_CONFIG.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ WhatsApp document sent successfully:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ WhatsApp document send failed:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};

// Send Custom Template Message (Pre-approved templates)
const sendWhatsAppTemplate = async (to, templateName, languageCode = 'en', components = []) => {
  try {
    const url = `${WHATSAPP_CONFIG.apiUrl}/${WHATSAPP_CONFIG.apiVersion}/${WHATSAPP_CONFIG.phoneNumberId}/messages`;
    
    const data = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode
        },
        components: components
      }
    };

    const response = await axios.post(url, data, {
      headers: {
        'Authorization': `Bearer ${WHATSAPP_CONFIG.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ WhatsApp template sent successfully:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ WhatsApp template failed:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};

module.exports = {
  sendWhatsAppMessage,
  sendWhatsAppOTP,
  sendWhatsAppDocument,
  sendWhatsAppTemplate
};
