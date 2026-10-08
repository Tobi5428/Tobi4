import { useEffect, useState } from 'react';
import { fetchNotifications, sendNotification } from './api';
import './Notifications.css';

const Notifications = () => {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    customerName: '',
    customerEmail: '',
    notifyMe: true,
    notifyCustomer: true,
  });
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setListLoading(true);
    try {
      const response = await fetchNotifications();
      setNotifications(Array.isArray(response?.data) ? response.data : []);
    } catch (err) {
      setError(err.message || 'Unable to load notifications.');
    } finally {
      setListLoading(false);
    }
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setWarnings([]);

    if (!formData.title.trim() || !formData.message.trim()) {
      setError('Title and message are required.');
      return;
    }

    if (!formData.notifyMe && !formData.notifyCustomer) {
      setError('Select at least one recipient.');
      return;
    }

    if (formData.notifyCustomer && !formData.customerEmail.trim()) {
      setError('Customer email is required when notifying a customer.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        title: formData.title.trim(),
        message: formData.message.trim(),
        customerName: formData.customerName.trim(),
        customerEmail: formData.customerEmail.trim().toLowerCase(),
      };

      const response = await sendNotification(payload);
      setSuccess(response?.message || 'Notification sent successfully.');
      setWarnings(Array.isArray(response?.warnings) ? response.warnings : []);

      setFormData((prev) => ({
        ...prev,
        title: '',
        message: '',
      }));

      await loadNotifications();
    } catch (err) {
      setError(err.message || 'Unable to send notification.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="notifications-page">
      <div className="notifications-shell">
        <header className="notifications-header">
          <h2>Notifications Center</h2>
          <p>Send updates to yourself and your customer from one place.</p>
        </header>

        <section className="notifications-card">
          <h3>Send Notification</h3>

          {error && <div className="notif-alert notif-alert-error">{error}</div>}
          {success && <div className="notif-alert notif-alert-success">{success}</div>}
          {warnings.length > 0 && (
            <div className="notif-alert notif-alert-warn">
              {warnings.map((warning, index) => (
                <p key={index}>{warning}</p>
              ))}
            </div>
          )}

          <form className="notif-form" onSubmit={handleSubmit}>
            <label>
              Title
              <input
                type="text"
                name="title"
                placeholder="Transaction update"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Message
              <textarea
                name="message"
                placeholder="Write the notification message here"
                rows={4}
                value={formData.message}
                onChange={handleChange}
                required
              />
            </label>

            <div className="notif-grid">
              <label>
                Customer Name (optional)
                <input
                  type="text"
                  name="customerName"
                  placeholder="Customer name"
                  value={formData.customerName}
                  onChange={handleChange}
                />
              </label>

              <label>
                Customer Email
                <input
                  type="email"
                  name="customerEmail"
                  placeholder="customer@example.com"
                  value={formData.customerEmail}
                  onChange={handleChange}
                  disabled={!formData.notifyCustomer}
                />
              </label>
            </div>

            <div className="notif-toggles">
              <label className="toggle-item">
                <input
                  type="checkbox"
                  name="notifyMe"
                  checked={formData.notifyMe}
                  onChange={handleChange}
                />
                Notify Me (in-app)
              </label>

              <label className="toggle-item">
                <input
                  type="checkbox"
                  name="notifyCustomer"
                  checked={formData.notifyCustomer}
                  onChange={handleChange}
                />
                Notify Customer (email)
              </label>
            </div>

            <button className="notif-submit" type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send Notification'}
            </button>
          </form>
        </section>

        <section className="notifications-card">
          <h3>Recent Notifications</h3>
          {listLoading ? (
            <p className="notif-empty">Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <p className="notif-empty">No notifications yet.</p>
          ) : (
            <div className="notif-list">
              {notifications.map((item) => (
                <article key={item.id} className="notif-item">
                  <div className="notif-item-top">
                    <h4>{item.title}</h4>
                    <span className={`notif-badge notif-status-${item.status}`}>{item.status}</span>
                  </div>
                  <p>{item.message}</p>
                  <div className="notif-meta">
                    <span>Recipient: {item.recipientType}</span>
                    <span>Channel: {item.channel}</span>
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Notifications;
