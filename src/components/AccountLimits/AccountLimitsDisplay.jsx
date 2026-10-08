import React, { useEffect, useState } from 'react';
import { RefreshCw, Lock, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { useAccountLimits } from '../../hooks/useAccountLimits';
import './AccountLimits.css';

/**
 * AccountLimitsDisplay Component
 * Shows user's verification tier and account limits
 * Displays remaining daily limits for incoming/outgoing
 */
export default function AccountLimitsDisplay() {
  const { tier, allTiers, remaining, loading, error, refresh } = useAccountLimits();
  const [showDetails, setShowDetails] = useState(false);

  if (error) {
    return (
      <div className="account-limits-card account-limits-error">
        <div className="account-limits-header">
          <h3>Account Limits</h3>
          <button
            className="account-limits-refresh-btn"
            onClick={refresh}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>
        <div className="account-limits-error-message">
          <AlertCircle size={20} />
          <p>{error}</p>
          <button onClick={refresh} disabled={loading} className="btn-sm btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading || !tier || !remaining) {
    return (
      <div className="account-limits-card account-limits-loading">
        <div className="account-limits-skeleton skeleton-line" />
        <div className="account-limits-skeleton skeleton-line" />
        <div className="account-limits-skeleton skeleton-line short" />
      </div>
    );
  }

  const tierData = allTiers?.[tier];
  if (!tierData) {
    return null;
  }

  const getProgressColor = (used, limit) => {
    if (limit === 0) return '#6c757d';
    const percentage = (used / limit) * 100;
    if (percentage >= 90) return '#dc3545'; // Red
    if (percentage >= 70) return '#ffc107'; // Yellow
    return '#28a745'; // Green
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const ProgressBar = ({ used, limit, color }) => {
    const percentage = limit > 0 ? (used / limit) * 100 : 0;
    return (
      <div className="account-limits-progress-container">
        <div className="account-limits-progress-bar">
          <div
            className="account-limits-progress-fill"
            style={{
              width: `${Math.min(percentage, 100)}%`,
              backgroundColor: color,
            }}
          />
        </div>
        <span className="account-limits-progress-text">
          {formatCurrency(used)} / {formatCurrency(limit)}
        </span>
      </div>
    );
  };

  return (
    <div className="account-limits-card">
      <div className="account-limits-header">
        <div className="account-limits-title">
          <Lock size={18} />
          <div>
            <h3>Account Limits</h3>
            <p className="account-limits-tier-badge">{tierData.name}</p>
          </div>
        </div>
        <button
          className="account-limits-refresh-btn"
          onClick={refresh}
          disabled={loading}
          title="Refresh limits"
        >
          <RefreshCw size={16} className={loading ? 'spinning' : ''} />
        </button>
      </div>

      <div className="account-limits-hero">
        <div className="account-limits-hero-item">
          <span className="account-limits-label">Single Transaction</span>
          <p className="account-limits-value">{formatCurrency(remaining.singleTransaction)}</p>
        </div>
      </div>

      <div className="account-limits-grid">
        <div className="account-limits-item">
          <div className="account-limits-item-header">
            <TrendingDown size={16} className="icon-outgoing" />
            <span className="account-limits-item-label">Daily Outgoing</span>
          </div>
          <ProgressBar
            used={remaining.dailyOutgoingUsed}
            limit={remaining.dailyOutgoing}
            color={getProgressColor(remaining.dailyOutgoingUsed, remaining.dailyOutgoing)}
          />
          <p className="account-limits-remaining">
            Remaining: <strong>{formatCurrency(remaining.dailyOutgoingRemaining)}</strong>
          </p>
        </div>

        <div className="account-limits-item">
          <div className="account-limits-item-header">
            <TrendingUp size={16} className="icon-incoming" />
            <span className="account-limits-item-label">Daily Incoming</span>
          </div>
          <ProgressBar
            used={remaining.dailyIncomingUsed}
            limit={remaining.dailyIncoming}
            color={getProgressColor(remaining.dailyIncomingUsed, remaining.dailyIncoming)}
          />
          <p className="account-limits-remaining">
            Remaining: <strong>{formatCurrency(remaining.dailyIncomingRemaining)}</strong>
          </p>
        </div>
      </div>

      <button
        className="account-limits-toggle"
        onClick={() => setShowDetails(!showDetails)}
      >
        {showDetails ? 'Hide Details' : 'Show All Tier Limits'}
      </button>

      {showDetails && allTiers && (
        <div className="account-limits-details">
          <div className="account-limits-details-grid">
            {Object.entries(allTiers).map(([tierKey, tierInfo]) => (
              <div
                key={tierKey}
                className={`account-limits-tier-card ${tierKey === tier ? 'active' : ''}`}
              >
                <h4>{tierInfo.name}</h4>
                <p className="tier-description">{tierInfo.description}</p>
                <ul className="tier-limits-list">
                  <li>
                    <span className="tier-label">Single Tx:</span>
                    <span className="tier-value">{formatCurrency(tierInfo.singleTransaction)}</span>
                  </li>
                  <li>
                    <span className="tier-label">Daily Out:</span>
                    <span className="tier-value">{formatCurrency(tierInfo.dailyOutgoing)}</span>
                  </li>
                  <li>
                    <span className="tier-label">Daily In:</span>
                    <span className="tier-value">{formatCurrency(tierInfo.dailyIncoming)}</span>
                  </li>
                </ul>
                {tierKey === tier && <div className="tier-current-badge">Current</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="account-limits-note">
        <small>Limits reset daily at midnight UTC. Backend enforces all limits.</small>
      </p>
    </div>
  );
}
