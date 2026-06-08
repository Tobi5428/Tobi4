import { useState, useEffect } from 'react';
import { initiatePayment, getTransactionHistory, getPaymentStats } from './api';
import './Dashboard.css';

const Dashboard = () => {
  const [paymentData, setPaymentData] = useState({
    amount: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Load transactions and stats on component mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load transaction history
      try {
        const transRes = await getTransactionHistory();
        if (Array.isArray(transRes.data)) {
          setTransactions(transRes.data);
        }
      } catch (err) {
        console.log('Transactions not implemented yet');
      }

      // Load stats
      try {
        const statsRes = await getPaymentStats();
        setStats(statsRes.data);
      } catch (err) {
        console.log('Stats not implemented yet');
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleInitiatePayment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Validate inputs
      if (!paymentData.amount || !paymentData.email || !paymentData.firstName || 
          !paymentData.lastName || !paymentData.phone) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }

      const result = await initiatePayment(paymentData);

      if (result.success) {
        setSuccess(true);
        // Redirect to Flutterwave payment link
        if (result.data.link) {
          // Open in new window or redirect
          window.location.href = result.data.link;
        }
        // Reset form
        setPaymentData({
          amount: '',
          email: '',
          firstName: '',
          lastName: '',
          phone: ''
        });
      } else {
        setError(result.message || 'Failed to initiate payment');
      }
    } catch (err) {
      setError(err.message || 'Error initiating payment');
      console.error('Payment error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Dashboard</h2>
        <p>Manage payments and view transaction history</p>
      </div>

      {/* Tabs Navigation */}
      <div className="tabs-navigation">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab-btn ${activeTab === 'payment' ? 'active' : ''}`}
          onClick={() => setActiveTab('payment')}
        >
          Make Payment
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Transaction History
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="tab-content overview-tab">
          <div className="stats-grid">
            {stats ? (
              <>
                <div className="stat-card">
                  <h4>Total Transactions</h4>
                  <p className="stat-value">{stats.totalTransactions || 0}</p>
                </div>
                <div className="stat-card">
                  <h4>Total Amount</h4>
                  <p className="stat-value">₦{(stats.totalAmount || 0).toLocaleString()}</p>
                </div>
                <div className="stat-card">
                  <h4>Successful Payments</h4>
                  <p className="stat-value">{stats.successfulPayments || 0}</p>
                </div>
                <div className="stat-card">
                  <h4>Pending Payments</h4>
                  <p className="stat-value">{stats.pendingPayments || 0}</p>
                </div>
              </>
            ) : (
              <div className="no-data">No payment statistics available</div>
            )}
          </div>
        </div>
      )}

      {/* Payment Form Tab */}
      {activeTab === 'payment' && (
        <div className="tab-content payment-tab">
          <div className="payment-form-container">
            <h3>Initiate Flutterwave Payment</h3>
            
            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">Payment initiated successfully! Redirecting...</div>}

            <form onSubmit={handleInitiatePayment} className="payment-form">
              <div className="form-group">
                <label>First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={paymentData.firstName}
                  onChange={handleInputChange}
                  placeholder="Enter your first name"
                  required
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={paymentData.lastName}
                  onChange={handleInputChange}
                  placeholder="Enter your last name"
                  required
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={paymentData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                  required
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  value={paymentData.phone}
                  onChange={handleInputChange}
                  placeholder="Enter your phone number"
                  required
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Amount (NGN) *</label>
                <input
                  type="number"
                  name="amount"
                  value={paymentData.amount}
                  onChange={handleInputChange}
                  placeholder="Enter amount"
                  min="1"
                  required
                  className="form-control"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-block"
              >
                {loading ? 'Processing...' : 'Proceed to Payment'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Transaction History Tab */}
      {activeTab === 'history' && (
        <div className="tab-content history-tab">
          <h3>Transaction History</h3>
          {transactions.length > 0 ? (
            <div className="transactions-table">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction, index) => (
                    <tr key={index}>
                      <td>{new Date(transaction.createdAt).toLocaleDateString()}</td>
                      <td>₦{transaction.amount.toLocaleString()}</td>
                      <td>{transaction.email}</td>
                      <td>
                        <span className={`badge badge-${transaction.status}`}>
                          {transaction.status}
                        </span>
                      </td>
                      <td>{transaction.tx_ref || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-data">No transactions found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
