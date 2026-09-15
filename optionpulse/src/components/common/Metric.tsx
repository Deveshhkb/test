import type { ReactNode } from "react";
import { classNames } from "../../utils/format";

interface MetricProps {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "up" | "down";
  size?: "md" | "lg";
}

export function Metric({ label, value, hint, tone = "default", size = "md" }: MetricProps) {
  return (
    <div className="metric">
      <span className="metric__label">{label}</span>
      <span
        className={classNames(
          "metric__value",
          size === "lg" && "metric__value--lg",
          tone !== "default" && tone,
        )}
      >
        {value}
      </span>
      {hint && <span className="metric__hint">{hint}</span>}
    </div>
  );
}

export function KeyValue({
  label,
  value,
  tone,
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: string;
}) {
  return (
    <div className="kv">
      <span className="kv__key">{label}</span>
      <span className={classNames("kv__value", tone)}>{value}</span>
    </div>
  );
}
