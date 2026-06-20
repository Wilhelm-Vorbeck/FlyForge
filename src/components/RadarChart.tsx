/**
 * Radar chart for multi-scheme comparison.
 * Pure SVG — no external dependencies.
 */
import { Component, For } from "solid-js";

export interface RadarDatum {
  label: string;
  value: number; // normalized 0~1
}

export interface RadarSeries {
  name: string;
  color: string;
  data: RadarDatum[];
}

interface RadarChartProps {
  /** Axis labels (one per vertex) */
  axes: string[];
  /** Data series to overlay */
  series: RadarSeries[];
  /** Chart size in px */
  size?: number;
}

const W = 300;
const PAD = 40;
const CX = W / 2;
const CY = W / 2;
const R = W / 2 - PAD;

export const RadarChart: Component<RadarChartProps> = (props) => {
  const size = () => props.size ?? W;
  const n = () => props.axes.length;
  const angle = (i: number) => (Math.PI * 2 * i) / n() - Math.PI / 2;

  const toXY = (i: number, value: number) => {
    const a = angle(i);
    return [CX + R * value * Math.cos(a), CY + R * value * Math.sin(a)];
  };

  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  return (
    <svg width={size()} height={size()} viewBox={`0 0 ${W} ${W}`} class="mx-auto">
      {/* Grid rings */}
      <For each={gridLevels}>
        {(level) => (
          <polygon
            points={Array.from({ length: n() }, (_, i) => toXY(i, level).join(",")).join(" ")}
            fill="none"
            stroke="#1a3a2a"
            stroke-width="0.5"
          />
        )}
      </For>

      {/* Axis lines */}
      <For each={Array.from({ length: n() }, (_, i) => i)}>
        {(i) => {
          const [x, y] = toXY(i, 1);
          return <line x1={CX} y1={CY} x2={x} y2={y} stroke="#1a3a2a" stroke-width="0.5" />;
        }}
      </For>

      {/* Axis labels */}
      <For each={props.axes}>
        {(label, i) => {
          const [x, y] = toXY(i(), 1.18);
          return (
            <text
              x={x}
              y={y}
              text-anchor="middle"
              dominant-baseline="middle"
              fill="#9ca3af"
              font-size="8"
            >
              {label}
            </text>
          );
        }}
      </For>

      {/* Data series polygons */}
      <For each={props.series}>
        {(s) => {
          const points = s.data.map((d, i) => toXY(i, d.value).join(",")).join(" ");
          return (
            <g>
              <polygon
                points={points}
                fill={s.color}
                fill-opacity="0.1"
                stroke={s.color}
                stroke-width="1.5"
              />
              {/* Dots */}
              <For each={s.data}>
                {(d, i) => {
                  const [cx, cy] = toXY(i(), d.value);
                  return <circle cx={cx} cy={cy} r="2.5" fill={s.color} />;
                }}
              </For>
            </g>
          );
        }}
      </For>
    </svg>
  );
};

export default RadarChart;
