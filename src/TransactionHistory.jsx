import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDashboard } from '../hooks/useDashboard';
import './TransactionHistory.css';

const STATUS_LABELS = {
  successful: 'Successful',
  success: 'Successful',
  completed: 'Successful',
  pending: 'Pending',
  failed: 'Failed',
  reversed: 'Reversed',
};

const normaliseStatus = (status = '') =>
  STATUS_LABELS[status.toLowerCase()] ?? status;

const FILTERS = ['All', 'Successful', 'Pending', 'Failed'];

const TransactionHistory = () => {
  const { transactions, loading, warning } = useDashboard();
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const visible = useMemo(() => transactions.filter((tx) => {
    const statusMatch =
      filter === 'All' ||
      normaliseStatus(tx.status) === filter;
    const searchLower = search.toLowerCase();
    const textMatch =
      !searchLower ||
      (tx.recipient || '').toLowerCase().includes(searchLower) ||
      (tx.type || '').toLowerCase().includes(searchLower) ||
      (tx.id || '').toLowerCase().includes(searchLower);
    return statusMatch && textMatch;
  }), [transactions, filter, search]);

  const fmt = (n) =>
    '₦' + Math.abs(n).toLocaleString('en-NG', { minimumFractionDigits: 2 });

  return (
    <div className="txn-page">
      <div className="txn-shell">

        {/* Header */}
        <header className="txn-header">
          <div>
            <h2>Transaction History</h2>
            <p>View and track all your account activity in one place.</p>
          </div>
          <Link to="/dashboard" className="txn-back-link">Back to Dashboard</Link>
        </header>

        {/* Controls */}
        <div className="txn-controls">
          <input
            className="txn-search"
            type="text"
            placeholder="Search by recipient, type or reference…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="txn-filters">
            {FILTERS.map((f) => (
              <button
                key={f}
                className={`txn-filter-btn${filter === f ? ' active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {warning && <p className="txn-alert">{warning}</p>}

        {/* Table */}
        <div className="txn-card">
          {loading ? (
            <p className="txn-empty">Loading transactions…</p>
          ) : visible.length === 0 ? (
            <p className="txn-empty">No transactions match your filter.</p>
          ) : (
            <div className="txn-table-wrap">
              <table className="txn-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Reference</th>
                    <th>Type</th>
                    <th>Recipient</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((tx) => {
                    const label = normaliseStatus(tx.status);
                    const isCredit = (tx.amount ?? 0) > 0;
                    return (
                      <tr key={tx.id || tx._id}>
                        <td>{tx.date || '—'}</td>
                        <td className="txn-ref">{tx.id || tx._id || '—'}</td>
                        <td>{tx.type || '—'}</td>
                        <td>{tx.recipient || '—'}</td>
                        <td className={isCredit ? 'txn-amount-credit' : 'txn-amount-debit'}>
                          {isCredit ? '+' : '-'}{fmt(tx.amount)}
                        </td>
                        <td>
                          <span className={`txn-badge txn-badge-${label.toLowerCase()}`}>{label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="txn-disclaimer">Showing the same transaction stream used on your dashboard.</p>
      </div>
    </div>
  );
};

export default TransactionHistory;
