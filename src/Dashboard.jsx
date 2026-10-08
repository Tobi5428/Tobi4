import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import Sidebar from './Dashboard/Sidebar';
import Topbar from './Dashboard/Topbar';
import StatCard from './Dashboard/StatCard';
import WalletCard from './Dashboard/walletcard';
import QuickActions from './Dashboard/QuickActions';
import ServiceGrid from './Dashboard/ServiceGrid';
import TransactionTable from './Dashboard/TransactionTable';
import SkeletonBlock from './Dashboard/SkeletonBlock';
import DashboardErrorState from './Dashboard/ErrorState';
import AccountLimitsDisplay from './components/AccountLimits/AccountLimitsDisplay';
import { useDashboard } from '../hooks/useDashboard';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLoginAlert, setShowLoginAlert] = useState(true);

  const {
    user,
    balance,
    transactions,
    stats,
    loading,
    error,
    warning,
    refreshDashboard,
  } = useDashboard();

  const accountType = user?.accountType?.toString().trim().toLowerCase() === 'business'
    ? 'business'
    : 'personal';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (error) {
    return <DashboardErrorState onRetry={refreshDashboard} />;
  }

  return (
    <div className="dashboard-layout">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />

      <div className="dashboard-main">
        <Topbar
          user={user}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <div className="dashboard-content">
          {warning && (
            <div className="alert jega-warning-alert d-flex justify-content-between align-items-center">
              <span>{warning}</span>
              <button className="btn btn-sm jega-refresh-btn" onClick={refreshDashboard} disabled={loading}>Retry</button>
            </div>
          )}

          {showLoginAlert && (
            <div className="alert jega-login-alert alert-dismissible d-flex justify-content-between align-items-center">
              <span>New login detected on this device just now.</span>
              <button
                className="btn-close"
                onClick={() => setShowLoginAlert(false)}
                aria-label="Dismiss"
              />
            </div>
          )}

          <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
            <div>
              <h4 className="fw-bold mb-1">
                Welcome back, {loading ? '...' : (user?.businessName || user?.firstName || 'there')}
              </h4>
              <p className="text-muted mb-0">
                {loading ? (
                  <SkeletonBlock width="220px" height="14px" />
                ) : (
                  <>
                    Account: {user?.accountNumber || '—'} · {accountType === 'business' ? 'Business Account' : 'Personal Account'} · Last login: {user?.lastLogin || '—'}
                  </>
                )}
              </p>
            </div>
            <button className="btn jega-refresh-btn" onClick={refreshDashboard} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'jega-spin' : ''} />
              Refresh
            </button>
          </div>

          {loading ? (
            <SkeletonBlock height="180px" className="mb-4" />
          ) : (
            <WalletCard balance={balance} />
          )}

          <QuickActions accountType={accountType} />

          {!loading && <AccountLimitsDisplay />}

          <div className="row g-3 my-1">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div className="col-6 col-md-4 col-lg-2" key={i}>
                    <SkeletonBlock height="90px" />
                  </div>
                ))
              : stats.map((stat) => (
                  <div className="col-6 col-md-4 col-lg-2" key={stat.label}>
                    <StatCard {...stat} />
                  </div>
                ))}
          </div>

          <ServiceGrid accountType={accountType} />

          <div className="row g-3 mt-1">
            <div className="col-12">
              {loading ? (
                <SkeletonBlock height="320px" />
              ) : (
                <TransactionTable transactions={transactions} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;