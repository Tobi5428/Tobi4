import {
  CreditCard, List, ArrowLeftRight, Headphones, ShieldCheck, Phone, Bell, User, Store, UserPlus, Settings, FileText, BookOpen,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const services = [
  { key: 'virtual-card', icon: CreditCard, title: 'Virtual Card', desc: 'Create and manage virtual cards', path: '/virtual-card' },
  { key: 'pos-controller', icon: Store, title: 'POS Controller', desc: 'Accept POS payments quickly', path: '/pos-controller' },
  { key: 'pos-registration', icon: UserPlus, title: 'POS Registration', desc: 'Register and manage POS account', path: '/one-time-account' },
  { key: 'transaction-history', icon: List, title: 'Transaction History', desc: 'Track all completed transactions', path: '/transaction-history' },
  { key: 'exchange', icon: ArrowLeftRight, title: 'Exchange', desc: 'Swap and convert currencies', path: '/exchange' },
  { key: 'customer-care', icon: Headphones, title: 'Customer Care', desc: 'Reach support and get help fast', path: '/customer-care' },
  { key: 'kyc', icon: ShieldCheck, title: 'KYC', desc: 'Complete identity verification', path: '/kyc' },
  { key: 'contact', icon: Phone, title: 'Contact', desc: 'View contact options and offices', path: '/contact' },
  { key: 'notifications', icon: Bell, title: 'Notifications', desc: 'Read your latest account alerts', path: '/notifications' },
  { key: 'profile', icon: User, title: 'Profile', desc: 'Manage your account profile', path: '/profile' },
  { key: 'reports', icon: FileText, title: 'Reports', desc: 'Review account and transaction reports', path: '/reports' },
  { key: 'settings', icon: Settings, title: 'Settings', desc: 'Adjust account and security settings', path: '/settings' },
  { key: 'terms', icon: FileText, title: 'Terms', desc: 'Read terms and conditions', path: '/terms' },
  { key: 'blog', icon: BookOpen, title: 'Blog', desc: 'Read updates and product tips', path: '/blog' },
  { key: 'username', icon: User, title: 'Username', desc: 'Set or update your username', path: '/username' },
];

const serviceKeysByType = {
  personal: ['virtual-card', 'transaction-history', 'exchange', 'customer-care', 'kyc', 'contact', 'notifications', 'profile', 'settings', 'terms', 'blog', 'username'],
  business: ['virtual-card', 'pos-controller', 'pos-registration', 'transaction-history', 'exchange', 'reports', 'customer-care', 'notifications', 'profile', 'settings', 'terms', 'blog', 'username'],
};

function ServiceGrid({ accountType = 'personal' }) {
  const normalizedType = accountType?.toString().trim().toLowerCase() === 'business' ? 'business' : 'personal';
  const visibleServices = services.filter((item) => serviceKeysByType[normalizedType].includes(item.key));

  const navigate = useNavigate();

  return (
    <div className="mb-4">
      <h6 className="fw-bold mb-3">Services</h6>
      <div className="jega-service-grid">
        {visibleServices.map(({ key, icon: Icon, title, desc, path }) => (
          <button key={key} className="jega-service-card" onClick={() => navigate(path)}>
            <div className="jega-service-icon">
              <Icon size={20} />
            </div>
            <p className="jega-service-title">{title}</p>
            <p className="jega-service-desc">{desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

export default ServiceGrid;