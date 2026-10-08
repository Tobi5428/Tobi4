import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send, Smartphone, Wifi, Receipt, CreditCard, Snowflake, Store, UserPlus, List, ArrowLeftRight,
  Headphones, ShieldCheck, Phone, Bell, User, Settings, FileText, BookOpen,
} from 'lucide-react';

const actions = [
  { key: 'transfer', label: 'Send Money', icon: Send, path: '/transfer' },
  { key: 'airtime', label: 'Airtime', icon: Smartphone, path: '/airtime' },
  { key: 'data', label: 'Data', icon: Wifi, path: '/data' },
  { key: 'bills', label: 'Pay Bills', icon: Receipt, path: '/bill-pay' },
  { key: 'card', label: 'Create Card', icon: CreditCard, path: '/virtual-card' },
  { key: 'freeze', label: 'Freeze Card', icon: Snowflake, path: '/card-management' },
  { key: 'pos', label: 'POS Controller', icon: Store, path: '/pos-controller' },
  { key: 'pos-registration', label: 'POS Registration', icon: UserPlus, path: '/one-time-account' },
  { key: 'tx-history', label: 'Transactions', icon: List, path: '/transaction-history' },
  { key: 'exchange', label: 'Exchange', icon: ArrowLeftRight, path: '/exchange' },
  { key: 'customer-care', label: 'Customer Care', icon: Headphones, path: '/customer-care' },
  { key: 'kyc', label: 'KYC', icon: ShieldCheck, path: '/kyc' },
  { key: 'contact', label: 'Contact', icon: Phone, path: '/contact' },
  { key: 'notifications', label: 'Notifications', icon: Bell, path: '/notifications' },
  { key: 'profile', label: 'Profile', icon: User, path: '/profile' },
  { key: 'reports', label: 'Reports', icon: FileText, path: '/reports' },
  { key: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
  { key: 'terms', label: 'Terms', icon: FileText, path: '/terms' },
  { key: 'blog', label: 'Blog', icon: BookOpen, path: '/blog' },
  { key: 'username', label: 'Username', icon: User, path: '/username' },
];

const actionKeysByType = {
  personal: ['transfer', 'airtime', 'data', 'bills', 'card', 'freeze', 'tx-history', 'exchange', 'customer-care', 'contact', 'notifications', 'profile', 'settings', 'terms', 'blog', 'username'],
  business: ['transfer', 'card', 'freeze', 'pos', 'pos-registration', 'tx-history', 'exchange', 'reports', 'customer-care', 'notifications', 'profile', 'settings', 'terms', 'blog', 'username'],
};

function QuickActions({ accountType = 'personal' }) {
  const normalizedType = accountType?.toString().trim().toLowerCase() === 'business' ? 'business' : 'personal';
  const visibleActions = actions.filter((action) => actionKeysByType[normalizedType].includes(action.key));

  const navigate = useNavigate();
  const [busyKey, setBusyKey] = useState(null);
  const [toast, setToast] = useState(null);

  const handleClick = async (action) => {
    setBusyKey(action.key);
    setToast(null);
    try {
      navigate(action.path);
    } catch (err) {
      setToast({ type: 'danger', message: err.message || `${action.label} failed.` });
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="mb-4">
      {toast && (
        <div className={`alert alert-${toast.type} py-2`}>{toast.message}</div>
      )}
      <div className="jega-quick-actions-grid">
        {visibleActions.map(({ key, label, icon: Icon, ...rest }) => (
          <button
            key={key}
            className="jega-quick-action-btn"
            onClick={() => handleClick({ key, label, ...rest })}
            disabled={busyKey === key}
          >
            {busyKey === key ? (
              <span className="spinner-border spinner-border-sm" role="status" />
            ) : (
              <Icon size={20} />
            )}
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default QuickActions;