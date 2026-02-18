import * as brevoAPI from '@getbrevo/brevo';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Brevo Email Service
 * Handles transactional email sending via Brevo API with SMTP fallback
 */
class BrevoEmailService {
  constructor() {
    this.client = null;
    this.smtpTransporter = null;
    this.layoutTemplate = null;
    this.initClient();
  }

  initClient() {
    // Lazy initialization - only initialize when needed
    return;
  }

  getClient() {
    if (!this.client && process.env.BREVO_API_KEY) {
      try {
        const apiInstance = new brevoAPI.TransactionalEmailsApi();
        apiInstance.setApiKey(brevoAPI.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);
        this.client = apiInstance;
      } catch (error) {
        console.error('❌ Failed to initialize Brevo client:', error.message);
        this.client = null;
      }
    }
    return this.client;
  }

  getSmtpTransporter() {
    if (!this.smtpTransporter) {
      try {
        // Try Brevo SMTP first
        if (process.env.EMAIL_HOST === 'smtp-relay.brevo.com' && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
          this.smtpTransporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT) || 587,
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASSWORD
            }
          });
          console.log('✅ Initialized Brevo SMTP transporter');
        } 
        // Fallback to Gmail or other SMTP
        else if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
          this.smtpTransporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT) || 587,
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASSWORD
            }
          });
          console.log('✅ Initialized SMTP transporter');
        }
      } catch (error) {
        console.error('❌ Failed to initialize SMTP transporter:', error.message);
        this.smtpTransporter = null;
      }
    }
    return this.smtpTransporter;
  }

  async sendViaSMTP({ to, subject, htmlContent, from }) {
    const transporter = this.getSmtpTransporter();
    if (!transporter) {
      throw new Error('SMTP transporter not configured');
    }

    const recipients = Array.isArray(to) ? to.join(', ') : to;
    
    const result = await transporter.sendMail({
      from: `"${from.name}" <${from.email}>`,
      to: recipients,
      subject: subject,
      html: htmlContent
    });

    return {
      success: true,
      messageId: result.messageId,
      status: 'sent',
      provider: 'smtp'
    };
  }

  /**
   * Load base layout from template.html
   */
  getLayout() {
    if (!this.layoutTemplate) {
      try {
        const layoutPath = path.join(__dirname, '..', '..', 'template.html');
        if (fs.existsSync(layoutPath)) {
          this.layoutTemplate = fs.readFileSync(layoutPath, 'utf8');
        }
      } catch (error) {
        console.error('❌ Failed to load email layout:', error.message);
      }
    }
    return this.layoutTemplate;
  }

  /**
   * Wrap content in the base layout
   */
  wrapInLayout(content, subject, params = {}) {
    const layout = this.getLayout();
    if (!layout) return content;

    // Check if content is already a full HTML document
    if (content.includes('<html') || content.includes('<body')) {
      return this.interpolateVariables(content, params);
    }

    // Default params for layout
    const layoutParams = {
      email_subject: subject,
      logo_url: params.logo_url || 'https://AetherTrack-nine-phi.vercel.app/logo.png',
      header_title: params.header_title || 'Notification',
      recipient_name: params.fullName || params.candidateName || params.name || 'User',
      intro_message: content,
      website_url: params.websiteUrl || 'https://AetherTrack-nine-phi.vercel.app',
      discord_url: params.discordUrl || 'https://discord.gg/CfwBfFhDZf',
      linkedin_url: params.linkedinUrl || 'https://www.linkedin.com/company/code-catalyst-s/',
      instagram_url: params.instagramUrl || 'https://www.instagram.com/codecatalyst_jb/',
      current_year: new Date().getFullYear(),
      sender_name: params.senderName || process.env.EMAIL_FROM_NAME || 'AetherTrack',
      sender_designation: params.senderDesignation || 'Team',
      ...params
    };

    // Replace conditionals {{#if var}}...{{/if}}
    let wrapped = layout;
    const ifRegex = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g;
    wrapped = wrapped.replace(ifRegex, (match, p1, p2) => {
      return layoutParams[p1] ? p2 : '';
    });

    return this.interpolateVariables(wrapped, layoutParams);
  }

  /**
   * Send transactional email with automatic fallback
   * @param {Object} options
   * @param {string|string[]} options.to - Recipient email(s)
   * @param {string} options.subject - Email subject
   * @param {string} options.htmlContent - HTML content
   * @param {Object} options.params - Template parameters for variable interpolation
   * @param {Object} options.from - Sender info {email, name}
   * @param {boolean} options.useLayout - Whether to wrap in base layout
   * @returns {Object} Send result with success, messageId, etc.
   */
  async send({ to, subject, htmlContent, params = {}, from, useLayout = false }) {
    if (!from) {
      from = {
        email: process.env.EMAIL_USER || process.env.EMAIL_FROM || 'arjanwebcraft@gmail.com',
        name: process.env.EMAIL_FROM_NAME || 'AetherTrack'
      };
    }

    // Interpolate variables in subject
    const interpolatedSubject = this.interpolateVariables(subject, params);
    
    // Prepare HTML content
    let finalHtml = htmlContent;
    if (useLayout) {
      finalHtml = this.wrapInLayout(htmlContent, interpolatedSubject, { ...params, senderName: from.name });
    } else {
      finalHtml = this.interpolateVariables(htmlContent, params);
    }

    // Try Brevo API first
    try {
      const client = this.getClient();
      if (client) {
        console.log('📤 Attempting to send via Brevo API...');
        const sendSmtpEmail = new brevoAPI.SendSmtpEmail();
        sendSmtpEmail.sender = from;
        sendSmtpEmail.to = Array.isArray(to) ? to.map(email => ({ email })) : [{ email: to }];
        sendSmtpEmail.subject = interpolatedSubject;
        sendSmtpEmail.htmlContent = finalHtml;

        console.log('📧 Brevo request:', {
          sender: from,
          to: sendSmtpEmail.to,
          subject: interpolatedSubject,
          htmlLength: finalHtml.length
        });

        const result = await client.sendTransacEmail(sendSmtpEmail);

        // Handle different response structures
        let messageId = null;
        if (result.body) {
          messageId = result.body.messageId || result.body.id;
        }

        console.log('✅ Email sent via Brevo API');
        return {
          success: true,
          messageId: messageId,
          status: 'sent',
          provider: 'brevo-api'
        };
      }
    } catch (error) {
      console.error('❌ Brevo API error details:', {
        message: error.message,
        response: error.response?.body || error.response,
        statusCode: error.statusCode,
        stack: error.stack
      });
      console.warn('⚠️ Brevo API failed:', error.message, '- Trying SMTP fallback...');
    }

    // Fallback to SMTP
    try {
      console.log('📤 Attempting to send via SMTP...');
      const result = await this.sendViaSMTP({
        to: Array.isArray(to) ? to : [to],
        subject: interpolatedSubject,
        htmlContent: finalHtml,
        from
      });
      console.log('✅ Email sent via SMTP fallback');
      return result;
    } catch (smtpError) {
      console.error('❌ SMTP fallback also failed:', smtpError.message);
      return {
        success: false,
        error: `Failed to send email. API: Unavailable, SMTP: ${smtpError.message}`,
        status: 'failed',
        provider: 'none'
      };
    }
  }

  /**
   * Interpolate variables in template string
   * Supports {{variable}} syntax
   */
  interpolateVariables(template, params) {
    if (!template || !params) return template;

    let result = template;
    for (const [key, value] of Object.entries(params)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value || '');
    }
    return result;
  }
}

export default new BrevoEmailService();