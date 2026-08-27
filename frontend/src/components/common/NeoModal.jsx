import { X } from "lucide-react";

export default function NeoModal({ open, title, onClose, children, width = 560 }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop-neo" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-neo" style={{ maxWidth: width }}>
        <div className="modal-neo-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
