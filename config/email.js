const SibApiV3Sdk = require('@getbrevo/brevo');

// Debug: Log email config status at startup
console.log('📧 Email Configuration:');
console.log('   BREVO_API_KEY:', process.env.BREVO_API_KEY ? 'SET' : 'NOT SET');

// Check if Brevo API key is configured
if (!process.env.BREVO_API_KEY) {
  console.log('⚠️ Brevo API key not configured. Set BREVO_API_KEY environment variable.');
} else {
  console.log('✅ Email service (Brevo) is ready');
}

// Initialize Brevo client
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY || '');

// Send OTP email using Brevo
const sendOTPEmail = async (to, otp, userName) => {
  // Check if Brevo is configured
  if (!process.env.BREVO_API_KEY) {
    throw new Error('Email service not configured. Please contact administrator.');
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Password Reset</h1>
          <p style="color: rgba(255,255,255,0.9); margin-top: 10px;">Office Hub Management System</p>
        </div>
        
        <div style="background: white; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <p style="color: #333; font-size: 16px; margin-bottom: 10px;">Hello <strong>${userName}</strong>,</p>
          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            We received a request to reset your password. Please use the OTP below to complete the process:
          </p>
          
          <div style="background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%); padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0;">
            <p style="color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px;">Your OTP Code</p>
            <div style="font-size: 42px; font-weight: bold; color: #667eea; letter-spacing: 12px; font-family: 'Courier New', monospace;">
              ${otp}
            </div>
            <p style="color: #888; font-size: 12px; margin-top: 15px;">⏱️ Valid for 10 minutes</p>
          </div>
          
          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
            <p style="color: #856404; font-size: 13px; margin: 0;">
              ⚠️ <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email or contact your administrator.
            </p>
          </div>
          
          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
            This is an automated message from Office Hub. Please do not reply to this email.
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px;">
          <p style="color: #999; font-size: 11px;">
            © ${new Date().getFullYear()} Office Hub. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    
    sendSmtpEmail.subject = 'Password Reset OTP - Office Hub';
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.sender = { name: 'Office Hub', email: process.env.EMAIL_USER || 'dbmongo6459@gmail.com' };
    sendSmtpEmail.to = [{ email: to, name: userName }];

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);

    console.log('✅ OTP email sent via Brevo:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Failed to send OTP email:', error);
    throw error;
  }
};

module.exports = { sendOTPEmail };
