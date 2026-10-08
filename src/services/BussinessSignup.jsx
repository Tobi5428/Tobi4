import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signupBusiness } from './businessAuth';
import { executeRecaptcha } from '../recaptchaV3';
import './BusinessSignup.css';
import logo from '../assets/jega-logo.jpeg';

const initialState = {
  businessName: '',
  rcNumber: '',
  businessEmail: '',
  phone: '',
  password: '',
  confirmPassword: '',
  businessType: 'Sole Proprietor',
};

function BusinessSignup() {
  const [formData, setFormData] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      console.info('[reCAPTCHA v3] Executing business signup action.')
      const recaptchaToken = await executeRecaptcha('signup')
      console.info('[reCAPTCHA v3] Signup token generated; submitting business registration.')
      await signupBusiness(formData, recaptchaToken);
      setSuccess('Business account created successfully. Redirecting to Business Login...');
      setTimeout(() => navigate('/business-login'), 1000);
    } catch (err) {
      console.error('[Business signup] Registration was not completed:', err)
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
          <p className="biz-kicker">Business Banking</p>
          <h1>Build smarter money operations for your business.</h1>
          <p>Open a JEGA business account to collect payments, run payouts, and monitor all transactions in one secure dashboard.</p>
          <ul className="biz-feature-list">
            <li>Fast collections and settlements</li>
            <li>Role-based team access</li>
            <li>Realtime payment analytics</li>
          </ul>
          <Link to="/business-login" className="biz-alt-link">Already registered? Business Login</Link>
        </aside>

        <section className="biz-signup-card">
          <div className="biz-logo-wrap">
            <img src={logo} alt="JEGA logo" className="biz-logo" />
          </div>
          <h3>Create Business Account</h3>
          <p className="biz-subtitle">Complete your company details below.</p>

          {error && <div className="biz-alert biz-alert-error">{error}</div>}
          {success && <div className="biz-alert biz-alert-success">{success}</div>}

          <form className="biz-form" onSubmit={handleSubmit} noValidate>
            <div className="biz-grid">
              <div>
                <label className="biz-label">Business Name</label>
                <input
                  type="text"
                  name="businessName"
                  className="biz-input"
                  value={formData.businessName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="biz-label">Business Type</label>
                <select
                  name="businessType"
                  className="biz-input"
                  value={formData.businessType}
                  onChange={handleChange}
                >
                  <option>Sole Proprietor</option>
                  <option>Partnership</option>
                  <option>Limited Company</option>
                  <option>NGO</option>
                  <option>Other</option>
                </select>
              </div>
            </div>

            <div className="biz-grid">
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
                <label className="biz-label">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  className="biz-input"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div>
              <label className="biz-label">RC Number (Optional)</label>
              <input
                type="text"
                name="rcNumber"
                className="biz-input"
                value={formData.rcNumber}
                onChange={handleChange}
              />
            </div>

            <div className="biz-grid">
              <div className="biz-password-wrap">
                <label className="biz-label">Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="biz-input"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="biz-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="biz-password-wrap">
                <label className="biz-label">Confirm Password</label>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  className="biz-input"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="biz-toggle"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="biz-submit"
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Create Business Account'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default BusinessSignup;