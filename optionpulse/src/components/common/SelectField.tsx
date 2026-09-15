import type { ChangeEvent } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  id: string;
  disabled?: boolean;
}

export function SelectField({
  label,
  value,
  options,
  onChange,
  id,
  disabled,
}: SelectFieldProps) {
  return (
    <div className="select-field">
      <label className="select-field__label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="select-field__control"
        value={value}
        disabled={disabled || options.length === 0}
        onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}
      >
        {options.length === 0 && <option value="">--</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
