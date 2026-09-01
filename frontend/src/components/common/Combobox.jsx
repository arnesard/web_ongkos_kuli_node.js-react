import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Combobox: input teks biasa yang bisa diketik bebas, tapi juga nampilin
 * dropdown berisi `options` yang bisa difilter sambil ngetik dan di-scroll.
 * Beda sama <select> — value nggak wajib ada di `options` (misal no_doc baru
 * yang belum pernah dipakai sebelumnya tetap bisa diketik manual).
 */
export default function Combobox({
  id,
  name,
  value,
  onChange,
  options = [],
  placeholder,
  required,
  maxHeight = 220,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = String(value || "").toLowerCase();
    if (!q) return options;
    return options.filter((opt) => String(opt).toLowerCase().includes(q));
  }, [options, value]);

  const handleSelect = (opt) => {
    onChange(name, opt);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <input
          id={id}
          name={name}
          value={value ?? ""}
          required={required}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onChange(name, e.target.value);
            setOpen(true);
          }}
          style={{ paddingRight: 32 }}
        />
        <ChevronDown
          size={15}
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            opacity: 0.5,
            pointerEvents: "none",
          }}
        />
      </div>

      {open && filtered.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 20,
            maxHeight,
            overflowY: "auto",
            background: "rgba(10, 16, 32, 0.98)",
            border: "1px solid var(--glass-border)",
            borderRadius: 9,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          {filtered.map((opt) => (
            <div
              key={opt}
              onMouseDown={(e) => e.preventDefault()} // biar nggak nge-blur input duluan
              onClick={() => handleSelect(opt)}
              style={{
                padding: "8px 12px",
                fontSize: 14,
                cursor: "pointer",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0, 212, 255, 0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
