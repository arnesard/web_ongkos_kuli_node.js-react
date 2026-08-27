import { useState } from "react";

// TODO (fase backend): ganti dengan hasil kategorisasi usia dari DashboardController@index
// (kuliUsiaDibawah35, kuliUsiaProduktif, kuliUsiaSenior)
const groups = [
  { key: "muda", label: "<= 35 Tahun", data: [] },
  {
    key: "produktif",
    label: "36 - 49 Tahun",
    data: [
      { dept: "DPW", nama: "Ahmad Sujono", usia: 41 },
      { dept: "BPW", nama: "Rohman", usia: 47 },
    ],
  },
  {
    key: "senior",
    label: "> 50 Tahun",
    data: [{ dept: "APW", nama: "Wagiman", usia: 53 }],
  },
];

export default function UsiaKuliCard() {
  const [active, setActive] = useState("muda");
  const current = groups.find((g) => g.key === active);

  return (
    <div className="glass-card panel">
      <div className="panel-title">
        <h3>Usia Kuli</h3>
      </div>

      <div className="usia-pills">
        {groups.map((g) => (
          <button
            key={g.key}
            type="button"
            className={`usia-pill${active === g.key ? " active" : ""}`}
            onClick={() => setActive(g.key)}
          >
            <span className="usia-pill-label">{g.label}</span>
            <span className="usia-pill-count">({g.data.length} Orang)</span>
          </button>
        ))}
      </div>

      <div className="unperform-scroll usia-scroll">
        {current.data.length > 0 ? (
          <table className="unperform-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Dept.</th>
                <th>Nama Kuli</th>
                <th>Usia</th>
              </tr>
            </thead>
            <tbody>
              {current.data.map((row, i) => (
                <tr key={row.nama}>
                  <td>{i + 1}</td>
                  <td>{row.dept}</td>
                  <td className="unperform-nama">{row.nama}</td>
                  <td>{row.usia}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            Tidak ada kuli
            <br />
            <span style={{ fontSize: 11, textTransform: "uppercase" }}>{current.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}
