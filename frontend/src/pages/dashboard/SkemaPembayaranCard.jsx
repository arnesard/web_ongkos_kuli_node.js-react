function formatRupiahShort(nominal) {
  const n = Number(nominal) || 0;
  if (n >= 1_000_000) return `Rp. ${(n / 1_000_000).toFixed(1)}Jt`;
  if (n >= 1_000) return `Rp. ${(n / 1_000).toFixed(1)}K`;
  return `Rp. ${n}`;
}

export default function SkemaPembayaranCard({ data = [] }) {
  return (
    <div className="glass-card panel dash-card-fill">
      <div className="panel-title">
        <h3>Skema Pembayaran Kuli</h3>
      </div>
      <div className="skema-scroll">
        {data.length > 0 ? (
          data.map((row, i) => (
            <div className="skema-row" key={row.id_kuli + i}>
              <span className="skema-dept">{row.department}</span>
              <span className="skema-sep">||</span>
              <span className="skema-nama">{row.nama_kuli}</span>
              <span className="skema-sep">||</span>
              <span className="skema-trip">{row.total_trip} TRIP</span>
              <span className="skema-sep">||</span>
              <span className="skema-nominal">{formatRupiahShort(row.nominal)}</span>
            </div>
          ))
        ) : (
          <div className="empty-state">Belum ada trip hari ini</div>
        )}
      </div>
    </div>
  );
}
