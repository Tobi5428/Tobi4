import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCurrentUser, setUsername } from './api';
import './Username.css';

const MIN = 3;
const MAX = 20;
const VALID = /^[a-zA-Z0-9_]+$/;
const STORAGE_KEY = 'jegaUsername';

const Username = () => {
  const [username, setUsernameVal] = useState('');
  const [current, setCurrent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadCurrent();
  }, []);

  const loadCurrent = async () => {
    setLoading(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setCurrent(saved);
      const res = await getCurrentUser();
      if (res?.user?.username) {
        setCurrent(res.user.username);
        localStorage.setItem(STORAGE_KEY, res.user.username);
      }
    } catch {
      // use local value as fallback
    } finally {
      setLoading(false);
    }
  };

  const validate = (val) => {
    if (!val) return 'Username is required.';
    if (val.length < MIN) return `Username must be at least ${MIN} characters.`;
    if (val.length > MAX) return `Username must be no more than ${MAX} characters.`;
    if (!VALID.test(val)) return 'Only letters, numbers, and underscores are allowed.';
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const trimmed = username.trim();
    const validationError = validate(trimmed);
    if (validationError) { setError(validationError); return; }

    setSaving(true);
    try {
      await setUsername(trimmed);
      setCurrent(trimmed);
      localStorage.setItem(STORAGE_KEY, trimmed);
      setSuccess('Username set successfully.');
      setUsernameVal('');
    } catch (err) {
      setError(err.message || 'Could not update username.');
    } finally {
      setSaving(false);
    }
  };

  const remaining = MAX - username.length;

  return (
    <div className="username-page">
      <div className="username-shell">
        <header className="username-header">
          <div>
            <h2>Set Username</h2>
            <p>Choose a unique username to personalise your JEGA account.</p>
          </div>
          <Link to="/settings" className="username-back-link">Back to Settings</Link>
        </header>

        {current && !loading && (
          <div className="username-current">
            Current username: <strong>@{current}</strong>
          </div>
        )}

        <section className="username-card">
          <h3>{current ? 'Change Username' : 'Create Username'}</h3>

          {error   && <p className="username-alert username-alert-error">{error}</p>}
          {success && <p className="username-alert username-alert-success">{success}</p>}

          <form className="username-form" onSubmit={handleSubmit}>
            <label htmlFor="username-input">
              Username
              <div className="username-input-wrap">
                <span className="username-prefix">@</span>
                <input
                  id="username-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsernameVal(e.target.value.replace(/\s/g, ''))}
                  placeholder="e.g. john_doe123"
                  maxLength={MAX}
                  autoComplete="username"
                  spellCheck={false}
                />
              </div>
              <span className={`username-counter${remaining < 5 ? ' warn' : ''}`}>
                {remaining} characters left
              </span>
            </label>

            <ul className="username-rules">
              <li className={username.length >= MIN ? 'rule-ok' : ''}>At least {MIN} characters</li>
              <li className={username.length <= MAX && username.length > 0 ? 'rule-ok' : ''}>No more than {MAX} characters</li>
              <li className={VALID.test(username) && username.length > 0 ? 'rule-ok' : ''}>Letters, numbers, and underscores only</li>
            </ul>

            <button className="username-save-btn" type="submit" disabled={saving || loading}>
              {saving ? 'Saving...' : current ? 'Update Username' : 'Set Username'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Username;