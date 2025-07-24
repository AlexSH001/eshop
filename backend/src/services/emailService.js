const nodemailer = require('nodemailer');
const logger = require('../config/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.init();
  }

  init() {
    const {
      SMTP_HOST,
      SMTP_PORT,
      SMTP_USER,
      SMTP_PASSWORD,
      SMTP_FROM
    } = process.env;

    // Check if email is configured
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD) {
      logger.warn('Email service not configured. SMTP settings missing.');
      return;
    }

    try {
      this.transporter = nodemailer.createTransporter({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT),
        secure: SMTP_PORT === '465', // true for 465, false for other ports
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASSWORD,
        },
      });

      this.isConfigured = true;
      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
    }
  }

  async sendPasswordResetEmail(email, resetToken, resetUrl) {
    if (!this.isConfigured) {
      logger.warn('Email service not configured. Password reset email not sent.');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Password Reset Request - E-Shop',
        html: this.getPasswordResetEmailTemplate(resetToken, resetUrl),
        text: this.getPasswordResetEmailText(resetToken, resetUrl),
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Password reset email sent to ${email}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error('Failed to send password reset email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendWelcomeEmail(email, firstName) {
    if (!this.isConfigured) {
      logger.warn('Email service not configured. Welcome email not sent.');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Welcome to E-Shop!',
        html: this.getWelcomeEmailTemplate(firstName),
        text: this.getWelcomeEmailText(firstName),
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Welcome email sent to ${email}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error('Failed to send welcome email:', error);
      return { success: false, error: error.message };
    }
  }

  getPasswordResetEmailTemplate(token, resetUrl) {
    const fullResetUrl = resetUrl ? `${resetUrl}?token=${token}` : `http://localhost:3000/reset-password?token=${token}`;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Request</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #e9ecef; }
          .button { display: inline-block; padding: 12px 24px; background: #007bff; color: #fff; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; color: #6c757d; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>We received a request to reset your password for your E-Shop account. If you didn't make this request, you can safely ignore this email.</p>
            
            <div style="text-align: center;">
              <a href="${fullResetUrl}" class="button">Reset Password</a>
            </div>
            
            <div class="warning">
              <strong>Important:</strong> This link will expire in 1 hour for security reasons.
            </div>
            
            <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #007bff;">${fullResetUrl}</p>
            
            <p>If you have any questions, please contact our support team.</p>
            
            <p>Best regards,<br>The E-Shop Team</p>
          </div>
          <div class="footer">
            <p>This email was sent to you because someone requested a password reset for your account.</p>
            <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getPasswordResetEmailText(token, resetUrl) {
    const fullResetUrl = resetUrl ? `${resetUrl}?token=${token}` : `http://localhost:3000/reset-password?token=${token}`;
    
    return `
Password Reset Request - E-Shop

Hello,

We received a request to reset your password for your E-Shop account. If you didn't make this request, you can safely ignore this email.

To reset your password, please visit this link:
${fullResetUrl}

Important: This link will expire in 1 hour for security reasons.

If you have any questions, please contact our support team.

Best regards,
The E-Shop Team

---
This email was sent to you because someone requested a password reset for your account.
If you didn't request this, please ignore this email and your password will remain unchanged.
    `;
  }

  getWelcomeEmailTemplate(firstName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to E-Shop!</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #e9ecef; }
          .button { display: inline-block; padding: 12px 24px; background: #007bff; color: #fff; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; color: #6c757d; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to E-Shop!</h1>
          </div>
          <div class="content">
            <p>Hello ${firstName},</p>
            <p>Welcome to E-Shop! We're excited to have you as part of our community.</p>
            
            <p>With your new account, you can:</p>
            <ul>
              <li>Browse our extensive product catalog</li>
              <li>Save items to your wishlist</li>
              <li>Track your orders</li>
              <li>Manage your profile and preferences</li>
            </ul>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="button">Start Shopping</a>
            </div>
            
            <p>If you have any questions or need assistance, don't hesitate to contact our support team.</p>
            
            <p>Happy shopping!<br>The E-Shop Team</p>
          </div>
          <div class="footer">
            <p>Thank you for choosing E-Shop for your shopping needs.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getWelcomeEmailText(firstName) {
    return `
Welcome to E-Shop!

Hello ${firstName},

Welcome to E-Shop! We're excited to have you as part of our community.

With your new account, you can:
- Browse our extensive product catalog
- Save items to your wishlist
- Track your orders
- Manage your profile and preferences

Start shopping now: ${process.env.FRONTEND_URL || 'http://localhost:3000'}

If you have any questions or need assistance, don't hesitate to contact our support team.

Happy shopping!
The E-Shop Team

---
Thank you for choosing E-Shop for your shopping needs.
    `;
  }

  // Test email configuration
  async testConnection() {
    if (!this.isConfigured) {
      return { success: false, error: 'Email service not configured' };
    }

    try {
      await this.transporter.verify();
      return { success: true, message: 'Email service is working correctly' };
    } catch (error) {
      logger.error('Email service test failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService(); 