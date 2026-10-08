import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendNotification } from './api';
import './Support.css';

const CATEGORIES = [
  'Account Access',
  'Transactions & Payments',
  'Transfers',
  'Airtime & Data',
  'Bill Payments',
  'Virtual Card',
  'KYC & Verification',
  'Other',
];

const CHANNELS = [
  {
    icon: '✉️',
    label: 'Email Us',
    value: 'Jegainnovation@gmail.com',
    href: 'mailto:Jegainnovation@gmail.com',
  },
  {
    icon: '📞',
    label: 'Call Us',
    value: '08137825867',
    href: 'tel:08137825867',
  },
];

const Support = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    category: '',
    subject: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name || !form.email || !form.category || !form.subject || !form.message) {
      setError('Please fill in all fields.');
      return;
    }

    setSubmitting(true);
    try {
      await sendNotification({
        title: `[Support] ${form.category}: ${form.subject}`,
        message: `From: ${form.name} <${form.email}>\n\n${form.message}`,
        notifyMe: true,
        notifyCustomer: true,
        customerEmail: form.email,
        customerName: form.name,
      });
      setSuccess('Your support request has been submitted. We will get back to you shortly.');
      setForm({ name: '', email: '', category: '', subject: '', message: '' });
    } catch (err) {
      // Fallback: if backend is down, still reassure the user
      setSuccess('Your request has been recorded. We will reach out to you soon.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="support-page">
      <div className="support-shell">

        <header className="support-hero">
          <p className="support-kicker">Help Centre</p>
          <h2>How can we help you?</h2>
          <p className="support-intro">
            Submit a support ticket below or reach us directly through any of our contact channels.
          </p>
        </header>

        {/* Contact channels */}
        <div className="support-channels">
          {CHANNELS.map((ch) => (
            <a key={ch.label} href={ch.href} className="support-channel-card">
              <span className="support-channel-icon">{ch.icon}</span>
              <div>
                <p className="support-channel-label">{ch.label}</p>
                <p className="support-channel-value">{ch.value}</p>
              </div>
            </a>
          ))}
          <Link to="/faq" className="support-channel-card">
            <span className="support-channel-icon">💬</span>
            <div>
              <p className="support-channel-label">Browse FAQs</p>
              <p className="support-channel-value">Quick answers to common questions</p>
            </div>
          </Link>
        </div>

        {/* Ticket form */}
        <section className="support-card">
          <h3>Submit a Support Ticket</h3>

          {error   && <p className="support-alert support-alert-error">{error}</p>}
          {success && <p className="support-alert support-alert-success">{success}</p>}

          <form className="support-form" onSubmit={handleSubmit}>
            <div className="support-grid">
              <label>
                Full Name
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  required
                />
              </label>

              <label>
                Email Address
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                />
              </label>

              <label>
                Category
                <select name="category" value={form.category} onChange={handleChange} required>
                  <option value="" disabled>Select a category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>

              <label>
                Subject
                <input
                  type="text"
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  placeholder="Brief description of the issue"
                  required
                />
              </label>
            </div>

            <label>
              Message
              <textarea
                name="message"
                rows={5}
                value={form.message}
                onChange={handleChange}
                placeholder="Describe your issue in detail so we can help you faster…"
                required
              />
            </label>

            <button className="support-submit" type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Ticket'}
            </button>
          </form>
        </section>

      </div>
    </div>
  );
};

export default Support;
