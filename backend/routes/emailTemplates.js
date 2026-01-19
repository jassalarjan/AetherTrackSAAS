import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { checkRole } from '../middleware/roleCheck.js';
import EmailTemplate from '../models/EmailTemplate.js';
import User from '../models/User.js';
import { logChange } from '../utils/changeLogService.js';
import getClientIP from '../utils/getClientIP.js';
import { sendEmail } from '../utils/emailService.js';

const router = express.Router();

// Get all email templates
router.get('/', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const workspaceId = req.context?.workspaceId || req.user.workspaceId;
    const { category } = req.query;

    const query = { 
      $or: [
        { workspaceId },
        { workspaceId: null, isPredefined: true }
      ]
    };

    if (category) {
      query.category = category;
    }

    const templates = await EmailTemplate.find(query).sort({ isPredefined: -1, name: 1 });

    res.json({ success: true, templates });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ message: 'Failed to fetch email templates' });
  }
});

// Create custom email template
router.post('/', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const { name, code, subject, htmlContent, variables, category } = req.body;
    const workspaceId = req.context?.workspaceId || req.user.workspaceId;

    const template = new EmailTemplate({
      workspaceId,
      name,
      code: code.toUpperCase(),
      subject,
      htmlContent,
      variables: variables || [],
      category: category || 'custom',
      isPredefined: false
    });

    await template.save();

    await logChange({
      userId: req.user._id,
      workspaceId,
      action: 'create',
      entity: 'email_template',
      entityId: template._id,
      details: { name, code },
      ipAddress: getClientIP(req)
    });

    res.status(201).json({ success: true, template });
  } catch (error) {
    console.error('Create template error:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Template code already exists' });
    } else {
      res.status(500).json({ message: 'Failed to create template' });
    }
  }
});

// Update email template
router.put('/:id', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const { name, subject, htmlContent, variables, isActive } = req.body;
    const workspaceId = req.context?.workspaceId || req.user.workspaceId;

    const template = await EmailTemplate.findOne({ 
      _id: req.params.id, 
      workspaceId 
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (template.isPredefined) {
      return res.status(403).json({ message: 'Cannot modify predefined templates' });
    }

    template.name = name || template.name;
    template.subject = subject || template.subject;
    template.htmlContent = htmlContent || template.htmlContent;
    template.variables = variables || template.variables;
    template.isActive = isActive !== undefined ? isActive : template.isActive;

    await template.save();

    await logChange({
      userId: req.user._id,
      workspaceId,
      action: 'update',
      entity: 'email_template',
      entityId: template._id,
      details: { name },
      ipAddress: getClientIP(req)
    });

    res.json({ success: true, template });
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ message: 'Failed to update template' });
  }
});

// Delete email template
router.delete('/:id', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const workspaceId = req.context?.workspaceId || req.user.workspaceId;

    const template = await EmailTemplate.findOne({ 
      _id: req.params.id, 
      workspaceId 
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (template.isPredefined) {
      return res.status(403).json({ message: 'Cannot delete predefined templates' });
    }

    await template.deleteOne();

    await logChange({
      userId: req.user._id,
      workspaceId,
      action: 'delete',
      entity: 'email_template',
      entityId: template._id,
      details: { name: template.name },
      ipAddress: getClientIP(req)
    });

    res.json({ success: true, message: 'Template deleted' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ message: 'Failed to delete template' });
  }
});

// Send test email
router.post('/test', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const { to, subject, htmlContent } = req.body;
    const workspaceId = req.context?.workspaceId || req.user.workspaceId;

    if (!to || !subject || !htmlContent) {
      return res.status(400).json({ message: 'Recipient, subject, and content are required' });
    }

    const result = await sendEmail(to, subject, htmlContent);

    if (result.success) {
      await logChange({
        userId: req.user._id,
        workspaceId,
        action: 'send',
        entity: 'email',
        details: { type: 'test', to, subject },
        ipAddress: getClientIP(req)
      });

      res.json({ success: true, message: 'Test email sent successfully', result });
    } else {
      res.status(500).json({ message: 'Failed to send test email', error: result.error });
    }
  } catch (error) {
    console.error('Send test email error:', error);
    res.status(500).json({ message: 'Failed to send test email' });
  }
});

// Send email to users
router.post('/send', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const { recipients, subject, htmlContent, templateId } = req.body;
    const workspaceId = req.context?.workspaceId || req.user.workspaceId;

    if (!recipients || !subject || !htmlContent) {
      return res.status(400).json({ message: 'Recipients, subject, and content are required' });
    }

    // Get recipient emails
    let recipientEmails = [];
    if (recipients === 'all') {
      const users = await User.find({ workspaceId, isActive: true }).select('email full_name');
      recipientEmails = users.map(user => ({ email: user.email, name: user.full_name }));
    } else if (recipients === 'active') {
      const users = await User.find({ workspaceId, isActive: true, role: { $ne: 'member' } }).select('email full_name');
      recipientEmails = users.map(user => ({ email: user.email, name: user.full_name }));
    } else if (recipients === 'hr') {
      const users = await User.find({ workspaceId, role: 'hr' }).select('email full_name');
      recipientEmails = users.map(user => ({ email: user.email, name: user.full_name }));
    }

    if (recipientEmails.length === 0) {
      return res.status(400).json({ message: 'No valid recipients found' });
    }

    const result = await sendEmail(recipientEmails, subject, htmlContent);

    if (result.success) {
      await logChange({
        userId: req.user._id,
        workspaceId,
        action: 'send',
        entity: 'email',
        details: { type: 'bulk', recipients: recipients, count: recipientEmails.length, subject },
        ipAddress: getClientIP(req)
      });

      res.json({
        success: true,
        message: `Email sent to ${recipientEmails.length} recipients`,
        result
      });
    } else {
      res.status(500).json({ message: 'Failed to send emails', error: result.error });
    }
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ message: 'Failed to send emails' });
  }
});

// Get email configuration status
router.get('/config', authenticate, checkRole(['admin', 'hr']), async (req, res) => {
  try {
    const config = {
      brevoConfigured: !!process.env.BREVO_API_KEY,
      senderEmail: process.env.BREVO_SENDER_EMAIL || 'updates.codecatalyst@gmail.com',
      senderName: process.env.BREVO_SENDER_NAME || 'TaskFlow'
    };

    res.json({ success: true, config });
  } catch (error) {
    console.error('Get email config error:', error);
    res.status(500).json({ message: 'Failed to get email configuration' });
  }
});

export default router;
