import { useEffect } from 'react';
import { useReadRankStore } from '../store/useReadRankStore';

/**
 * Development helper component that adds keyboard shortcuts for testing.
 * Only active in development mode.
 * 
 * Shortcuts:
 * - Cmd/Ctrl + Shift + R: Reset app state
 */
export const DevHelper: React.FC = () => {
  const { reset } = useReadRankStore();

  useEffect(() => {
    // Only enable in development
    if (import.meta.env.MODE !== 'development') return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + R: Quick reset
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        console.log('🔄 Dev shortcut: Resetting app...');
        reset();
        window.location.reload();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [reset]);

  // This component doesn't render anything
  return null;
};
