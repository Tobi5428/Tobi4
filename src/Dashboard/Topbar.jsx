import { useState } from 'react';
import { Menu, Search, Bell, Moon, Sun } from 'lucide-react';

function Topbar({ user, onMenuClick }) {
  const [darkMode, setDarkMode] = useState(false);
  const accountTypeLabel = user?.accountType?.toString().trim().toLowerCase() === 'business' ? 'business' : 'personal';

  const initials = (user?.businessName || user?.firstName || 'U').charAt(0).toUpperCase();

  return (
    <header className="jega-topbar">
      <button className="btn jega-icon-btn d-lg-none" onClick={onMenuClick} aria-label="Open menu">
        <Menu size={20} />
      </button>

      <div className="jega-search d-none d-md-flex">
        <Search size={16} className="text-muted me-2" />
        <input type="text" placeholder="Search transactions, bills, contacts..." />
      </div>

      <div className="ms-auto d-flex align-items-center gap-2">
        <span className={`jega-badge ${accountTypeLabel === 'business' ? 'jega-badge-business' : 'jega-badge-personal'}`}>
          {accountTypeLabel === 'business' ? 'Business' : 'Personal'}
        </span>

        <button className="btn jega-icon-btn" aria-label="Notifications">
          <Bell size={18} />
        </button>

        <button
          className="btn jega-icon-btn"
          aria-label="Toggle theme"
          onClick={() => setDarkMode((prev) => !prev)}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="jega-avatar">{initials}</div>
      </div>
    </header>
  );
}

export default Topbar;