import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTransactionHistory } from './api';
import './Reports.css';

const DEMO = [
  { id: 'TXN001', type: 'Transfer',     description: 'Transfer to John Doe',    amount: -25000,  status: 'successful', createdAt: new Date(Date.now() - 1 * 3600000).toISOString() },
  { id: 'TXN002', type: 'Bill Payment', description: 'DSTV Subscription',       amount: -5500,   status: 'successful', createdAt: new Date(Date.now() - 3 * 3600000).toISOString() },
  { id: 'TXN003', type: 'Airtime',      description: 'MTN Airtime Top-up',      amount: -2000,   status: 'successful', createdAt: new Date(Date.now() - 6 * 3600000).toISOString() },
  { id: 'TXN004', type: 'Deposit',      description: 'Wallet Funding',          amount:  100000, status: 'successful', createdAt: new Date(Date.now() - 24 * 3600000).toISOString() },
  { id: 'TXN005', type: 'Transfer',     description: 'Transfer to Jane Smith',  amount: -15000,  status: 'pending',    createdAt: new Date(Date.now() - 26 * 3600000).toISOString() },
  { id: 'TXN006', type: 'Bill Payment', description: 'PHCN Electricity',        amount: -8000,   status: 'failed',     createdAt: new Date(Date.now() - 48 * 3600000).toISOString() },
  { id: 'TXN007', type: 'Transfer',     description: 'Transfer to Chidi Obi',  amount: -30000,  status: 'successful', createdAt: new Date(Date.now() - 72 * 3600000).toISOString() },
  { id: 'TXN008', type: 'Deposit',      description: 'Salary Credit',          amount:  250000, status: 'successful', createdAt: new Date(Date.now() - 96 * 3600000).toISOString() },
];

const RANGES = [
  { label: 'Last 7 days',  days: 7  },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'All time',     days: 0  },
];

const TYPES = ['All Types', 'Transfer', 'Bill Payment', 'Airtime', 'Deposit', 'Data'];

const fmt  = (n) => '₦' + Math.abs(n).toLocaleString('en-NG', { minimumFractionDigits: 2 });
const pct  = (a, b) => (b === 0 ? '0' : ((a / b) * 100).toFixed(1));

