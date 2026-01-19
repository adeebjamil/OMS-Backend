const nodemailer = require('nodemailer');

// Debug: Log email config status at startup
console.log('📧 Email Configuration:');
console.log('   EMAIL_USER:', process.env.EMAIL_USER ? `${process.env.EMAIL_USER.substring(0, 5)}...` : 'NOT SET');
console.log('   EMAIL_PASS:', process.env.EMAIL_PASS ? `SET (${process.env.EMAIL_PASS.length} chars)` : 'NOT SET');

// Check if email credentials are configured
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.log('⚠️ Email credentials not configured. Set EMAIL_USER and EMAIL_PASS environment variables.');
}

// Create transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS // Use App Password, not regular password
  }
});

// Verify transporter connection (only if credentials are set)
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter.verify((error, success) => {
    if (error) {
      console.log('❌ Email transporter error:', error.message);
    } else {
      console.log('✅ Email server is ready to send messages');
    }
  });
}

// Send OTP email
const sendOTPEmail = async (to, otp, userName) => {
  // Check if email is configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Email service not configured. Please contact administrator.');
  }

  const mailOptions = {
    from: {
      name: 'Office Hub',
      address: process.env.EMAIL_USER
    },
    to: to,
    subject: 'Password Reset OTP - Office Hub',
    html: `
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
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ OTP email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send OTP email:', error);
    throw error;
  }
};

module.exports = { transporter, sendOTPEmail };
