import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from './api';
import './AuthPages.css';
import logo from './assets/jega-logo.jpeg';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await forgotPassword(email);
      const msg = response?.message || 'If an account exists, a reset link has been sent.';
      const devLink = response?.resetLink ? `\n\nDev reset link: ${response.resetLink}` : '';
      setSuccess(msg + devLink);
    } catch (err) {
      setError(err.message || 'Unable to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-page">
      <section className="forgot-password-card" aria-labelledby="forgot-password-title">
        <div className="forgot-logo-wrap">
          <img src={logo} alt="JEGA logo" className="forgot-logo" />
        </div>

        <p className="forgot-kicker">Password Recovery</p>
        <h2 id="forgot-password-title">Forgot Password</h2>
        <p className="forgot-subtitle">Enter your email and we will send you instructions to reset your password.</p>

        {error && <p className="auth-error">{error}</p>}
        {success && <p className="forgot-success">{success}</p>}

        <form className="forgot-form" onSubmit={handleSubmit} autoComplete="on">
          <label htmlFor="forgot-email" className="forgot-label">Email Address</label>
          <input
            id="forgot-email"
            type="email"
            name="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />
          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="forgot-link-row">
          Remembered your password? <Link to="/login">Login</Link>
        </p>
        <p className="forgot-link-row">
          <Link to="/">Back to Landing Page</Link>
        </p>
      </section>
    </div>
  );
};

export default ForgotPassword;
