const iconDot = {
  login: 'bg-primary',
  transfer: 'bg-success',
  failed: 'bg-danger',
  kyc: 'bg-warning',
  card: 'bg-info',
  bill: 'bg-success',
};

function NotificationPanel({ notifications = [] }) {
  return (
    <div className="jega-panel">
      <h6 className="fw-bold mb-3">Notifications</h6>

      {notifications.length === 0 ? (
        <p className="text-muted small mb-0">You're all caught up — no new notifications.</p>
      ) : (
        <ul className="list-unstyled jega-notification-list">
          {notifications.map((n) => (
            <li key={n.id} className="d-flex gap-2 mb-3">
              <span className={`jega-notif-dot ${iconDot[n.type] || 'bg-secondary'}`} />
              <div>
                <p className="mb-0 small fw-semibold">{n.title}</p>
                <p className="mb-0 small text-muted">{n.message}</p>
                <p className="mb-0 small text-muted">{n.time}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default NotificationPanel;