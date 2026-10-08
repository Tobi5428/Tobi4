import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginBusiness } from './businessAuth';
import './BusinessSignup.css'; // reuses the same styling
import logo from '../assets/jega-logo.jpeg';

function BusinessLogin() {
  const OTP_CHALLENGE_STORAGE_KEY = 'pendingLoginChallenge';
  const [formData, setFormData] = useState({ businessEmail: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    localStorage.removeItem('token');
    sessionStorage.removeItem(OTP_CHALLENGE_STORAGE_KEY);

    try {
      const data = await loginBusiness(formData);
      if (data?.verificationRequired) {
        navigate('/verify-login-otp', { state: { challenge: data } });
        return;
      }

      if (data?.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user || {}));
        navigate('/dashboard');
        return;
      }

      setError('Login failed. Please try again.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="biz-signup-page">
      <div className="biz-signup-shell">
        <aside className="biz-signup-brand">
          <div className="biz-brand-header">
            <img src={logo} alt="JEGA logo" className="biz-brand-logo" />
            <span className="biz-brand-title">JEGA</span>
          </div>
          <p className="biz-kicker">Business Access</p>
          <h1>Securely manage your business from one dashboard.</h1>
          <p>Monitor payments, cards, transfers, and account activity without leaving your workspace.</p>
        </aside>

        <section className="biz-signup-card">
          <div className="biz-logo-wrap">
            <img src={logo} alt="JEGA logo" className="biz-logo" />
          </div>
          <h3>Log in to your business account</h3>
          <p className="biz-subtitle">Welcome back to JEGA.</p>

          {error && <div className="biz-alert biz-alert-error">{error}</div>}

          <form className="biz-form" onSubmit={handleSubmit} noValidate>
            <div>
              <label className="biz-label">Business Email</label>
              <input
                type="email"
                name="businessEmail"
                className="biz-input"
                value={formData.businessEmail}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="biz-label">Password</label>
              <input
                type="password"
                name="password"
                className="biz-input"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit" className="biz-submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Log In'}
            </button>

            <p className="biz-link-row">
              No business account yet? <Link to="/business-signup">Sign up</Link>
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}

export default BusinessLogin;