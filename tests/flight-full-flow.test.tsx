import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import { useFlightStore } from '../src/store/flightStore';
import { loadHistory } from '../src/lib/storage';

describe('Flight full flow', () => {
  beforeEach(() => {
    localStorage.clear();
    useFlightStore.setState({ active: null, lastCompleted: null });
  });

  it('booking → landed via direct startFlight bypass appends to history', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);

    await user.click(screen.getByText('Book a flight'));
    await user.click(screen.getByText('25 min'));
    await user.click(screen.getByText('일'));
    await user.click(screen.getByText(/Next: Choose seat/));

    await user.click(screen.getByText('1A'));
    await user.click(screen.getByText(/Next: Boarding pass/));

    await user.click(screen.getByText(/Proceed to check-in/));

    // bypass drag — directly call startFlight
    useFlightStore.getState().startFlight();

    // advance clock past plannedSeconds; Countdown's onExpire should land()
    vi.advanceTimersByTime(25 * 60 * 1000 + 2000);
    await vi.runOnlyPendingTimersAsync();

    expect(loadHistory().length).toBe(1);
    expect(loadHistory()[0].category).toBe('work');
    expect(loadHistory()[0].seat).toBe('1A');
    vi.useRealTimers();
  });
});
