const express = require('express');
const { sendMail } = require('../mailer');

const router = express.Router();

// In-memory store for demo usage. Replace with database in production.
const notifications = [];

const hasEmailConfig = () => {
  return Boolean(process.env.SMTP_HOST && process.env.FROM_EMAIL);
};

const createNotification = ({ title, message, recipientType, channel, status, email }) => {
  const item = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title,
    message,
    recipientType,
    channel,
    status,
    email: email || null,
    createdAt: new Date().toISOString(),
  };

  notifications.unshift(item);
  return item;
};

router.get('/', (req, res) => {
  const limit = Number(req.query.limit) || 50;
  return res.json({
    success: true,
    data: notifications.slice(0, Math.max(1, Math.min(limit, 200))),
  });
});

router.post('/send', async (req, res) => {
  const {
    title,
    message,
    customerEmail,
    customerName,
    notifyMe = true,
    notifyCustomer = true,
  } = req.body || {};

  if (!title || !message) {
    return res.status(400).json({ success: false, message: 'Title and message are required.' });
  }

  if (!notifyMe && !notifyCustomer) {
    return res.status(400).json({ success: false, message: 'Select at least one recipient.' });
  }

  if (notifyCustomer && !customerEmail) {
    return res.status(400).json({ success: false, message: 'Customer email is required to notify customer.' });
  }

  const created = [];
  const warnings = [];

  if (notifyMe) {
    created.push(
      createNotification({
        title,
        message,
        recipientType: 'me',
        channel: 'in-app',
        status: 'sent',
      })
    );
  }

  if (notifyCustomer) {
    if (!hasEmailConfig()) {
      created.push(
        createNotification({
          title,
          message,
          recipientType: 'customer',
          channel: 'email',
          status: 'queued',
          email: customerEmail,
        })
      );
      warnings.push('SMTP is not configured. Customer email notification was queued but not sent.');
    } else {
      try {
        await sendMail({
          to: customerEmail,
          subject: title,
          text: message,
          html: `<p>Hello${customerName ? ` ${customerName}` : ''},</p><p>${message}</p>`,
        });

        created.push(
          createNotification({
            title,
            message,
            recipientType: 'customer',
            channel: 'email',
            status: 'sent',
            email: customerEmail,
          })
        );
      } catch (err) {
        console.error('Customer notification email error:', err);
        created.push(
          createNotification({
            title,
            message,
            recipientType: 'customer',
            channel: 'email',
            status: 'failed',
            email: customerEmail,
          })
        );
        warnings.push('Customer email failed to send. Check SMTP settings.');
      }
    }
  }

  const responseMessage = warnings.length
    ? 'Notification saved with warning(s).'
    : 'Notification sent successfully.';

  return res.json({
    success: true,
    message: responseMessage,
    warnings,
    data: created,
  });
});

module.exports = router;
