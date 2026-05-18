import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useFlightStore } from '../store/flightStore';
import { loadActive } from '../lib/storage';
import { isExpired } from '../lib/timer';
import { audioBus } from '../lib/audio';
import ResumeModal from './ResumeModal';
import Booking from './steps/Booking';
import SeatSelection from './steps/SeatSelection';
import BoardingPass from './steps/BoardingPass';
import CheckIn from './steps/CheckIn';
import InFlight from './steps/InFlight';
import Landed from './steps/Landed';

export default function FlightMachine() {
  const { active, lastCompleted, hydrate, startBooking, abort, land } = useFlightStore();
  const [showResume, setShowResume] = useState(false);

  useEffect(() => {
    const a = loadActive();
    if (a) setShowResume(true);
    hydrate();
  }, [hydrate]);

  function onResume() {
    setShowResume(false);
    const a = useFlightStore.getState().active;

    // Resume button click is a user gesture — safe to wake AudioContext.
    audioBus.resume();

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
      // Music auto-restarts via <MusicLayer> based on active.step / lofiTrack.
    }
  }

  function onDiscard() {
    abort();
    setShowResume(false);
  }

  if (showResume) {
    return <ResumeModal onResume={onResume} onAbort={onDiscard} />;
  }

  if (!active && lastCompleted) return <Landed flight={lastCompleted} />;

  if (!active) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-3xl font-bold mb-6">FocusFlight</h1>
        <button onClick={startBooking} className="bg-orange-500 text-white px-6 py-3 rounded-lg">
          Book a flight
        </button>
      </div>
    );
  }

  function renderStep() {
    switch (active!.step) {
      case 'booking': return <Booking />;
      case 'seat': return <SeatSelection />;
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
