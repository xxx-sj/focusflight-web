import { useMemo } from 'react';
import { geoEquirectangular, geoPath, geoInterpolate, type GeoProjection } from 'd3-geo';
import { feature } from 'topojson-client';
import type { FeatureCollection, Geometry } from 'geojson';
import type { Topology } from 'topojson-specification';
import worldData from 'world-atlas/countries-50m.json';
import type { Country } from '../data/countries';

const MAP_W = 1000;
const MAP_H = 500;

// Build projection once. Equirectangular keeps things readable at small sizes.
const projection: GeoProjection = geoEquirectangular()
  .scale(MAP_W / (2 * Math.PI))
  .translate([MAP_W / 2, MAP_H / 2]);

const pathBuilder = geoPath(projection);

// Cast the bundled TopoJSON to its typed form once.
const topology = worldData as unknown as Topology;
const countriesFeature = feature(
  topology,
  topology.objects.countries,
) as FeatureCollection<Geometry>;

function projectLatLng(lng: number, lat: number): [number, number] {
  return projection([lng, lat]) ?? [0, 0];
}

function Marker({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g>
      {/* Outer ring */}
      <circle cx={x} cy={y} r={6} fill="none" stroke="white" strokeWidth={1.2} strokeOpacity={0.6} />
      {/* Solid center */}
      <circle cx={x} cy={y} r={2.8} fill="white" />
      {/* Label with subtle background pad */}
      <text
        x={x + 10}
        y={y + 3.5}
        fontSize={9}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fontWeight={700}
        fill="white"
        paintOrder="stroke"
        stroke="black"
        strokeWidth={3}
        strokeLinejoin="round"
      >
        {label}
      </text>
    </g>
  );
}

/** Top-down airplane silhouette (fuselage, swept wings, tail). Tip points right (x+). */
function Plane() {
  return (
    <g>
      {/* Soft halo so the plane pops against the dark map */}
      <circle r={6} fill="#F4A261" opacity={0.22} />
      <path
        d="M 8,0
           L 2.6,-1
           L 0.6,-4.6
           L -1.3,-4.6
           L -0.6,-1
           L -5.3,-1
           L -6.6,-2.3
           L -8,-2.3
           L -7,0
           L -8,2.3
           L -6.6,2.3
           L -5.3,1
           L -0.6,1
           L -1.3,4.6
           L 0.6,4.6
           L 2.6,1
           Z"
        fill="#F4A261"
        stroke="#0A1628"
        strokeWidth={0.4}
        strokeLinejoin="round"
      />
    </g>
  );
}

type Props = {
  origin?: Country | null;
  destination?: Country | null;
  progress?: number; // 0..1
  className?: string;
};

export default function WorldMap({
  origin,
  destination,
  progress = 0,
  className = '',
}: Props) {
  // Memoize the long `d` string for the world geometry so we don't recompute
  // it on every progress tick.
  const worldPathD = useMemo(() => {
    const parts: string[] = [];
    for (const f of countriesFeature.features) {
      const d = pathBuilder(f);
      if (d) parts.push(d);
    }
    return parts.join(' ');
  }, []);

  const o = origin ? projectLatLng(origin.lng, origin.lat) : null;
  const d = destination ? projectLatLng(destination.lng, destination.lat) : null;

  let pathD = '';
  let planePos: [number, number] = [0, 0];
  let planeAngle = 0;
  if (origin && destination && o && d) {
    // True great-circle path: sample ~96 points along the geodesic between
    // origin and destination, project each to screen space, and draw as a
    // polyline. Detect antimeridian crossings (where projected x jumps by
    // more than half the map width) and break the polyline at those points
    // so the line wraps around the edges instead of slicing across the map.
    const interp = geoInterpolate(
      [origin.lng, origin.lat],
      [destination.lng, destination.lat],
    );
    const samples = 96;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const [lng, lat] = interp(t);
      pts.push(projectLatLng(lng, lat));
    }

    const segments: Array<Array<[number, number]>> = [[]];
    for (let i = 0; i < pts.length; i++) {
      if (i > 0 && Math.abs(pts[i][0] - pts[i - 1][0]) > MAP_W / 2) {
        // antimeridian jump → start a new segment
        segments.push([]);
      }
      segments[segments.length - 1].push(pts[i]);
    }
    pathD = segments
      .filter((s) => s.length > 1)
      .map((s) => s.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]},${p[1]}`).join(' '))
      .join(' ');

    // Plane position along the great-circle at current progress.
    const tp = Math.max(0, Math.min(1, progress));
    const [pLng, pLat] = interp(tp);
    planePos = projectLatLng(pLng, pLat);

    // Tangent angle: project a tiny step ahead (or behind near the end) to
    // figure out which way the plane should face. If the step crosses the
    // antimeridian, fall back to the previous angle by mirroring x-component
    // sign — keeps the plane facing sanely even at the wrap-around.
    const tAhead = Math.min(1, tp + 0.005);
    const tBehind = Math.max(0, tp - 0.005);
    const [aLng, aLat] = interp(tAhead);
    const [bLng, bLat] = interp(tBehind);
    const ahead = projectLatLng(aLng, aLat);
    const behind = projectLatLng(bLng, bLat);
    const dx = ahead[0] - behind[0];
    const dy = ahead[1] - behind[1];
    const useDx = Math.abs(dx) > MAP_W / 2 ? -Math.sign(dx) * (MAP_W - Math.abs(dx)) : dx;
    planeAngle = (Math.atan2(dy, useDx) * 180) / Math.PI;
  }

  return (
    <svg
      viewBox={`0 0 ${MAP_W} ${MAP_H}`}
      // "slice" makes the map cover the entire container, cropping the
      // less-interesting poles on wide screens and the Pacific edges on
      // narrow ones — the focus stays on the active flight path either way.
      preserveAspectRatio="xMidYMid slice"
      className={className}
    >
      {/* Continents from world-atlas TopoJSON */}
      <path
        d={worldPathD}
        fill="rgba(255,255,255,0.04)"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth={0.5}
        strokeLinejoin="round"
      />

      {/* Flight path (dashed) */}
      {pathD && (
        <path
          d={pathD}
          stroke="white"
          strokeWidth={1.6}
          fill="none"
          strokeDasharray="6 6"
          strokeLinecap="round"
          opacity={0.9}
        />
      )}

      {/* Origin / destination markers */}
      {o && origin && (
        <Marker x={o[0]} y={o[1]} label={`${origin.iata} · ${origin.nameKo}`} />
      )}
      {d && destination && (
        <Marker x={d[0]} y={d[1]} label={`${destination.iata} · ${destination.nameKo}`} />
      )}

      {/* Plane (only when route exists) */}
      {o && d && (
        <g transform={`translate(${planePos[0]} ${planePos[1]}) rotate(${planeAngle})`}>
          <Plane />
        </g>
      )}
    </svg>
  );
}
