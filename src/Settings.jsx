import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword, getCurrentUser, requestEmailChange } from './api';
import './Settings.css';

const SETTINGS_STORAGE_KEY = 'jegaAccountSettings';

const defaultSettings = {
  profile: {
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    timezone: 'Africa/Lagos',
    currency: 'NGN',
  },
  preferences: {
    emailAlerts: true,
    smsAlerts: false,
    marketingEmails: false,
    twoFactorAuth: false,
    sessionTimeout: '30',
  },
};

const Settings = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [newEmail, setNewEmail] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [prefsMessage, setPrefsMessage] = useState('');
  const [securityMessage, setSecurityMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setError('');

    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings((prev) => ({
          ...prev,
          ...parsed,
          profile: { ...prev.profile, ...parsed.profile },
          preferences: { ...prev.preferences, ...parsed.preferences },
        }));
      }
    } catch (err) {
      console.error('Failed to load settings from local storage', err);
    }

    try {
      const response = await getCurrentUser();
      const user = response?.user;

      if (user) {
        setSettings((prev) => ({
          ...prev,
          profile: {
            ...prev.profile,
            firstName: user.firstName || prev.profile.firstName,
            lastName: user.lastName || prev.profile.lastName,
            phone: user.phone || prev.profile.phone,
            email: user.email || prev.profile.email,
          },
        }));
      }
    } catch (err) {
      // Settings still works with local defaults when user endpoint is unavailable.
      console.log('Unable to load current user profile from API');
    }
  };

  const persistSettings = (nextSettings) => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
  };

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setSettings((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        [name]: value,
      },
    }));
  };

  const handlePreferenceChange = (event) => {
    const { name, type, checked, value } = event.target;
    setSettings((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [name]: type === 'checkbox' ? checked : value,
      },
    }));
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setProfileMessage('');
    setError('');
    setProfileLoading(true);

    try {
      if (!settings.profile.firstName || !settings.profile.lastName || !settings.profile.email) {
        throw new Error('First name, last name, and email are required.');
      }

      const nextSettings = {
        ...settings,
        profile: {
          ...settings.profile,
          email: settings.profile.email.trim().toLowerCase(),
        },
      };

      setSettings(nextSettings);
      persistSettings(nextSettings);
      setProfileMessage('Profile settings saved successfully.');
    } catch (err) {
      setError(err.message || 'Could not save profile settings.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSavePreferences = async (event) => {
    event.preventDefault();
    setPrefsMessage('');
    setError('');
    setPrefsLoading(true);

    try {
      const nextSettings = {
        ...settings,
        preferences: {
          ...settings.preferences,
        },
      };

      persistSettings(nextSettings);
      setPrefsMessage('Notification and security preferences updated.');
    } catch (err) {
      setError(err.message || 'Could not update preferences.');
    } finally {
      setPrefsLoading(false);
    }
  };

  const handleRequestEmailChange = async (event) => {
    event.preventDefault();
    setSecurityMessage('');
    setError('');
    setSecurityLoading(true);

    try {
      if (!settings.profile.email || !newEmail) {
        throw new Error('Current email and new email are required.');
      }

      if (settings.profile.email.toLowerCase() === newEmail.trim().toLowerCase()) {
        throw new Error('New email must be different from your current email.');
      }

      const response = await requestEmailChange({
        currentEmail: settings.profile.email,
        newEmail: newEmail.trim().toLowerCase(),
      });

      setSecurityMessage(response?.message || 'Confirmation sent to your new email address.');
      setNewEmail('');
    } catch (err) {
      setError(err.message || 'Could not request email change.');
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleSendPasswordReset = async () => {
    setSecurityMessage('');
    setError('');
    setSecurityLoading(true);

    try {
      if (!settings.profile.email) {
        throw new Error('Add your account email before requesting a password reset.');
      }

      const response = await forgotPassword(settings.profile.email);
      setSecurityMessage(response?.message || 'Password reset instructions sent successfully.');
    } catch (err) {
      setError(err.message || 'Could not send password reset email.');
    } finally {
      setSecurityLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-shell">
        <div className="settings-header">
          <h2>Account Settings</h2>
          <p>Manage your profile, notification preferences, and account security in one place.</p>
          <Link to="/dashboard" className="settings-back-link">Back to Dashboard</Link>
        </div>

        {error && <div className="settings-alert settings-alert-error">{error}</div>}

        <section className="settings-card">
          <h3>Profile Details</h3>
          <form onSubmit={handleSaveProfile} className="settings-form">
            <div className="settings-grid">
              <label>
                First Name
                <input
                  type="text"
                  name="firstName"
                  value={settings.profile.firstName}
                  onChange={handleProfileChange}
                  placeholder="First name"
                />
              </label>
              <label>
                Last Name
                <input
                  type="text"
                  name="lastName"
                  value={settings.profile.lastName}
                  onChange={handleProfileChange}
                  placeholder="Last name"
                />
              </label>
              <label>
                Phone Number
                <input
                  type="tel"
                  name="phone"
                  value={settings.profile.phone}
                  onChange={handleProfileChange}
                  placeholder="0800 000 0000"
                />
              </label>
              <label>
                Email Address
                <input
                  type="email"
                  name="email"
                  value={settings.profile.email}
                  onChange={handleProfileChange}
                  placeholder="you@example.com"
                />
              </label>
              <label>
                Timezone
                <select name="timezone" value={settings.profile.timezone} onChange={handleProfileChange}>
                  <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                </select>
              </label>
              <label>
                Default Currency
                <select name="currency" value={settings.profile.currency} onChange={handleProfileChange}>
                  <option value="NGN">Nigerian Naira (NGN)</option>
                  <option value="USD">US Dollar (USD)</option>
                  <option value="GBP">British Pound (GBP)</option>
                </select>
              </label>
            </div>

            {profileMessage && <p className="settings-alert settings-alert-success">{profileMessage}</p>}

            <button type="submit" className="settings-btn settings-btn-primary" disabled={profileLoading}>
              {profileLoading ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </section>

        <section className="settings-card">
          <h3>Preferences</h3>
          <form onSubmit={handleSavePreferences} className="settings-form">
            <div className="toggle-list">
              <label className="toggle-item">
                <span>Email transaction alerts</span>
                <input
                  type="checkbox"
                  name="emailAlerts"
                  checked={settings.preferences.emailAlerts}
                  onChange={handlePreferenceChange}
                />
              </label>
              <label className="toggle-item">
                <span>SMS transaction alerts</span>
                <input
                  type="checkbox"
                  name="smsAlerts"
                  checked={settings.preferences.smsAlerts}
                  onChange={handlePreferenceChange}
                />
              </label>
              <label className="toggle-item">
                <span>Marketing emails</span>
                <input
                  type="checkbox"
                  name="marketingEmails"
                  checked={settings.preferences.marketingEmails}
                  onChange={handlePreferenceChange}
                />
              </label>
              <label className="toggle-item">
                <span>Two-factor authentication</span>
                <input
                  type="checkbox"
                  name="twoFactorAuth"
                  checked={settings.preferences.twoFactorAuth}
                  onChange={handlePreferenceChange}
                />
              </label>
              <label className="timeout-field">
                <span>Auto logout after</span>
                <select
                  name="sessionTimeout"
                  value={settings.preferences.sessionTimeout}
                  onChange={handlePreferenceChange}
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
              </label>
            </div>

            {prefsMessage && <p className="settings-alert settings-alert-success">{prefsMessage}</p>}

            <button type="submit" className="settings-btn settings-btn-primary" disabled={prefsLoading}>
              {prefsLoading ? 'Saving...' : 'Save Preferences'}
            </button>
          </form>
        </section>

        <section className="settings-card">
          <h3>Security</h3>
          <p className="settings-note">Update sensitive account details through verified email actions.</p>

          <form onSubmit={handleRequestEmailChange} className="settings-form security-form">
            <label>
              New Email Address
              <input
                type="email"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                placeholder="new-email@example.com"
              />
            </label>
            <button type="submit" className="settings-btn settings-btn-secondary" disabled={securityLoading}>
              {securityLoading ? 'Please wait...' : 'Request Email Change'}
            </button>
          </form>

          <button
            type="button"
            onClick={handleSendPasswordReset}
            className="settings-btn settings-btn-outline"
            disabled={securityLoading}
          >
            {securityLoading ? 'Please wait...' : 'Send Password Reset Link'}
          </button>

          {securityMessage && <p className="settings-alert settings-alert-success">{securityMessage}</p>}
        </section>
      </div>
    </div>
  );
};

export default Settings;
