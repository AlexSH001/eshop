const nodemailer = require('nodemailer');
const logger = require('../config/logger');
const { database } = require('../database');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.smtpFrom = null;
    // Initialize asynchronously - don't await in constructor
    this.init().catch(error => {
      logger.error('Failed to initialize email service in constructor:', error);
    });
  }

  async getEmailSettings() {
    try {
      // Try to get email settings from database
      const row = await database.get('SELECT data FROM settings WHERE section = ?', ['email']);
      
      if (row) {
        const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
        // Return database settings if they exist and have required fields
        if (data.smtpHost && data.smtpPort) {
          return {
            host: data.smtpHost,
            port: parseInt(data.smtpPort),
            user: data.smtpUser || '',
            pass: data.smtpPass || '',
            from: data.fromEmail || data.smtpUser || process.env.SMTP_FROM || process.env.SMTP_USER,
          };
        }
      }
    } catch (error) {
      logger.debug('Could not load email settings from database, using environment variables:', error.message);
    }

    // Fall back to environment variables
    if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
      return {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASSWORD || '',
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
      };
    }

    return null;
  }

  async init() {
    const settings = await this.getEmailSettings();
    
    if (!settings) {
      logger.warn('Email service not configured. SMTP settings missing.');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: settings.host,
        port: settings.port,
        secure: settings.port === 465, // true for 465, false for other ports
        auth: settings.user ? {
          user: settings.user,
          pass: settings.pass,
        } : undefined,
      });

      this.smtpFrom = settings.from;
      this.isConfigured = true;
      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
    }
  }

  async reload() {
    // Reload settings from database
    this.transporter = null;
    this.isConfigured = false;
    await this.init();
  }

  async sendPasswordResetEmail(email, resetToken, resetUrl) {
    if (!this.isConfigured) {
      logger.warn('Email service not configured. Password reset email not sent.');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const mailOptions = {
        from: this.smtpFrom || process.env.SMTP_FROM || process.env.SMTP_USER,
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
        from: this.smtpFrom || process.env.SMTP_FROM || process.env.SMTP_USER,
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
    const fullResetUrl = resetUrl ? `${resetUrl}?token=${token}` : `https://10.170.0.4/reset-password?token=${token}`;
    
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
    const fullResetUrl = resetUrl ? `${resetUrl}?token=${token}` : `https://10.170.0.4/reset-password?token=${token}`;
    
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
              <a href="${process.env.FRONTEND_URL || 'https://10.170.0.4'}" class="button">Start Shopping</a>
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

Start shopping now: ${process.env.FRONTEND_URL || 'https://10.170.0.4'}

If you have any questions or need assistance, don't hesitate to contact our support team.

Happy shopping!
The E-Shop Team

---
Thank you for choosing E-Shop for your shopping needs.
    `;
  }

  async sendVerificationEmail(email, verificationToken, verificationUrl) {
    if (!this.isConfigured) {
      logger.warn('Email service not configured. Verification email not sent.');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const mailOptions = {
        from: this.smtpFrom || process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Verify Your Email - E-Shop',
        html: this.getVerificationEmailTemplate(verificationToken, verificationUrl),
        text: this.getVerificationEmailText(verificationToken, verificationUrl),
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Verification email sent to ${email}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error('Failed to send verification email:', error);
      return { success: false, error: error.message };
    }
  }

  getVerificationEmailTemplate(token, verificationUrl) {
    const fullVerificationUrl = verificationUrl ? `${verificationUrl}?token=${token}` : `${process.env.FRONTEND_URL || 'https://10.170.0.4'}/verify-email?token=${token}`;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
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
            <h1>✉️ Verify Your Email</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>Thank you for signing up for E-Shop! Please verify your email address to complete your registration.</p>
            
            <div style="text-align: center;">
              <a href="${fullVerificationUrl}" class="button">Verify Email</a>
            </div>
            
            <div class="warning">
              <strong>Important:</strong> This link will expire in 24 hours for security reasons.
            </div>
            
            <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #007bff;">${fullVerificationUrl}</p>
            
            <p>If you didn't create an account with E-Shop, you can safely ignore this email.</p>
            
            <p>Best regards,<br>The E-Shop Team</p>
          </div>
          <div class="footer">
            <p>This email was sent to verify your email address for your E-Shop account.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getVerificationEmailText(token, verificationUrl) {
    const fullVerificationUrl = verificationUrl ? `${verificationUrl}?token=${token}` : `${process.env.FRONTEND_URL || 'https://10.170.0.4'}/verify-email?token=${token}`;
    
    return `
Verify Your Email - E-Shop

Hello,

Thank you for signing up for E-Shop! Please verify your email address to complete your registration.

To verify your email, please visit this link:
${fullVerificationUrl}

Important: This link will expire in 24 hours for security reasons.

If you didn't create an account with E-Shop, you can safely ignore this email.

Best regards,
The E-Shop Team

---
This email was sent to verify your email address for your E-Shop account.
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