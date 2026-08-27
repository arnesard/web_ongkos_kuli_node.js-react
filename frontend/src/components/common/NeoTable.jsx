import { useMemo, useState } from "react";
import DataTable from "react-data-table-component";
import { Search } from "lucide-react";

const customStyles = {
  headCells: { style: { paddingTop: 12, paddingBottom: 12 } },
  cells: { style: { paddingTop: 10, paddingBottom: 10 } },
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