const Reports = () => {
  const [txns,       setTxns]       = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [rangeIdx,   setRangeIdx]   = useState(1);   // default: last 30 days
  const [typeFilter, setTypeFilter] = useState('All Types');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await getTransactionHistory();
      const data = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setTxns(data.length ? data : DEMO);
    } catch {
      setTxns(DEMO);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const { days } = RANGES[rangeIdx];
  const cutoff   = days ? Date.now() - days * 86400000 : 0;

  const filtered = txns.filter((tx) => {
    const inRange = !cutoff || new Date(tx.createdAt).getTime() >= cutoff;
    const inType  = typeFilter === 'All Types' || tx.type === typeFilter;
    return inRange && inType;
  });

  const totalCredit   = filtered.filter(t => t.amount > 0).reduce((s, t) =>  s + t.amount, 0);
  const totalDebit    = filtered.filter(t => t.amount < 0).reduce((s, t) =>  s + Math.abs(t.amount), 0);
  const netFlow       = totalCredit - totalDebit;
  const successCount  = filtered.filter(t => t.status?.toLowerCase() === 'successful' || t.status?.toLowerCase() === 'success').length;
  const pendingCount  = filtered.filter(t => t.status?.toLowerCase() === 'pending').length;
  const failedCount   = filtered.filter(t => t.status?.toLowerCase() === 'failed').length;

  // Group by type for breakdown
  const byType = filtered.reduce((acc, tx) => {
    const key = tx.type || 'Other';
    if (!acc[key]) acc[key] = { count: 0, debit: 0, credit: 0 };
    acc[key].count++;
    tx.amount > 0 ? (acc[key].credit += tx.amount) : (acc[key].debit += Math.abs(tx.amount));
    return acc;
  }, {});

  const exportCSV = () => {
    const header = 'Date,Reference,Type,Description,Amount,Status';
    const rows   = filtered.map(tx => [
      new Date(tx.createdAt).toLocaleDateString('en-NG'),
      tx.id || tx._id || '',
      tx.type || '',
      `"${(tx.description || '').replace(/"/g, '""')}"`,
      tx.amount,
      tx.status || '',
    ].join(','));
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `jega-report-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="reports-page">
      <div className="reports-shell">

        <header className="reports-hero">
          <div>
            <p className="reports-kicker">Analytics</p>
            <h2>Reports</h2>
            <p className="reports-intro">Review your account activity, spending patterns, and financial summary.</p>
          </div>
          <Link to="/dashboard" className="reports-back">Back to Dashboard</Link>
        </header>

        {/* Controls */}
        <div className="reports-controls">
          <div className="reports-range">
            {RANGES.map((r, i) => (
              <button
                key={r.label}
                className={`range-btn${rangeIdx === i ? ' active' : ''}`}
                onClick={() => setRangeIdx(i)}
              >{r.label}</button>
            ))}
          </div>
          <div className="reports-right-controls">
            <select
              className="reports-type-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <button className="reports-export-btn" onClick={exportCSV} disabled={loading || filtered.length === 0}>
              ⬇ Export CSV
            </button>
          </div>
        </div>

        {/* Summary KPI cards */}
        <div className="reports-kpis">
          <div className="kpi-card kpi-credit">
            <span>Total Credit</span>
            <strong>{fmt(totalCredit)}</strong>
          </div>
          <div className="kpi-card kpi-debit">
            <span>Total Debit</span>
            <strong>{fmt(totalDebit)}</strong>
          </div>
          <div className={`kpi-card ${netFlow >= 0 ? 'kpi-net-pos' : 'kpi-net-neg'}`}>
            <span>Net Flow</span>
            <strong>{netFlow >= 0 ? '+' : '-'}{fmt(netFlow)}</strong>
          </div>
          <div className="kpi-card kpi-count">
            <span>Transactions</span>
            <strong>{filtered.length}</strong>
          </div>
        </div>

        {/* Status breakdown */}
        <div className="reports-row">
          <section className="reports-card reports-status">
            <h3>Status Breakdown</h3>
            <div className="status-bars">
              {[
                { label: 'Successful', count: successCount, cls: 'bar-success' },
                { label: 'Pending',    count: pendingCount,  cls: 'bar-pending' },
                { label: 'Failed',     count: failedCount,   cls: 'bar-failed'  },
              ].map(({ label, count, cls }) => (
                <div key={label} className="status-bar-row">
                  <div className="status-bar-meta">
                    <span>{label}</span>
                    <span>{count} ({pct(count, filtered.length)}%)</span>
                  </div>
                  <div className="status-bar-track">
                    <div
                      className={`status-bar-fill ${cls}`}
                      style={{ width: `${pct(count, filtered.length)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Type breakdown */}
          <section className="reports-card reports-types">
            <h3>By Transaction Type</h3>
            {Object.keys(byType).length === 0 ? (
              <p className="reports-empty">No data for selected filters.</p>
            ) : (
              <table className="type-table">
                <thead>
                  <tr><th>Type</th><th>Count</th><th>Debit</th><th>Credit</th></tr>
                </thead>
                <tbody>
                  {Object.entries(byType).map(([type, { count, debit, credit }]) => (
                    <tr key={type}>
                      <td>{type}</td>
                      <td>{count}</td>
                      <td className="td-debit">{debit  ? fmt(debit)  : '—'}</td>
                      <td className="td-credit">{credit ? fmt(credit) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>

        {/* Transaction list */}
        <section className="reports-card">
          <h3>Transaction Details</h3>
          {loading ? (
            <p className="reports-empty">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="reports-empty">No transactions found for this period.</p>
          ) : (
            <div className="reports-table-wrap">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Date</th><th>Reference</th><th>Type</th>
                    <th>Description</th><th>Amount</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tx) => {
                    const isCredit = tx.amount > 0;
                    const status   = tx.status?.toLowerCase() ?? '';
                    const display  = status === 'successful' || status === 'success' ? 'Successful'
                                   : status === 'pending' ? 'Pending'
                                   : status === 'failed'  ? 'Failed' : tx.status;
                    return (
                      <tr key={tx.id || tx._id}>
                        <td>{new Date(tx.createdAt).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td className="td-ref">{tx.id || tx._id || '—'}</td>
                        <td>{tx.type || '—'}</td>
                        <td>{tx.description || '—'}</td>
                        <td className={isCredit ? 'td-credit' : 'td-debit'}>
                          {isCredit ? '+' : '-'}{fmt(tx.amount)}
                        </td>
                        <td><span className={`r-badge r-badge-${display?.toLowerCase()}`}>{display}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="reports-note">Demo data shown when server is unavailable. Live data loads automatically when connected.</p>
      </div>
    </div>
  );
};

export default Reports;
