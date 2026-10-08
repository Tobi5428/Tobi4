import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPassword } from './api';
import './AuthPages.css';
import logo from './assets/jega-logo.jpeg';

const ResetPassword = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const email = params.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isLinkValid = Boolean(token && email);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!isLinkValid) {
      setError('Invalid reset link. Request a new password reset link.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await resetPassword({ token, email, password });
      setSuccess(response?.message || 'Password updated successfully. You can now log in.');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Unable to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-page">
      <section className="forgot-password-card" aria-labelledby="reset-password-title">
        <div className="forgot-logo-wrap">
          <img src={logo} alt="JEGA logo" className="forgot-logo" />
        </div>

        <p className="forgot-kicker">Account Security</p>
        <h2 id="reset-password-title">Reset Password</h2>
        <p className="forgot-subtitle">Create a new password for your account.</p>

        {!isLinkValid && <p className="auth-error">Invalid or incomplete link. Request a fresh reset link.</p>}
        {error && <p className="auth-error">{error}</p>}
        {success && <p className="forgot-success">{success}</p>}

        <form className="forgot-form" onSubmit={handleSubmit} autoComplete="on">
          <label htmlFor="reset-password" className="forgot-label">New Password</label>
          <input
            id="reset-password"
            type="password"
            name="password"
            placeholder="Enter new password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
            autoComplete="new-password"
          />

          <label htmlFor="reset-confirm-password" className="forgot-label">Confirm Password</label>
          <input
            id="reset-confirm-password"
            type="password"
            name="confirmPassword"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            minLength={8}
            required
            autoComplete="new-password"
          />

          <button className="auth-submit" type="submit" disabled={loading || !isLinkValid}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>

        <p className="forgot-link-row">
          Back to <Link to="/login">Login</Link>
        </p>
      </section>
    </div>
  );
};

export default ResetPassword;
