import { useEffect, useState, useRef } from 'react';

// Default timeout: 10 minutes (600,000 ms)
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

export default function useInactivityLock(timeoutMs = DEFAULT_TIMEOUT_MS, onLock) {
  const [isLocked, setIsLocked] = useState(false);
  const timeoutId = useRef(null);

  useEffect(() => {
    // If already locked, don't keep resetting the timer
    if (isLocked) return;

    const resetTimer = () => {
      if (timeoutId.current) clearTimeout(timeoutId.current);
      timeoutId.current = setTimeout(() => {
        setIsLocked(true);
        if (onLock) onLock();
      }, timeoutMs);
    };

    // Events that denote "activity"
    const events = ['mousemove', 'mousedown', 'keypress', 'touchmove', 'scroll'];

    const handleActivity = () => {
      resetTimer();
    };

    // Attach listeners
    events.forEach(event => window.addEventListener(event, handleActivity));

    // Initialize timer
    resetTimer();

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      if (timeoutId.current) clearTimeout(timeoutId.current);
    };
  }, [timeoutMs, onLock, isLocked]);

  const unlock = () => {
    setIsLocked(false);
  };

  return { isLocked, unlock };
}
