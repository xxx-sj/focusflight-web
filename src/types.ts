// src/types.ts

export type FlightStep = 'booking' | 'boarding' | 'checkin' | 'inflight' | 'landed';

export type Flight = {
  id: string;
  category: string;
  plannedSeconds: number;
  actualSeconds: number;
  seat: string;
  startedAt: number;
  completedAt: number | null;
  status: 'completed' | 'aborted';
};

export type Category = {
  id: string;
  label: string;
  color: string;
};

export type Settings = {
  categories: Category[];
  defaultDurationMinutes: number;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  volume: number;
  musicVolume: number;
};

export type ActiveFlight = {
  step: FlightStep;
  flight: Partial<Flight>;
  lofiTrack?: string | null;
  origin?: string | null;       // country code (ISO 3166-1 alpha-2)
  destination?: string | null;  // country code
};
