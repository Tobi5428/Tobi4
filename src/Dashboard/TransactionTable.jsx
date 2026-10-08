import { useMemo, useState } from 'react';

const PAGE_SIZE = 5;

const statusClass = {
  successful: 'bg-success-subtle text-success',
  pending: 'bg-warning-subtle text-warning',
  failed: 'bg-danger-subtle text-danger',
};

function TransactionTable({ transactions = [] }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () =>
      transactions.filter((t) =>
        [t.recipient, t.type, t.id].join(' ').toLowerCase().includes(search.toLowerCase())
      ),
    [transactions, search]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="jega-panel">
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h6 className="fw-bold mb-0">Recent Transactions</h6>
        <input
          type="text"
          className="form-control jega-input jega-table-search"
          placeholder="Search transactions..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="table-responsive">
        <table className="table jega-table align-middle">
          <thead>
            <tr>
              <th>ID</th>
              <th>Date</th>
              <th>Type</th>
              <th>Recipient</th>
              <th>Amount</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-muted py-4">
                  No transactions found.
                </td>
              </tr>
            ) : (
              pageItems.map((t) => (
                <tr key={t.id}>
                  <td>{t.id}</td>
                  <td>{t.date}</td>
                  <td>{t.type}</td>
                  <td>{t.recipient}</td>
                  <td>₦{Number(t.amount).toLocaleString()}</td>
                  <td>
                    <span className={`badge rounded-pill ${statusClass[t.status] || ''}`}>
                      {t.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-sm jega-link-btn">View</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="d-flex justify-content-end gap-2 mt-2">
          <button
            className="btn btn-sm jega-page-btn"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Prev
          </button>
          <span className="align-self-center small text-muted">
            {page} / {totalPages}
          </span>
          <button
            className="btn btn-sm jega-page-btn"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default TransactionTable;