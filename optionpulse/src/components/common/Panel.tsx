import type { ReactNode } from "react";
import { classNames } from "../../utils/format";

interface PanelProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Removes body padding, for tables that manage their own spacing. */
  flush?: boolean;
}

export function Panel({
  title,
  subtitle,
  actions,
  children,
  className,
  bodyClassName,
  flush,
}: PanelProps) {
  return (
    <section className={classNames("panel", className)}>
      {(title || actions) && (
        <header className="panel__head">
          <div>
            {title && <h2 className="panel__title">{title}</h2>}
            {subtitle && <div className="panel__subtitle">{subtitle}</div>}
          </div>
          {actions && <div className="toolbar__group">{actions}</div>}
        </header>
      )}
      <div className={classNames("panel__body", flush && "panel__body--flush", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}
