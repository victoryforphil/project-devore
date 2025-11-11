'use client';

import { useEffect } from 'react';
import { TopToolbar } from '@/components/layout/TopToolbar';
import { DockviewLayout } from '@/components/layout/DockviewLayout';
import { useDarkMode } from '@/hooks/useDarkMode';

export default function Home() {
  const { isDark, setDark } = useDarkMode();

  useEffect(() => {
    // Initialize dark mode from localStorage on mount
    const stored = localStorage.getItem('dark-mode-storage');
    if (stored) {
      const { state } = JSON.parse(stored);
      setDark(state.isDark);
    }
  }, [setDark]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <TopToolbar />
      <div className="flex-1 overflow-hidden">
        <DockviewLayout />
      </div>
    </div>
  );
}
