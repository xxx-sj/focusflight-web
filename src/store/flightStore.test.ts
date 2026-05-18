import { describe, it, expect, beforeEach } from 'vitest';
import { useFlightStore } from './flightStore';

describe('flightStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useFlightStore.setState({ active: null, lastCompleted: null });
  });

  it('starts with no active flight and no lastCompleted', () => {
    expect(useFlightStore.getState().active).toBeNull();
    expect(useFlightStore.getState().lastCompleted).toBeNull();
  });

  it('startBooking creates active in booking step', () => {
    useFlightStore.getState().startBooking();
    expect(useFlightStore.getState().active?.step).toBe('booking');
  });

  it('chooses duration/category then advances to boarding', () => {
    const s = useFlightStore.getState();
    s.startBooking();
    s.setDuration(25);
    s.setCategory('work');
    s.advance();
    expect(useFlightStore.getState().active?.step).toBe('boarding');
    expect(useFlightStore.getState().active?.flight.plannedSeconds).toBe(1500);
    expect(useFlightStore.getState().active?.flight.category).toBe('work');
  });

  it('startBooking auto-assigns a seat', () => {
    useFlightStore.getState().startBooking();
    expect(useFlightStore.getState().active?.flight.seat).toMatch(/^([1-9]|10)[A-F]$/);
  });

  it('abort clears active without appending history', () => {
    const s = useFlightStore.getState();
    s.startBooking();
    s.abort();
    expect(useFlightStore.getState().active).toBeNull();
  });

  it('startFlight sets startedAt and moves to inflight', () => {
    const s = useFlightStore.getState();
    s.startBooking(); s.setDuration(25); s.setCategory('work');
    s.advance(); s.advance();   // booking → boarding → checkin
    s.startFlight();
    expect(useFlightStore.getState().active?.step).toBe('inflight');
    expect(useFlightStore.getState().active?.flight.startedAt).toBeTruthy();
  });

  it('startFlight preserves origin/destination/lofiTrack across the transition', () => {
    const s = useFlightStore.getState();
    s.startBooking(); s.setDuration(25); s.setCategory('work');
    s.setOrigin('KR'); s.setDestination('JP'); s.setLofiTrack('cafe');
    s.advance(); s.advance();   // booking → boarding → checkin
    s.startFlight();
    const a = useFlightStore.getState().active;
    expect(a?.origin).toBe('KR');
    expect(a?.destination).toBe('JP');
    expect(a?.lofiTrack).toBe('cafe');
  });

  it('land completes flight, appends to history, clears active, sets lastCompleted', () => {
    const s = useFlightStore.getState();
    s.startBooking(); s.setDuration(25); s.setCategory('work');
    s.advance(); s.advance(); s.startFlight();
    s.land();
    expect(useFlightStore.getState().active).toBeNull();
    expect(useFlightStore.getState().lastCompleted?.category).toBe('work');
    expect(useFlightStore.getState().lastCompleted?.seat).toMatch(/^([1-9]|10)[A-F]$/);
  });

  it('dismissLanded clears the post-flight screen', () => {
    useFlightStore.setState({ lastCompleted: { id: 'x', category: 'work', plannedSeconds: 60, actualSeconds: 60, seat: '1A', startedAt: 0, completedAt: 60, status: 'completed' } });
    useFlightStore.getState().dismissLanded();
    expect(useFlightStore.getState().lastCompleted).toBeNull();
  });
});
