import { useEffect, useRef } from 'react';
import maplibregl, { type Map as MlMap, type Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { greatCircle } from '@turf/great-circle';
import { point } from '@turf/helpers';
import type { Feature, LineString, Position } from 'geojson';
export type ViewMode = 'overview' | 'follow';

// A map endpoint: airport, country, or any lat/lng pair with a short label.
export type MapPoint = {
  code: string;
  lat: number;
  lng: number;
};

type Props = {
  origin: MapPoint | null;
  destination: MapPoint | null;
  // Flight clock. The map runs its own requestAnimationFrame loop and reads
  // current progress from `(Date.now() - startedAt) / (plannedSeconds * 1000)`
  // every frame, so plane + camera motion stays smooth at any zoom level
  // regardless of the parent's React tick rate.
  startedAt: number | null;
  plannedSeconds: number | null;
  mode: ViewMode;
  followZoom?: number;
  overviewZoom?: number;
  satellite?: boolean;
  className?: string;
};

// OpenFreeMap dark style — fully free, no API key, OSM-derived vector tiles.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';

// ESRI World Imagery — free raster satellite tiles, no API key. Attribution required.
const SATELLITE_STYLE = {
  version: 8 as const,
  sources: {
    'esri-satellite': {
      type: 'raster' as const,
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: 'Tiles © Esri',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'esri-satellite',
      type: 'raster' as const,
      source: 'esri-satellite',
    },
  ],
};

const PATH_NPOINTS = 1000;

function buildPath(o: MapPoint, d: MapPoint): Position[] {
  const path = greatCircle(point([o.lng, o.lat]), point([d.lng, d.lat]), {
    npoints: PATH_NPOINTS,
  }) as Feature<LineString>;
  return path.geometry.coordinates as Position[];
}

function bearingDeg(from: Position, to: Position): number {
  const lon1 = (from[0] * Math.PI) / 180;
  const lon2 = (to[0] * Math.PI) / 180;
  const lat1 = (from[1] * Math.PI) / 180;
  const lat2 = (to[1] * Math.PI) / 180;
  const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

function makePlaneEl(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText =
    'width:56px;height:56px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.65))';
  el.innerHTML = `
    <svg viewBox="-12 -12 24 24" width="56" height="56">
      <circle r="9" fill="#F4A261" opacity="0.18"/>
      <path d="M 8,0 L 2.6,-1 L 0.6,-4.6 L -1.3,-4.6 L -0.6,-1 L -5.3,-1 L -6.6,-2.3 L -8,-2.3 L -7,0 L -8,2.3 L -6.6,2.3 L -5.3,1 L -0.6,1 L -1.3,4.6 L 0.6,4.6 L 2.6,1 Z"
        fill="#F4A261" stroke="#0A1628" stroke-width="0.4" stroke-linejoin="round"/>
    </svg>
  `;
  return el;
}

function makeDotEl(color: string): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = `width:12px;height:12px;border-radius:50%;background:${color};box-shadow:0 0 0 4px ${color}40`;
  return el;
}

export default function FlightMap({ origin, destination, startedAt, plannedSeconds, mode, followZoom = 8.5, overviewZoom = 3, satellite = false, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const planeRef = useRef<Marker | null>(null);
  const pathRef = useRef<Position[]>([]);
  // Fixed camera bearing — the initial great-circle bearing from origin to
  // destination. Using a constant bearing avoids steep-pitch swaying: with
  // pitch 72° the camera orbits the plane on each bearing change, so even a
  // 0.1° tracking adjustment moves the visible world noticeably side-to-side.
  const cameraBearingRef = useRef<number>(0);
  const loadedRef = useRef<boolean>(false);
  // Latest props mirrored into refs so the rAF loop always reads the freshest
  // values without restarting the animation when they change.
  const modeRef = useRef(mode);
  const followZoomRef = useRef(followZoom);
  const overviewZoomRef = useRef(overviewZoom);
  const startedAtRef = useRef(startedAt);
  const plannedSecondsRef = useRef(plannedSeconds);
  modeRef.current = mode;
  followZoomRef.current = followZoom;
  overviewZoomRef.current = overviewZoom;
  startedAtRef.current = startedAt;
  plannedSecondsRef.current = plannedSeconds;

  // Initialize the map once per (origin, destination) pair.
  useEffect(() => {
    if (!containerRef.current) return;

    const initialCenter: [number, number] = origin
      ? [origin.lng, origin.lat]
      : [0, 20];

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: satellite ? SATELLITE_STYLE : STYLE_URL,
      center: initialCenter,
      zoom: 2,
      pitch: 0,
      bearing: 0,
      interactive: false,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.on('load', () => {
      loadedRef.current = true;

      if (origin && destination) {
        const path = greatCircle(point([origin.lng, origin.lat]), point([destination.lng, destination.lat]), {
          npoints: PATH_NPOINTS,
        }) as Feature<LineString>;

        map.addSource('flight-path', { type: 'geojson', data: path });
        map.addLayer({
          id: 'flight-path-line',
          type: 'line',
          source: 'flight-path',
          layout: { 'line-cap': 'round' },
          paint: {
            'line-color': '#ffffff',
            'line-width': 1.6,
            'line-dasharray': [3, 3],
            'line-opacity': 0.9,
          },
        });

        // Static markers
        new maplibregl.Marker({ element: makeDotEl('#ffffff'), anchor: 'center' })
          .setLngLat([origin.lng, origin.lat])
          .addTo(map);
        new maplibregl.Marker({ element: makeDotEl('#F4A261'), anchor: 'center' })
          .setLngLat([destination.lng, destination.lat])
          .addTo(map);

        const fixedBearing = bearingDeg(
          [origin.lng, origin.lat],
          [destination.lng, destination.lat],
        );
        cameraBearingRef.current = fixedBearing;

        // Animated plane. Both position and (one-time) rotation are set
        // here — the silhouette is pinned to the initial great-circle
        // bearing, matching the camera, so neither marker nor camera
        // rotates during flight (per-frame rotation read as swaying at
        // high zoom on satellite tiles).
        planeRef.current = new maplibregl.Marker({
          element: makePlaneEl(),
          anchor: 'center',
          rotationAlignment: 'map',
          rotation: fixedBearing - 90,
        })
          .setLngLat([origin.lng, origin.lat])
          .addTo(map);

        pathRef.current = buildPath(origin, destination);
      }
    });

    return () => {
      loadedRef.current = false;
      planeRef.current = null;
      pathRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // Recreate when origin/destination/satellite changes. (Satellite needs a
    // full re-init because MapLibre's setStyle would otherwise drop our
    // custom layers + markers and require re-installation.)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin?.code, destination?.code, satellite]);

  // Drive plane + camera at the display's refresh rate (typically 60fps) via
  // requestAnimationFrame. Reads progress/mode/zoom from refs so prop changes
  // don't cancel and restart the loop. Uses jumpTo (instant) for the camera
  // because each frame is already a tiny step — easeTo with queued tweens
  // was visibly stuttering at high follow-zoom levels.
  useEffect(() => {
    let raf = 0;
    let lastMode: ViewMode | null = null;
    let lastOverviewZoom = -1;

    function frame() {
      const map = mapRef.current;
      const path = pathRef.current;
      const plane = planeRef.current;
      if (!map || !loadedRef.current || !plane || path.length === 0) {
        raf = requestAnimationFrame(frame);
        return;
      }

      const started = startedAtRef.current;
      const planned = plannedSecondsRef.current;
      const t =
        started && planned
          ? Math.max(0, Math.min(1, (Date.now() - started) / (planned * 1000)))
          : 0;

      const last = path.length - 1;
      const scaled = t * last;
      const idx = Math.min(last, Math.floor(scaled));
      const next = Math.min(last, idx + 1);
      const frac = scaled - idx;
      const a = path[idx];
      const b = path[next];
      const pos: [number, number] = [
        a[0] + frac * (b[0] - a[0]),
        a[1] + frac * (b[1] - a[1]),
      ];

      // Plane position only — rotation was pinned at marker creation to the
      // initial great-circle bearing so the silhouette doesn't twist on
      // every frame (was perceptible as swaying on satellite tiles).
      plane.setLngLat(pos);

      const currentMode = modeRef.current;
      if (currentMode === 'follow') {
        map.jumpTo({
          center: pos,
          zoom: followZoomRef.current,
          pitch: 72,
          bearing: cameraBearingRef.current,
        });
        lastMode = 'follow';
      } else if (origin && destination) {
        // Overview camera only needs to move when the user changes zoom or
        // when mode flips back from follow — pin it once with a brief easeTo
        // for a nice transition, then skip until something changes.
        const z = overviewZoomRef.current;
        if (lastMode !== 'overview' || z !== lastOverviewZoom) {
          const mid: [number, number] = [
            (origin.lng + destination.lng) / 2,
            (origin.lat + destination.lat) / 2,
          ];
          map.easeTo({
            center: mid,
            zoom: z,
            pitch: 0,
            bearing: 0,
            duration: 400,
            essential: true,
          });
          lastMode = 'overview';
          lastOverviewZoom = z;
        }
      }

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // Stable keys — origin/destination object identity changes every render
    // (resolveLocation creates fresh objects), but the underlying code +
    // lat/lng don't, so restarting the loop each render was needless churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin?.code, destination?.code]);

  return <div ref={containerRef} className={className} style={{ background: '#000' }} />;
}
