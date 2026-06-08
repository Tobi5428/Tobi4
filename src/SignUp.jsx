import React, { useState } from 'react'
import { registerUser } from './api'
import { Link, useNavigate } from 'react-router-dom'
import './AuthPages.css'

function SignUp() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }))
  }

  const togglePasswordVisibility = () => {
    setShowPassword((visible) => !visible)
  }

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword((visible) => !visible)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    
    try {
      await registerUser({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        email: formData.email,
        password: formData.password,
      })
      navigate('/login')
    } catch (err) {
      const message = 
        typeof err === 'string' 
          ? err
          : err?.message || err?.error || err?.data?.message || 'Sign up failed. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <aside className="auth-brand-pane">
          <div>
            <h1>JEGA</h1>
            <h2>Open your account and start banking better today.</h2>
            <p>Set up your profile in minutes and unlock faster, simpler digital banking.</p>
          </div>
          <Link to="/" className="auth-home-link">
            Back to Landing Page
          </Link>
        </aside>

        <section className="auth-form-pane">
          <p className="auth-kicker">Get Started</p>
          <h3>Create Account</h3>
          <p className="auth-subtitle">Join JEGA and take control of your money.</p>

          {error && <p className="auth-error">{error}</p>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-grid">
              <input
                type="text"
                name="firstName"
                placeholder="First Name"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
              <input
                type="text"
                name="lastName"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>
            <input
              type="text"
              name="phone"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={handleChange}
              required
            />
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              required
            />
            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={togglePasswordVisibility}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="password-field">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={toggleConfirmPasswordVisibility}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <button className="auth-submit" type="submit">
              Sign Up
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </section>
      </div>
    </div>
  )
}

export default SignUp
