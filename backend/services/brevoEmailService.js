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
    this.smtpTransporter = null;
    this.layoutTemplate = null;
  }

  getBrevoApiKey() {
    return process.env.BREVO_API_KEY || null;
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
        }
      } catch (error) {
        void error;
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

  async sendViaBrevoApi({ to, subject, htmlContent, from }) {
    const apiKey = this.getBrevoApiKey();
    if (!apiKey) {
      throw new Error('Brevo API key not configured');
    }

    const recipients = Array.isArray(to) ? to : [to];
    const toPayload = recipients.map((recipient) => {
      if (typeof recipient === 'string') {
        return { email: recipient };
      }

      return {
        email: recipient.email,
        ...(recipient.name ? { name: recipient.name } : {})
      };
    });

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        sender: from,
        to: toPayload,
        subject,
        htmlContent
      })
    });

    if (!response.ok) {
      const bodyText = await response.text();
      throw new Error(`Brevo API ${response.status}: ${bodyText}`);
    }

    const body = await response.json().catch(() => ({}));

    return {
      success: true,
      messageId: body?.messageId || null,
      status: 'sent',
      provider: 'brevo-api'
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
        void error;
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
      const apiKey = this.getBrevoApiKey();
      if (apiKey) {
        const result = await this.sendViaBrevoApi({
          to,
          subject: interpolatedSubject,
          htmlContent: finalHtml,
          from
        });
        return result;
      }
    } catch (error) {
      // Try SMTP fallback after API failure.
    }

    // Fallback to SMTP
    try {
      const result = await this.sendViaSMTP({
        to: Array.isArray(to) ? to : [to],
        subject: interpolatedSubject,
        htmlContent: finalHtml,
        from
      });
      return result;
    } catch (smtpError) {
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
      const escapedKey = String(key).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`{{\\s*${escapedKey}\\s*}}`, 'g');
      result = result.replace(regex, value === null || value === undefined ? '' : String(value));
    }
    return result;
  }
}

export default new BrevoEmailService();