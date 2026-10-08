import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  approveReview,
  getPendingReviews,
  getRiskConfig,
  getRiskEvents,
  getRiskState,
  rejectReview,
  setRiskAllowlist,
  unblockRiskUser,
} from './api';
import './Admin.css';

const Admin = () => {
  const [events, setEvents] = useState([]);
  const [config, setConfig] = useState(null);
  const [userId, setUserId] = useState('');
  const [riskState, setRiskState] = useState(null);
  const [decision, setDecision] = useState('');
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pending manual-review queue
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewWorking, setReviewWorking] = useState('');

  const loadPendingReviews = async () => {
    setReviewsLoading(true);
    try {
      const resp = await getPendingReviews();
      setReviews(Array.isArray(resp?.data) ? resp.data : []);
    } catch (err) {
      setError(err.message || 'Unable to load pending reviews.');
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleReviewAction = async (transactionId, action) => {
    setReviewWorking(transactionId + action);
    setError('');
    setSuccess('');
    try {
      if (action === 'approve') {
        await approveReview(transactionId, reviewNote);
        setSuccess(`Transaction ${transactionId} approved.`);
      } else {
        await rejectReview(transactionId, reviewNote);
        setSuccess(`Transaction ${transactionId} rejected.`);
      }
      setReviewNote('');
      loadPendingReviews();
    } catch (err) {
      setError(err.message || `Failed to ${action} transaction.`);
    } finally {
      setReviewWorking('');
    }
  };

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const [eventsResp, configResp] = await Promise.all([
        getRiskEvents({ limit: 50, decision: decision || undefined }),
        getRiskConfig(),
      ]);
      setEvents(Array.isArray(eventsResp?.data) ? eventsResp.data : []);
      setConfig(configResp?.data || null);
    } catch (err) {
      setError(err.message || 'Unable to load risk dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    loadPendingReviews();
  }, [decision]);

  const handleLoadUserState = async (event) => {
    event.preventDefault();
    if (!userId.trim()) {
      setError('Enter a user email/id to fetch risk state.');
      return;
    }
    setWorking(true);
    setError('');
    setSuccess('');
    try {
      const resp = await getRiskState(userId.trim());
      setRiskState(resp?.data || null);
      setSuccess('Risk state loaded.');
    } catch (err) {
      setError(err.message || 'Failed to fetch user risk state.');
    } finally {
      setWorking(false);
    }
  };

  const handleUnblock = async () => {
    if (!userId.trim()) {
      setError('Enter a user email/id first.');
      return;
    }
    setWorking(true);
    setError('');
    setSuccess('');
    try {
      await unblockRiskUser(userId.trim());
      setSuccess('User unblocked successfully.');
      const resp = await getRiskState(userId.trim());
      setRiskState(resp?.data || null);
      loadDashboard();
    } catch (err) {
      setError(err.message || 'Failed to unblock user.');
    } finally {
      setWorking(false);
    }
  };

  const handleAllowlist = async (allow) => {
    if (!userId.trim()) {
      setError('Enter a user email/id first.');
      return;
    }
    setWorking(true);
    setError('');
    setSuccess('');
    try {
      await setRiskAllowlist(userId.trim(), allow);
      setSuccess(allow ? 'User added to allowlist.' : 'User removed from allowlist.');
      const resp = await getRiskState(userId.trim());
      setRiskState(resp?.data || null);
      loadDashboard();
    } catch (err) {
      setError(err.message || 'Failed to update allowlist.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-shell">
        <header className="admin-hero">
          <div>
            <p className="admin-kicker">Operations</p>
            <h2>Risk Admin</h2>
            <p>Review high-risk deposit events, inspect user risk state, and apply unblock/allowlist actions.</p>
          </div>
          <div className="admin-links">
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/reports">Reports</Link>
          </div>
        </header>

        {error && <p className="admin-alert admin-alert-error">{error}</p>}
        {success && <p className="admin-alert admin-alert-success">{success}</p>}

        <section className="admin-card">
          <h3>User Risk Actions</h3>
          <form className="admin-user-form" onSubmit={handleLoadUserState}>
            <input
              type="text"
              placeholder="Enter user email or ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
            <button type="submit" disabled={working}>Load State</button>
            <button type="button" disabled={working} onClick={handleUnblock}>Unblock</button>
            <button type="button" disabled={working} onClick={() => handleAllowlist(true)}>Allowlist</button>
            <button type="button" disabled={working} onClick={() => handleAllowlist(false)}>Remove Allowlist</button>
          </form>

          {riskState && (
            <div className="admin-state-grid">
              <div><strong>User:</strong> {riskState.userId}</div>
              <div><strong>Risk Level:</strong> {riskState.riskLevel || 'normal'}</div>
              <div><strong>Last Decision:</strong> {riskState.lastDecision || 'N/A'}</div>
              <div><strong>Last Score:</strong> {riskState.lastRiskScore ?? 0}</div>
              <div><strong>Allowlisted:</strong> {riskState.isAllowlisted ? 'Yes' : 'No'}</div>
              <div><strong>Blocked Until:</strong> {riskState.blockedUntil ? new Date(riskState.blockedUntil).toLocaleString() : 'N/A'}</div>
            </div>
          )}
        </section>

        <section className="admin-card">
          <div className="admin-card-head">
            <h3>Recent Risk Events</h3>
            <div className="admin-filter-row">
              <select value={decision} onChange={(e) => setDecision(e.target.value)}>
                <option value="">All decisions</option>
                <option value="BLOCK">BLOCK</option>
                <option value="REVIEW">REVIEW</option>
                <option value="ALLOW">ALLOW</option>
              </select>
              <button type="button" onClick={loadDashboard} disabled={loading}>Refresh</button>
            </div>
          </div>

          {loading ? (
            <p className="admin-empty">Loading events...</p>
          ) : events.length === 0 ? (
            <p className="admin-empty">No events found for the current filter.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>User</th>
                    <th>Decision</th>
                    <th>Score</th>
                    <th>Amount</th>
                    <th>Reason Codes</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event._id || `${event.userId}-${event.depositId}-${event.timestamp}`}>
                      <td>{event.timestamp ? new Date(event.timestamp).toLocaleString() : 'N/A'}</td>
                      <td>{event.userId}</td>
                      <td>
                        <span className={`admin-badge admin-badge-${String(event.decision || '').toLowerCase()}`}>
                          {event.decision || 'N/A'}
                        </span>
                      </td>
                      <td>{event.riskScore ?? 0}</td>
                      <td>{Number(event.amount || 0).toLocaleString('en-NG')}</td>
                      <td>{Array.isArray(event.reasonCodes) && event.reasonCodes.length ? event.reasonCodes.join(', ') : 'None'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="admin-card">
          <div className="admin-card-head">
            <h3>Pending Manual Reviews</h3>
            <button type="button" onClick={loadPendingReviews} disabled={reviewsLoading}>Refresh</button>
          </div>

          <div className="admin-review-note-row">
            <input
              type="text"
              placeholder="Optional reviewer note (applies to next action)"
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              className="admin-review-note-input"
            />
          </div>

          {reviewsLoading ? (
            <p className="admin-empty">Loading reviews...</p>
          ) : reviews.length === 0 ? (
            <p className="admin-empty">No transactions pending manual review.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Transaction ID</th>
                    <th>Customer</th>
                    <th>IP Address</th>
                    <th>Risk Flags</th>
                    <th>Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((tx) => {
                    const busy = reviewWorking.startsWith(tx.transactionId);
                    return (
                      <tr key={tx.transactionId}>
                        <td>{tx.createdAt ? new Date(tx.createdAt).toLocaleString() : 'N/A'}</td>
                        <td className="admin-mono">{tx.transactionId}</td>
                        <td>{tx.customerId}</td>
                        <td className="admin-mono">{tx.customerIp || '—'}</td>
                        <td>
                          {Array.isArray(tx.riskFlags) && tx.riskFlags.length
                            ? tx.riskFlags.map((f) => (
                                <span key={f} className="admin-badge admin-badge-review">{f}</span>
                              ))
                            : '—'}
                        </td>
                        <td>{Number(tx.amount || 0).toLocaleString('en-NG')}</td>
                        <td className="admin-action-cell">
                          <button
                            type="button"
                            className="admin-btn-approve"
                            disabled={busy}
                            onClick={() => handleReviewAction(tx.transactionId, 'approve')}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="admin-btn-reject"
                            disabled={busy}
                            onClick={() => handleReviewAction(tx.transactionId, 'reject')}
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="admin-card">
          <h3>Risk Thresholds</h3>
          {!config ? (
            <p className="admin-empty">Config unavailable.</p>
          ) : (
            <div className="admin-config-grid">
              <div><strong>Review Threshold:</strong> {config.REVIEW_THRESHOLD}</div>
              <div><strong>Block Threshold:</strong> {config.BLOCK_THRESHOLD}</div>
              <div><strong>Temp Block Hours:</strong> {config.TEMP_BLOCK_HOURS}</div>
              <div><strong>Decline Window (15m):</strong> {config.DECLINE_WINDOW_15M}</div>
              <div><strong>Card Count (1h):</strong> {config.CARD_COUNT_WINDOW_1H}</div>
              <div><strong>Card Count (24h):</strong> {config.CARD_COUNT_WINDOW_24H}</div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Admin;
