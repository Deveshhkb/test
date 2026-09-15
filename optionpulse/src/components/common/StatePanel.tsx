import type { ReactNode } from "react";
import { IconAlert, IconEmpty, IconInfo } from "./Icon";

export type StateKind = "loading" | "empty" | "error" | "disconnected" | "closed";

const PRESETS: Record<StateKind, { title: string; message: string; icon: ReactNode }> = {
  loading: {
    title: "Waiting for market data…",
    message: "Fetching the latest snapshot from the data service.",
    icon: <IconInfo size={18} />,
  },
  empty: {
    title: "Nothing to show yet",
    message: "There is no data for the current selection.",
    icon: <IconEmpty size={18} />,
  },
  error: {
    title: "Data temporarily unavailable",
    message:
      "The market-data service could not be reached. No values are shown rather than stale or invented ones.",
    icon: <IconAlert size={18} />,
  },
  disconnected: {
    title: "Disconnected",
    message: "The live connection dropped. Reconnecting…",
    icon: <IconAlert size={18} />,
  },
  closed: {
    title: "Market closed",
    message: "Values shown are from the last completed session.",
    icon: <IconInfo size={18} />,
  },
};

interface StatePanelProps {
  kind: StateKind;
  title?: string;
  message?: string;
  action?: ReactNode;
}

/**
 * Single place where loading / empty / error / disconnected / closed states are
 * rendered, so no screen ever falls back to showing fabricated values.
 */
export function StatePanel({ kind, title, message, action }: StatePanelProps) {
  const preset = PRESETS[kind];
  return (
    <div className="state-panel" role={kind === "error" ? "alert" : "status"}>
      <span className="state-panel__icon">{preset.icon}</span>
      <span className="state-panel__title">{title ?? preset.title}</span>
      <p className="state-panel__message">{message ?? preset.message}</p>
      {action}
    </div>
  );
}

export function SkeletonBlock({
  height = 16,
  width = "100%",
}: {
  height?: number;
  width?: string;
}) {
  return <div className="skeleton" style={{ height, width }} />;
}
