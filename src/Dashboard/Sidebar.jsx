import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, CreditCard, List, ArrowLeftRight, Headphones,
  ShieldCheck, Phone, Bell, User, LogOut, Settings, FileText, BookOpen,
} from 'lucide-react';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/virtual-card', label: 'Virtual Card', icon: CreditCard },
  { to: '/transaction-history', label: 'Transaction History', icon: List },
  { to: '/exchange', label: 'Exchange', icon: ArrowLeftRight },
  { to: '/customer-care', label: 'Customer Care', icon: Headphones },
  { to: '/kyc', label: 'KYC', icon: ShieldCheck },
  { to: '/contact', label: 'Contact', icon: Phone },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/terms', label: 'Terms', icon: FileText },
  { to: '/blog', label: 'Blog', icon: BookOpen },
  { to: '/username', label: 'Username', icon: User },
];

function Sidebar({ isOpen, onClose, onLogout }) {
  return (
    <>
      {isOpen && <div className="jega-sidebar-backdrop d-lg-none" onClick={onClose} />}

      <aside className={`jega-sidebar ${isOpen ? 'jega-sidebar-open' : ''}`}>
        <div className="d-flex align-items-center justify-content-between px-3 py-3">
          <span className="jega-logo">JEGA</span>
          <button className="btn-close d-lg-none" onClick={onClose} aria-label="Close menu" />
        </div>

        <nav className="jega-sidebar-nav">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              className={({ isActive }) =>
                `jega-sidebar-link ${isActive ? 'jega-sidebar-link-active' : ''}`
              }
              onClick={onClose}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}

          <button className="jega-sidebar-link jega-logout-btn" onClick={onLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;