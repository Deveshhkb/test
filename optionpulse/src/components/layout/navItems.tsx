import type { ReactNode } from "react";
import {
  IconAnalysis,
  IconBell,
  IconChain,
  IconChart,
  IconDashboard,
  IconStar,
  IconStrategy,
} from "../common/Icon";

export interface NavItem {
  to: string;
  label: string;
  shortLabel: string;
  icon: ReactNode;
  /** Shown in the mobile bottom bar (space is limited to five entries). */
  primary: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    to: "/",
    label: "Dashboard",
    shortLabel: "Home",
    icon: <IconDashboard size={18} />,
    primary: true,
  },
  {
    to: "/option-chain",
    label: "Option Chain",
    shortLabel: "Chain",
    icon: <IconChain size={18} />,
    primary: true,
  },
  {
    to: "/analysis",
    label: "Market Analysis",
    shortLabel: "Analysis",
    icon: <IconAnalysis size={18} />,
    primary: true,
  },
  {
    to: "/charts",
    label: "Charts",
    shortLabel: "Charts",
    icon: <IconChart size={18} />,
    primary: true,
  },
  {
    to: "/strategy",
    label: "Strategy Builder",
    shortLabel: "Strategy",
    icon: <IconStrategy size={18} />,
    primary: true,
  },
  {
    to: "/watchlist",
    label: "Watchlist",
    shortLabel: "Watchlist",
    icon: <IconStar size={18} />,
    primary: false,
  },
  {
    to: "/alerts",
    label: "Alerts",
    shortLabel: "Alerts",
    icon: <IconBell size={18} />,
    primary: false,
  },
];
