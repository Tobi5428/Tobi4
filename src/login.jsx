import React, { useState } from 'react';
import { loginUser } from './api';
import { Link, useNavigate } from 'react-router-dom';
import './AuthPages.css';

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

    try {
      await loginUser(credentials);
      navigate('/dashboard');
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
          <p className="auth-kicker">Account Access</p>
          <h3>Login</h3>
          <p className="auth-subtitle">Continue where you left off.</p>

          {error && <p className="auth-error">{error}</p>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <input
              type="email"
              name="email"
              placeholder="Email address"
              value={credentials.email}
              onChange={handleChange}
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={credentials.password}
              onChange={handleChange}
              required
            />
            <button className="auth-submit" type="submit">Login</button>
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
