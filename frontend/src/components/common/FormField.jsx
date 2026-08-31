export default function FormField({ field, value, onChange }) {
  const { name, label, type = "text", options = [], required, placeholder, step } = field;

  const commonProps = {
    id: name,
    name,
    value: value ?? "",
    required,
    placeholder: placeholder || label,
    onChange: (e) => onChange(name, e.target.value),
  };

  return (
    <div className={`field${type === "textarea" ? " field-full" : ""}`}>
      <label htmlFor={name}>
        {label} {required && <span style={{ color: "var(--danger)" }}>*</span>}
      </label>
      {type === "select" ? (
        <select {...commonProps}>
          <option value="">Pilih {label}</option>
          {options.map((opt) => (
            <option key={opt.value ?? opt} value={opt.value ?? opt}>
              {opt.label ?? opt}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea rows={3} {...commonProps} />
      ) : (
        <input type={type} step={step} {...commonProps} />
      )}
    </div>
  );
}
