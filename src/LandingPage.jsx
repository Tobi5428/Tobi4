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
              />
            ) : (
              <div className="landing-logo-fallback">JEGA</div>
            )}
            <h2 className="brand">JEGA</h2>
          </Link>
          <div className="nav-actions">
            <Link to="/business-login" className="btn btn-ghost btn-business-ghost">
              Business Login
            </Link>
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
            <div className="hero-cta-row">
              <Link to="/signup" className="btn btn-solid">
                Create Free Account
              </Link>
              <Link to="/business-signup" className="btn btn-business">
                Open Business Account
              </Link>
            </div>
            <div className="login-section">
              <Link to="/login" className="btn btn-ghost hero-login">
                I already have an account
              </Link>
            </div>
          </div>
        </section>
      </header>

      <main className="landing-main">
        <section className="feature-grid" aria-label="JEGA banking features">
          {features.map((feature) => (
            <article key={feature.id} className="feature-card">
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </section>

        <section className="business-section">
          <div className="business-section-text">
            <p className="business-kicker">For Businesses</p>
            <h2>Power your business with JEGA</h2>
            <p>Accept payments, manage payroll, track expenses, and grow your business — all from one powerful dashboard.</p>
            <div className="business-cta-row">
              <Link to="/business-signup" className="btn btn-solid">
                Create Business Account
              </Link>
              <Link to="/business-login" className="btn btn-outline-dark">
                Business Login
              </Link>
            </div>
          </div>
          <div className="business-badges">
            <div className="business-badge"><span aria-hidden="true">&#9989;</span> Accept card &amp; bank payments</div>
            <div className="business-badge"><span aria-hidden="true">&#9989;</span> Mass disbursements &amp; payroll</div>
            <div className="business-badge"><span aria-hidden="true">&#9989;</span> Business wallet &amp; virtual accounts</div>
            <div className="business-badge"><span aria-hidden="true">&#9989;</span> Real-time transaction monitoring</div>
          </div>
        </section>

        <section className="bottom-cta">
          <h2>Start your better banking experience today.</h2>
          <Link to="/signup" className="btn btn-solid">
            Sign Up Now
          </Link>
        </section>
      </main>

      <footer className="landing-footer">
        <p>&copy; 2026 JEGA. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
