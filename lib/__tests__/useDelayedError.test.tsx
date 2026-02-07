import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useDelayedError } from '../useDelayedError';

let resultRef: [string | null, (value: string | null) => void] | null = null;

function Wrapper({ delayMs }: { delayMs: number }) {
  const result = useDelayedError(delayMs);
  resultRef = result;
  return React.createElement(React.Fragment, null, result[0] ?? '');
}

describe('useDelayedError', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    resultRef = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns null displayError initially', () => {
    TestRenderer.create(React.createElement(Wrapper, { delayMs: 1000 }));
    expect(resultRef).not.toBeNull();
    expect(resultRef![0]).toBeNull();
  });

  it('keeps displayError null until delay has passed', () => {
    TestRenderer.create(React.createElement(Wrapper, { delayMs: 1000 }));
    const setError = resultRef![1];
    act(() => {
      setError('Something failed');
    });
    expect(resultRef![0]).toBeNull();
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(resultRef![0]).toBeNull();
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(resultRef![0]).toBe('Something failed');
  });

  it('clears displayError immediately when setError(null) is called', () => {
    TestRenderer.create(React.createElement(Wrapper, { delayMs: 1000 }));
    const setError = resultRef![1];
    act(() => {
      setError('Error');
    });
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(resultRef![0]).toBe('Error');
    act(() => {
      setError(null);
    });
    expect(resultRef![0]).toBeNull();
  });

  it('does not show error if cleared before delay', () => {
    TestRenderer.create(React.createElement(Wrapper, { delayMs: 1000 }));
    const setError = resultRef![1];
    act(() => {
      setError('Brief error');
    });
    act(() => {
      jest.advanceTimersByTime(500);
    });
    act(() => {
      setError(null);
    });
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(resultRef![0]).toBeNull();
  });
});
