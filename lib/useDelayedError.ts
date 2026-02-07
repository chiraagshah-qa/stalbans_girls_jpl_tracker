import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_DELAY_MS = 1800;

/**
 * Returns [displayError, setError].
 * displayError is only set after the error has been present for delayMs, so a brief
 * error (e.g. cleared when data loads) is not shown.
 */
export function useDelayedError(delayMs: number = DEFAULT_DELAY_MS): [string | null, (value: string | null) => void] {
  const [error, setError] = useState<string | null>(null);
  const [displayError, setDisplayError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorRef = useRef<string | null>(null);
  errorRef.current = error;

  const setErrorWithDelay = useCallback((value: string | null) => {
    setError(value);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (value === null) {
      setDisplayError(null);
    } else {
      errorRef.current = value;
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        setDisplayError(errorRef.current);
      }, delayMs);
    }
  }, [delayMs]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return [displayError, setErrorWithDelay];
}
