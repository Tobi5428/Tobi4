import React, { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import logo from "./assets/jega-logo.jpeg";
import "./LandingPage.css";

const LandingPage = () => {
  const [imageError, setImageError] = useState(false);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const features = [
    {
      id: 1,
      title: "Instant Transfers",
      description: "Send and receive funds in seconds without unnecessary steps.",
    },
    {
      id: 2,
      title: "Smart Bill Pay",
      description: "Set reminders and settle utilities with one tap from your dashboard.",
    },
    {
      id: 3,
      title: "Security Alerts",
      description: "Get real-time login and transaction notifications that keep you in control.",
    },
  ];

  return (
    <div className="landing-page">
      <header className="hero-shell">
        <nav className="landing-nav">
          <Link to="/" className="brand-logo" aria-label="JEGA Home">
            {!imageError ? (
              <img 
                src={logo} 
                alt="JEGA logo" 
                className="landing-logo"
                onError={handleImageError}
                loading="lazy"
              />
            ) : (
              <div className="landing-logo-fallback">JEGA</div>
            )}
            <h2 className="brand">JEGA</h2>
          </Link>
          <div className="nav-actions">
            <Link to="/login" className="btn btn-ghost">
              Login
            </Link>
            <Link to="/signup" className="btn btn-solid">
              Sign Up
            </Link>
          </div>
        </nav>

        <section className="hero-content">
          <p className="hero-kicker">Digital Banking Made Refreshingly Simple</p>
          <h1>Track money, move fast, and bank with confidence.</h1>
          <p className="hero-copy">
            One clean dashboard for transfers, bill payments, savings goals, and account security.
          </p>
          <div className="hero-cta">
            <Link to="/signup" className="btn btn-solid">
              Create Free Account
            </Link>
            <div className="login-section">
              <Link to="/login" className="btn btn-ghost hero-login">
                I already have an account
              </Link>
            </div>
          </div>
        </section>
      </header>

      <section className="feature-grid">
        {features.map((feature) => (
          <article key={feature.id} className="feature-card">
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </article>
        ))}
      </section>

      <section className="bottom-cta">
        <h2>Start your better banking experience today.</h2>
        <Link to="/signup" className="btn btn-solid">
          Sign Up Now
        </Link>
      </section>

      <footer className="landing-footer">
        <p>&copy; 2026 JEGA. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;

