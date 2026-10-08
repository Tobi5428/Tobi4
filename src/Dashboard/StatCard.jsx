function StatCard({ label, value, icon: Icon, trend }) {
  return (
    <div className="jega-stat-card">
      {Icon && (
        <div className="jega-stat-icon">
          <Icon size={18} />
        </div>
      )}
      <p className="jega-stat-label">{label}</p>
      <h5 className="jega-stat-value">{value}</h5>
      {trend && (
        <span className={`jega-stat-trend ${trend.startsWith('-') ? 'text-danger' : 'text-success'}`}>
          {trend}
        </span>
      )}
    </div>
  );
}

export default StatCard;