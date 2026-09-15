import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useAppSelector } from "../../store/hooks";
import { AppFooter } from "./AppFooter";
import { MarketHeader } from "./MarketHeader";
import { MobileNav, SideRail } from "./SideRail";

export function AppShell() {
  const theme = useAppSelector((state) => state.ui.theme);
  const density = useAppSelector((state) => state.ui.density);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <div className={`app-shell density-${density}`}>
      <MarketHeader />
      <div className="app-body">
        <SideRail />
        <main className="app-main" id="main-content">
          <Outlet />
        </main>
      </div>
      <AppFooter />
      <MobileNav />
    </div>
  );
}
