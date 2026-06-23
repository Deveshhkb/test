'use client';

import { useEffect, useState } from 'react';
import { getCountdown } from '@/utils';

/** Live-updating countdown to a target ISO date. */
export function useCountdown(targetIso: string) {
  const [time, setTime] = useState(() => getCountdown(targetIso));

  useEffect(() => {
    const id = setInterval(() => setTime(getCountdown(targetIso)), 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  return time;
}
