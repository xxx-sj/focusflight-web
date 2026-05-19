import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useFlightStore } from '../store/flightStore';
import { loadActive, saveActive } from '../lib/storage';
import { isExpired } from '../lib/timer';
import { audioBus } from '../lib/audio';
import ResumeModal from './ResumeModal';
import Booking from './steps/Booking';
import BoardingPass from './steps/BoardingPass';
import CheckIn from './steps/CheckIn';
import InFlight from './steps/InFlight';
import Landed from './steps/Landed';

const VALID_STEPS = new Set(['booking', 'boarding', 'checkin', 'inflight', 'landed']);

export default function FlightMachine() {
  const { active, lastCompleted, hydrate, startBooking, abort, land } = useFlightStore();
  const [showResume, setShowResume] = useState(false);

  // On mount, decide what to do with any saved flight:
  // - In-flight (timer running) → show ResumeModal, defer hydrate so music
  //   doesn't autoplay before the user explicitly resumes.
  // - Earlier steps (booking / boarding / checkin) → just hydrate so the
  //   user lands back on whichever step they were on, no modal needed
  //   (nothing was "running" that would be jarring to interrupt).
  useEffect(() => {
    const a = loadActive();
    if (!a) return;
    // Persistence policy (see flightStore): only `step === 'inflight'` ever
    // gets written. Anything else in localStorage is either legacy data
    // from before that policy, or a step that no longer exists in the
    // current state machine — discard it either way.
    if (!VALID_STEPS.has(a.step) || a.step !== 'inflight') {
      saveActive(null);
      return;
    }
    setShowResume(true);
  }, []);

  // When nothing else is happening (no resume modal, no active flight, no
  // landing screen, no saved flight to resume), skip the "Book a flight"
  // intro and jump straight to the Booking step. The loadActive() recheck
  // covers the initial mount race where setShowResume(true) is queued but
  // the closure of this effect still has the stale `showResume=false`.
  useEffect(() => {
    if (!showResume && !active && !lastCompleted && !loadActive()) {
      startBooking();
    }
  }, [showResume, active, lastCompleted, startBooking]);

  function onResume() {
    setShowResume(false);
    // Resume button click is a user gesture — safe to wake AudioContext.
    audioBus.resume();
    // Now hydrate so the store (and <MusicLayer>) actually see the flight.
    hydrate();
    const a = useFlightStore.getState().active;

    if (
      a?.step === 'inflight' &&
      a.flight.startedAt &&
      a.flight.plannedSeconds &&
      isExpired(a.flight.startedAt, a.flight.plannedSeconds)
    ) {
      land();
      return;
    }

    if (a?.step === 'inflight') {
      audioBus.play('engine');
      // Music auto-starts via <MusicLayer> now that active is in the store.
    }
  }

  function onDiscard() {
    // Store is still empty (we never hydrated), but the legacy flight is in
    // localStorage. Clear it via the store action which also handles audio.
    hydrate();
    abort();
    setShowResume(false);
  }

  if (showResume) {
    return <ResumeModal onResume={onResume} onAbort={onDiscard} />;
  }

  if (!active && lastCompleted) return <Landed flight={lastCompleted} />;

  // When `active` is null and no Landed state, the auto-startBooking effect
  // above will create a fresh booking on the next render. Show nothing in
  // the meantime to avoid flashing an intermediate UI.
  if (!active) return null;

  function renderStep() {
    switch (active!.step) {
      case 'booking': return <Booking />;
      case 'boarding': return <BoardingPass />;
      case 'checkin': return <CheckIn />;
      case 'inflight': return <InFlight />;
      case 'landed': return <Landed flight={{ id: 'pending', category: '', plannedSeconds: 0, actualSeconds: 0, seat: '', startedAt: 0, completedAt: null, status: 'completed' }} />;
    }
  }

  return (
    <motion.div
      key={active.step}
      initial={{ x: 60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {renderStep()}
    </motion.div>
  );
}
