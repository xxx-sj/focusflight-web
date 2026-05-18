import { useMemo } from 'react';
import { geoEquirectangular, geoPath, type GeoProjection } from 'd3-geo';
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
      <path
        d="M 12,0
           L 4,-1.5
           L 1,-7
           L -2,-7
           L -1,-1.5
           L -8,-1.5
           L -10,-3.5
           L -12,-3.5
           L -10.5,0
           L -12,3.5
           L -10,3.5
           L -8,1.5
           L -1,1.5
           L -2,7
           L 1,7
           L 4,1.5
           Z"
        fill="white"
        stroke="white"
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
  if (o && d) {
    const midX = (o[0] + d[0]) / 2;
    // Arc above; lift scales with horizontal distance.
    const arcLift = Math.min(180, Math.abs(d[0] - o[0]) * 0.25 + 40);
    const midY = (o[1] + d[1]) / 2 - arcLift;
    pathD = `M ${o[0]},${o[1]} Q ${midX},${midY} ${d[0]},${d[1]}`;

    const t = Math.max(0, Math.min(1, progress));
    const x = (1 - t) ** 2 * o[0] + 2 * (1 - t) * t * midX + t ** 2 * d[0];
    const y = (1 - t) ** 2 * o[1] + 2 * (1 - t) * t * midY + t ** 2 * d[1];
    planePos = [x, y];

    // Tangent for rotation
    const dx = 2 * (1 - t) * (midX - o[0]) + 2 * t * (d[0] - midX);
    const dy = 2 * (1 - t) * (midY - o[1]) + 2 * t * (d[1] - midY);
    planeAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
  }

  return (
    <svg
      viewBox={`0 0 ${MAP_W} ${MAP_H}`}
      preserveAspectRatio="xMidYMid meet"
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
