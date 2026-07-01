'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import LeftRail from './LeftRail';
import RightRail from './RightRail';
import PageTransition from '@/components/animation/PageTransition';

// Rails are shown on browse/shopping pages only. Focused flows (checkout,
// auth) and pages with their own sidebar (account) keep the plain layout.
const NO_RAILS = ['/checkout', '/cart', '/login', '/register', '/forgot-password', '/reset-password', '/account'];

export default function DesktopShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showRails = !NO_RAILS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!showRails) {
    return <PageTransition>{children}</PageTransition>;
  }

  return (
    <div className="app-shell mx-auto w-full max-w-[2200px] xl:grid xl:grid-cols-[15rem_minmax(0,1fr)] xl:gap-6 xl:px-6 2xl:grid-cols-[16rem_minmax(0,1fr)_21rem]">
      <LeftRail />
      <div className="min-w-0">
        <PageTransition>{children}</PageTransition>
      </div>
      <RightRail />
    </div>
  );
}
