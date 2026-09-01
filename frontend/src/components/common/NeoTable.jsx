import { useMemo, useState } from "react";
import DataTable from "react-data-table-component";
import { Search } from "lucide-react";

const customStyles = {
  headRow: {
    style: {
      backgroundColor: "rgba(16, 26, 51, 0.7)",
      borderBottomColor: "var(--glass-border)",
      minHeight: "44px",
    },
  },
  headCells: {
    style: {
      color: "var(--text-secondary)",
      fontSize: "11.5px",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.04em",
      paddingTop: 12,
      paddingBottom: 12,
    },
  },
  rows: {
    style: {
      backgroundColor: "transparent",
      color: "var(--text-primary)",
      fontSize: "13.5px",
      minHeight: "48px",
      borderBottomColor: "rgba(90, 150, 255, 0.08)",
    },
    // ini kuncinya: react-data-table-component nge-generate style hover-nya sendiri
    // (default abu-abu terang) lewat styled-components, yang kadang menang dari CSS
    // kita di App.css. Override resminya harus lewat customStyles, bukan CSS biasa.
    highlightOnHoverStyle: {
      backgroundColor: "rgba(47, 125, 255, 0.10)",
      color: "var(--text-primary)",
      transitionDuration: "0.15s",
      outlineStyle: "none",
    },
  },
  cells: { style: { paddingTop: 10, paddingBottom: 10 } },
  pagination: {
    style: {
      backgroundColor: "transparent",
      color: "var(--text-secondary)",
      borderTopColor: "var(--glass-border)",
    },
  },
};

export default function NeoTable({
  columns,
  data,
  searchableKeys = [],
  toolbarLeft,
  noDataText = "Belum ada data",
  pagination = true,
  dense = false,
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query || searchableKeys.length === 0) return data;
    const q = query.toLowerCase();
    return data.filter((row) =>
      searchableKeys.some((key) => String(row[key] ?? "").toLowerCase().includes(q))
    );
  }, [data, query, searchableKeys]);

  return (
    <div>
      {searchableKeys.length > 0 && (
        <div className="table-toolbar">
          <div>{toolbarLeft}</div>
          <div className="table-search form-neo">
            <Search size={15} />
            <input
              placeholder="Cari data..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      )}
      <div className="rdt-neo-wrapper">
        <DataTable
          columns={columns}
          data={filtered}
          pagination={pagination}
          dense={dense}
          highlightOnHover
          customStyles={customStyles}
          noDataComponent={<div className="empty-state">{noDataText}</div>}
          paginationPerPage={8}
          paginationRowsPerPageOptions={[8, 15, 30, 50]}
        />
      </div>
    </div>
  );
}
