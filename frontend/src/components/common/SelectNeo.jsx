import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

/**
 * SelectNeo: pengganti <select> native. Opsinya tetap (options
 * disediakan), bukan free text seperti Combobox — tapi tampilan dropdown-nya
 * ikut tema gelap aplikasi, bukan style dropdown bawaan browser/OS.
 * `options` bisa array of string, atau array of { value, label }.
 */
export default function SelectNeo({
  id,
  name,
  value,
  onChange,
  options = [],
  placeholder = "-- Pilih --",
  required,
  disabled,
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

  const normalized = options.map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : opt
  );
  const selected = normalized.find((o) => o.value === value);

  const handlePick = (opt) => {
    onChange(name, opt.value);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        id={id}
        className={`select-neo-trigger${open ? " open" : ""}`}
        disabled={disabled}
        aria-required={required || undefined}
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        <span style={{ opacity: selected ? 1 : 0.45 }}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={15} style={{ opacity: 0.6, flexShrink: 0 }} />
      </button>

      <input type="hidden" value={value || ""} readOnly />

      {open && (
        <div
          className="dropdown-neo"
          style={{ top: "calc(100% + 4px)", left: 0, right: 0, maxHeight: 240, overflowY: "auto" }}
        >
          {normalized.map((opt) => (
            <div
              key={opt.value}
              onClick={() => handlePick(opt)}
              className={`dropdown-neo-item${opt.value === value ? " active" : ""}`}
            >
              {opt.label}
              {opt.value === value && <Check size={13} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
