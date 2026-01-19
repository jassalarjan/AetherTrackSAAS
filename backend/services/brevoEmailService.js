import * as brevoAPI from '@getbrevo/brevo';

/**
 * Brevo Email Service
 * Handles transactional email sending via Brevo API
 */
class BrevoEmailService {
  constructor() {
    this.client = null;
    this.initClient();
  }

  initClient() {
    if (process.env.BREVO_API_KEY) {
      const apiInstance = new brevoAPI.TransactionalEmailsApi();
      apiInstance.setApiKey(brevoAPI.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);
      this.client = apiInstance;
    }
  }

  /**
   * Send transactional email
   * @param {Object} options
   * @param {string|string[]} options.to - Recipient email(s)
   * @param {string} options.subject - Email subject
   * @param {string} options.htmlContent - HTML content
   * @param {Object} options.params - Template parameters for variable interpolation
   * @param {Object} options.from - Sender info {email, name}
   * @returns {Object} Send result with success, messageId, etc.
   */
  async send({ to, subject, htmlContent, params = {}, from = { email: 'updates.codecatalyst@gmail.com', name: 'TaskFlow' } }) {
    try {
      if (!this.client) {
        throw new Error('Brevo API client not configured');
      }

      // Interpolate variables in subject and htmlContent
      const interpolatedSubject = this.interpolateVariables(subject, params);
      const interpolatedHtml = this.interpolateVariables(htmlContent, params);

      const sendSmtpEmail = new brevoAPI.SendSmtpEmail();
      sendSmtpEmail.sender = from;
      sendSmtpEmail.to = Array.isArray(to) ? to.map(email => ({ email })) : [{ email: to }];
      sendSmtpEmail.subject = interpolatedSubject;
      sendSmtpEmail.htmlContent = interpolatedHtml;

      console.log('📤 Sending transactional email via Brevo API...');
      const result = await this.client.sendTransacEmail(sendSmtpEmail);

      console.log('✅ Email sent successfully:', result.response.statusCode);

      return {
        success: true,
        messageId: result.response.body.messageId,
        status: 'sent',
        provider: 'brevo-api'
      };
    } catch (error) {
      console.error('❌ Brevo email send error:', error.message);
      return {
        success: false,
        error: error.message,
        status: 'failed',
        provider: 'brevo-api'
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