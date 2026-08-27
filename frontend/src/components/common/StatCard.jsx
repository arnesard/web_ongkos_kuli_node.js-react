export function StatGrid({ children }) {
  return <div className="stat-grid">{children}</div>;
}

export default function StatCard({ label, value, icon: Icon, trend, trendDown }) {
  return (
    <div className="glass-card stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {Icon && <Icon size={20} style={{ color: "var(--accent-2)" }} />}
        {value}
      </div>
      {trend && <div className={`stat-trend${trendDown ? " down" : ""}`}>{trend}</div>}
    </div>
  );
}
