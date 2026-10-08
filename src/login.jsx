import React, { useState } from 'react';
import { loginUser } from './api';
import { Link, useNavigate } from 'react-router-dom';
import './AuthPages.css';
import logo from './assets/jega-logo.jpeg';

const OTP_CHALLENGE_STORAGE_KEY = 'pendingLoginChallenge';

function Login() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setCredentials((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    // Force OTP step for each new login attempt.
    localStorage.removeItem('token');
    sessionStorage.removeItem(OTP_CHALLENGE_STORAGE_KEY);

    try {
      const result = await loginUser({
        email: credentials.email,
        password: credentials.password,
      });

      if (result?.verificationRequired) {
        sessionStorage.setItem(OTP_CHALLENGE_STORAGE_KEY, JSON.stringify(result));
        navigate('/verify-login-otp', { state: { challenge: result } });
        return;
      }

      if (result?.token) {
        navigate('/dashboard');
      }
    } catch (err) {
      const message =
        typeof err === 'string'
          ? err
          : err?.message || err?.error || 'Login failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <aside className="auth-brand-pane">
          <div>
            <h1>JEGA</h1>
            <h2>Welcome back to your smarter banking hub.</h2>
            <p>Log in to manage transfers, bills, and account activity in one secure place.</p>
          </div>
          <Link to="/" className="auth-home-link">Back to Landing Page</Link>
        </aside>

        <section className="auth-form-pane">
          <div className="auth-top-logo-wrap">
            <img src={logo} alt="JEGA logo" className="auth-top-logo" />
          </div>
          <p className="auth-kicker">Account Access</p>
          <h3>Login</h3>
          <p className="auth-subtitle">Continue where you left off.</p>

          {error && <p className="auth-error">{error}</p>}

          <form className="auth-form" onSubmit={handleSubmit} autoComplete="on">
            <input
              type="text"
              name="email"
              placeholder="Email or username"
              value={credentials.email}
              onChange={handleChange}
              required
              autoComplete="Email"
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={credentials.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />
            <button className="auth-submit" type="submit" disabled={loading}>{loading ? 'Checking...' : 'Login'}</button>
            <p className="auth-forgot-link">
              <Link to="/forgot-password">Forgot Password?</Link>
            </p>
          </form>

          <p className="auth-switch">
            New here? <Link to="/signup">Create an account</Link>
          </p>
        </section>
      </div>
    </div>
  );
}

export default Login;
