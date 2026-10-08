import { AlertTriangle } from 'lucide-react';

function DashboardErrorState({ onRetry }) {
  return (
    <div className="jega-error-state">
      <AlertTriangle size={32} className="text-danger mb-3" />
      <h5 className="fw-bold mb-1">Couldn't load your dashboard</h5>
      <p className="text-muted mb-3">Something went wrong while fetching your data.</p>
      <button className="btn jega-btn-primary px-4" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

export default DashboardErrorState;