import { useState, useEffect, useCallback } from 'react';
import api from './api';
import './WebhookMonitor.css';

const WebhookMonitor = () => {
  const [webhookStats, setWebhookStats] = useState(null);
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState('stats'); // stats, logs
  const [filter, setFilter] = useState('all'); // all, processed, failed
  const [retrying, setRetrying] = useState(null);

  const loadWebhookData = useCallback(async () => {
    setLoading(true);
    try {
      // Load stats
      const statsRes = await api.get('/payment/webhook/stats');
      if (statsRes.data.success) {
        setWebhookStats(statsRes.data.data);
      }

      // Load logs
      const logsRes = await api.get(`/payment/webhook/logs?status=${filter === 'all' ? '' : filter}`);
      if (logsRes.data.success) {
        setWebhookLogs(logsRes.data.data);
      }
    } catch (error) {
      console.error('Error loading webhook data:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadWebhookData();
    const interval = setInterval(loadWebhookData, 30000);
    return () => clearInterval(interval);
  }, [loadWebhookData]);

  const handleRetry = async (webhookId) => {
    setRetrying(webhookId);
    try {
      const response = await api.post(`/payment/webhook/logs/${webhookId}/retry`);
      if (response.data.success) {
        // Reload logs
        loadWebhookData();
      }
    } catch (error) {
      console.error('Error retrying webhook:', error);
    } finally {
      setRetrying(null);
    }
  };

  const getEventBadgeColor = (event) => {
    switch (event) {
      case 'charge.completed':
        return 'badge-primary';
      case 'transfer.completed':
        return 'badge-success';
      case 'transaction.reversal':
        return 'badge-warning';
      default:
        return 'badge-secondary';
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'processed':
        return 'status-success';
      case 'failed':
        return 'status-danger';
      case 'received':
        return 'status-info';
      case 'pending':
        return 'status-warning';
      default:
        return 'status-secondary';
    }
  };

  return (
    <div className="webhook-monitor-container">
      <div className="webhook-header">
        <h2>Webhook Monitor</h2>
        <p>Monitor real-time Flutterwave webhook events</p>
        <button 
          className="btn-refresh"
          onClick={loadWebhookData}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* View Tabs */}
      <div className="webhook-tabs">
        <button
          className={`tab-btn ${activeView === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveView('stats')}
        >
          Statistics
        </button>
        <button
          className={`tab-btn ${activeView === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveView('logs')}
        >
          Event Logs
        </button>
      </div>

      {/* Statistics View */}
      {activeView === 'stats' && webhookStats && (
        <div className="stats-view">
          <div className="stats-grid">
            <div className="stat-box primary">
              <h3>Total Webhooks</h3>
              <p className="stat-number">{webhookStats.totalWebhooks}</p>
            </div>
            <div className="stat-box success">
              <h3>Processed</h3>
              <p className="stat-number">{webhookStats.processedWebhooks}</p>
              <p className="stat-percent">
                {webhookStats.totalWebhooks > 0 
                  ? ((webhookStats.processedWebhooks / webhookStats.totalWebhooks) * 100).toFixed(1)
                  : 0}%
              </p>
            </div>
            <div className="stat-box danger">
              <h3>Failed</h3>
              <p className="stat-number">{webhookStats.failedWebhooks}</p>
              <p className="stat-percent">
                {webhookStats.totalWebhooks > 0 
                  ? ((webhookStats.failedWebhooks / webhookStats.totalWebhooks) * 100).toFixed(1)
                  : 0}%
              </p>
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="section">
            <h3>Status Breakdown</h3>
            <div className="breakdown-chart">
              {webhookStats.statusStats && webhookStats.statusStats.map((item) => (
                <div key={item._id} className="breakdown-item">
                  <span className="breakdown-label">{item._id}</span>
                  <div className="breakdown-bar">
                    <div
                      className={`bar-fill ${item._id}`}
                      style={{
                        width: `${(item.count / webhookStats.totalWebhooks) * 100}%`
                      }}
                    ></div>
                  </div>
                  <span className="breakdown-count">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Event Statistics */}
          <div className="section">
            <h3>Events by Type</h3>
            <div className="event-stats-table">
              <table>
                <thead>
                  <tr>
                    <th>Event Type</th>
                    <th>Count</th>
                    <th>Last Received</th>
                  </tr>
                </thead>
                <tbody>
                  {webhookStats.eventStats && webhookStats.eventStats.map((event) => (
                    <tr key={event._id}>
                      <td>
                        <span className={`badge ${getEventBadgeColor(event._id)}`}>
                          {event._id}
                        </span>
                      </td>
                      <td>{event.count}</td>
                      <td>
                        {new Date(event.lastReceived).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Logs View */}
      {activeView === 'logs' && (
        <div className="logs-view">
          <div className="logs-filter">
            <label>Filter Status:</label>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="processed">Processed</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {webhookLogs.length > 0 ? (
            <div className="logs-table">
              <table>
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Reference</th>
                    <th>Status</th>
                    <th>Retries</th>
                    <th>Received</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {webhookLogs.map((log) => (
                    <tr key={log._id}>
                      <td>
                        <span className={`badge ${getEventBadgeColor(log.event)}`}>
                          {log.event}
                        </span>
                      </td>
                      <td className="mono-text">{log.transactionRef || 'N/A'}</td>
                      <td>
                        <span className={`status-badge ${getStatusBadgeColor(log.status)}`}>
                          {log.status}
                        </span>
                      </td>
                      <td>{log.retryCount}</td>
                      <td>{new Date(log.createdAt).toLocaleString()}</td>
                      <td>
                        {log.status === 'failed' && (
                          <button
                            className="btn-retry"
                            onClick={() => handleRetry(log._id)}
                            disabled={retrying === log._id}
                          >
                            {retrying === log._id ? 'Retrying...' : 'Retry'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-data">No webhook logs found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default WebhookMonitor;
