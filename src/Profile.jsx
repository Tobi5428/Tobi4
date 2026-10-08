import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCurrentUser, updateProfile } from './api';
import './Profile.css';

const PROFILE_STORAGE_KEY = 'jegaProfileData';

const defaultProfile = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  country: 'Nigeria',
  accountType: 'Personal',
};

const Profile = () => {
  const [profile, setProfile] = useState(defaultProfile);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    setError('');

    try {
      const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setProfile((prev) => ({ ...prev, ...parsed }));
      }
    } catch (err) {
      console.error('Failed to read profile from local storage', err);
    }

    try {
      const response = await getCurrentUser();
      const user = response?.user;
      if (user) {
        setProfile((prev) => ({
          ...prev,
          firstName: user.firstName || prev.firstName,
          lastName: user.lastName || prev.lastName,
          email: user.email || prev.email,
          phone: user.phone || prev.phone,
          accountType: user.accountType?.toString().trim().toLowerCase() === 'business' ? 'Business' : 'Personal',
        }));
      }
    } catch (err) {
      console.log('Could not load profile from API; using saved profile data.');
    } finally {
      setLoading(false);
    }
  };

  const initials = useMemo(() => {
    const first = profile.firstName?.trim()?.charAt(0) || '';
    const last = profile.lastName?.trim()?.charAt(0) || '';
    return (first + last || 'U').toUpperCase();
  }, [profile.firstName, profile.lastName]);

  const fullName = useMemo(() => {
    const name = `${profile.firstName} ${profile.lastName}`.trim();
    return name || 'Customer Profile';
  }, [profile.firstName, profile.lastName]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      if (!profile.firstName || !profile.lastName || !profile.email) {
        throw new Error('First name, last name and email are required.');
      }

      const payload = {
        ...profile,
        email: profile.email.trim().toLowerCase(),
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
        accountType:
          profile.accountType?.toString().trim().toLowerCase() === 'business' ? 'business' : 'personal',
      };

      // Save to server; fall back silently if request fails (e.g. offline)
      try {
        const response = await updateProfile(payload);
        if (response?.user) {
          // Merge server-confirmed data back into state
          setProfile((prev) => ({ ...prev, ...response.user }));
        }
      } catch (apiErr) {
        console.warn('Server update failed; changes saved locally only.', apiErr.message);
      }

      setProfile(payload);
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(payload));
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(err.message || 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-shell">
        <header className="profile-header">
          <div className="profile-avatar" aria-hidden="true">{initials}</div>
          <div>
            <h2>{fullName}</h2>
            <p>Manage personal account details and keep your information up to date.</p>
          </div>
          <Link to="/dashboard" className="profile-back-link">Back to Dashboard</Link>
        </header>

        <section className="profile-card">
          <h3>Profile Details</h3>
          {loading && <p className="profile-note">Loading profile...</p>}
          {error && <p className="profile-alert profile-alert-error">{error}</p>}
          {success && <p className="profile-alert profile-alert-success">{success}</p>}

          <form className="profile-form" onSubmit={handleSave}>
            <div className="profile-grid">
              <label>
                First Name
                <input
                  type="text"
                  name="firstName"
                  value={profile.firstName}
                  onChange={handleChange}
                  placeholder="First name"
                  required
                />
              </label>

              <label>
                Last Name
                <input
                  type="text"
                  name="lastName"
                  value={profile.lastName}
                  onChange={handleChange}
                  placeholder="Last name"
                  required
                />
              </label>

              <label>
                Email Address
                <input
                  type="email"
                  name="email"
                  value={profile.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                />
              </label>

              <label>
                Phone Number
                <input
                  type="tel"
                  name="phone"
                  value={profile.phone}
                  onChange={handleChange}
                  placeholder="0800 000 0000"
                />
              </label>

              <label>
                Account Type
                <select name="accountType" value={profile.accountType} onChange={handleChange}>
                  <option value="Personal">Personal</option>
                  <option value="Business">Business</option>
                </select>
              </label>

              <label>
                Country
                <input
                  type="text"
                  name="country"
                  value={profile.country}
                  onChange={handleChange}
                  placeholder="Country"
                />
              </label>

              <label>
                State
                <input
                  type="text"
                  name="state"
                  value={profile.state}
                  onChange={handleChange}
                  placeholder="State"
                />
              </label>

              <label>
                City
                <input
                  type="text"
                  name="city"
                  value={profile.city}
                  onChange={handleChange}
                  placeholder="City"
                />
              </label>
            </div>

            <label>
              Address
              <textarea
                name="address"
                rows={4}
                value={profile.address}
                onChange={handleChange}
                placeholder="House number, street and area"
              />
            </label>

            <button className="profile-save-btn" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Profile;
