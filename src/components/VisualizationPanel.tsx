import { Component, Show, createSignal } from "solid-js";
import { useAppContext } from "../store";
import { FlywheelSimulation } from "../types";

// ============================================================
// Nice tick generator
// ============================================================
function niceTicks(min: number, max: number, targetCount = 8): number[] {
  const range = max - min;
  if (range <= 0) return [min, max];
  const rough = range / targetCount;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const residual = rough / mag;
  let step = mag;
  if (residual > 6) step = 5 * mag;
  else if (residual > 2.5) step = 2 * mag;
  const t0 = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let t = t0; t <= max + step * 0.5; t += step) {
    ticks.push(Math.round(t * 1e10) / 1e10);
  }
  return ticks;
}

// ============================================================
// Shared InteractiveChart wrapper
// ============================================================
interface ChartData {
  xMin: number; xMax: number;
  yMin: number; yMax: number;
  xLabel: string; yLabel: string;
  xTicks: number[];
  yTicks: number[];
  xFormat: (v: number) => string;
  yFormat: (v: number) => string;
  specialX: number[];
  specialY: number[];
  xVal: (sx: number) => number;
  yVal: (sy: number) => number;
  sx: (x: number) => number;
  sy: (y: number) => number;
}

interface InteractiveChartProps {
  data: () => ChartData | null;
  renderLines: (sx: (x: number) => number, sy: (y: number) => number) => any;
  renderValues: (x: number, y: number[], labels: string[], colors: string[]) => any;
  curveCount: number;
  curveLabels: string[];
  curveColors: string[];
}

const PAD = 45;

const InteractiveChart: Component<InteractiveChartProps> = (props) => {
  const [zoom, setZoom] = createSignal(1);
  const [panX, setPanX] = createSignal(0);
  const [panY, setPanY] = createSignal(0);
  const [drag, setDrag] = createSignal(false);
  const [mx, setMx] = createSignal(0);
  const [my, setMy] = createSignal(0);
  const [inChart, setInChart] = createSignal(false);
  let lastX = 0, lastY = 0;

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const d = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.5, Math.min(8, z * d)));
  };
  const onDn = (e: MouseEvent) => {
    if (e.button !== 0) return;
    setDrag(true);
    lastX = e.clientX; lastY = e.clientY;
  };
  const onMv = (e: MouseEvent) => {
    if (drag()) {
      setPanX(px => px + (e.clientX - lastX));
      setPanY(py => py + (e.clientY - lastY));
      lastX = e.clientX; lastY = e.clientY;
    }
    const svg = (e.currentTarget as Element).closest("svg");
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const rawX = e.clientX - r.left; const rawY = e.clientY - r.top;
    const scaleX = 600 / r.width; const scaleY = 300 / r.height;
    // Map to SVG space
    const vbX = -panX() / zoom() + rawX * scaleX / zoom();
    const vbY = -panY() / zoom() + rawY * scaleY / zoom();
    setMx(vbX); setMy(vbY);
  };
  const onUp = () => setDrag(false);

  const viewBox = () =>
    `${-panX() / zoom()} ${-panY() / zoom()} ${600 / zoom()} ${300 / zoom()}`;

  const d = () => props.data();
  const sx = (x: number) => d() ? d()!.sx(x) : PAD;
  const sy = (y: number) => d() ? d()!.sy(y) : 300 - PAD;
  const xVal = (svx: number) => d() ? d()!.xVal(svx) : 0;
  const yVal = (svy: number) => d() ? d()!.yVal(svy) : 0;
  const isInPlot = () => {
    const dd = d();
    if (!dd) return false;
    const xx = xVal(mx()), yy = yVal(my());
    return xx >= dd.xMin && xx <= dd.xMax && yy >= dd.yMin && yy <= dd.yMax;
  };

  // Soft snap: snap to nearest tick if within threshold (6 SVG units)
  const snapX = (v: number) => {
    const dd = d(); if (!dd) return v;
    const thresh = 6 / zoom();
    let best = v, bestD = thresh + 1;
    const check = (t: number) => { const dt = Math.abs(t - v); if (dt < bestD) { bestD = dt; best = t; } };
    for (const t of dd.xTicks) check(dd.sx(t));
    for (const t of dd.specialX) check(dd.sx(t));
    return bestD <= thresh ? best : v;
  };
  const snapY = (v: number) => {
    const dd = d(); if (!dd) return v;
    const thresh = 6 / zoom();
    let best = v, bestD = thresh + 1;
    const check = (t: number) => { const dt = Math.abs(t - v); if (dt < bestD) { bestD = dt; best = t; } };
    for (const t of dd.yTicks) check(dd.sy(t));
    for (const t of dd.specialY) check(dd.sy(t));
    return bestD <= thresh ? best : v;
  };

  const crossX = () => snapX(mx());
  const crossY = () => snapY(my());
  const crossValX = () => xVal(crossX());
  const crossValY = () => yVal(crossY());
  const crossSX = () => d()!.sx(crossValX());
  const crossSY = () => d()!.sy(crossValY());

  return (
    <div class="w-full h-48 overflow-hidden select-none"
      onWheel={onWheel}
      onMouseDown={onDn} onMouseMove={onMv} onMouseUp={onUp} onMouseLeave={onUp}
      style={{ cursor: drag() ? "grabbing" : "crosshair" }}>
      <svg width="100%" height="100%" viewBox={viewBox()}
        onMouseEnter={() => setInChart(true)} onMouseLeave={() => setInChart(false)}
        style={{ display: "block" }}>
        {d() && <>
          {/* Grid */}
          {d()!.xTicks.map(t => (
            <line x1={sx(t)} y1={PAD} x2={sx(t)} y2={300 - PAD} stroke="#1e293b" stroke-width="0.5" />
          ))}
          {d()!.yTicks.map(t => (
            <line x1={PAD} y1={sy(t)} x2={600 - PAD} y2={sy(t)} stroke="#1e293b" stroke-width="0.5" />
          ))}

          {/* Axes */}
          <line x1={PAD} y1={PAD} x2={PAD} y2={300 - PAD} stroke="#475569" stroke-width="1" />
          <line x1={PAD} y1={300 - PAD} x2={600 - PAD} y2={300 - PAD} stroke="#475569" stroke-width="1" />

          {/* Tick labels */}
          {d()!.xTicks.map(t => (
            <text x={sx(t)} y={300 - PAD + 13} text-anchor="middle" fill="#6B7280" font-size="9">{d()!.xFormat(t)}</text>
          ))}
          {d()!.yTicks.map(t => (
            <text x={PAD - 4} y={sy(t) + 3} text-anchor="end" fill="#6B7280" font-size="9">{d()!.yFormat(t)}</text>
          ))}

          {/* Special point markers */}
          {d()!.specialX.map((sp, i) => (
            <g>
              <line x1={sx(sp)} y1={PAD} x2={sx(sp)} y2={300 - PAD} stroke="#6366F1" stroke-width="0.5" stroke-dasharray="3 3" />
              <text x={sx(sp)} y={PAD - 3} text-anchor="middle" fill="#818CF8" font-size="8">{d()!.xFormat(sp)}</text>
            </g>
          ))}
          {d()!.specialY.map((sp, i) => (
            <g>
              <line x1={PAD} y1={sy(sp)} x2={600 - PAD} y2={sy(sp)} stroke="#6366F1" stroke-width="0.5" stroke-dasharray="3 3" />
              <text x={PAD - 4} y={sy(sp) - 3} text-anchor="end" fill="#818CF8" font-size="8">{d()!.yFormat(sp)}</text>
            </g>
          ))}

          {/* Data lines */}
          {props.renderLines(sx, sy)}

          {/* Crosshair */}
          {inChart() && isInPlot() && <>
            <line x1={crossX()} y1={PAD} x2={crossX()} y2={300 - PAD} stroke="#F59E0B" stroke-width="0.8" stroke-dasharray="4 2" />
            {props.curveCount > 0 && <line x1={PAD} y1={crossSY()} x2={600 - PAD} y2={crossSY()} stroke="#F59E0B" stroke-width="0.8" stroke-dasharray="4 2" />}

            {/* Crosshair values */}
            <rect x={crossX() + 6} y={PAD + 2} width="130" height={12 + props.curveLabels.length * 14} rx="3" fill="rgba(0,0,0,0.75)" />
            <text x={crossX() + 10} y={PAD + 13} fill="#F59E0B" font-size="9">{d()!.xLabel}: {d()!.xFormat(crossValX())}</text>
            {props.renderValues(crossValX(), [crossValY()], props.curveLabels, props.curveColors)}
          </>}

          {/* Legend */}
          <g transform={`translate(${600 - 140}, ${PAD + 4})`}>
            {props.curveLabels.map((l, i) => (
              <g transform={`translate(0, ${i * 14})`}>
                <line x1="0" y1="6" x2="16" y2="6" stroke={props.curveColors[i]} stroke-width="2" />
                <text x="20" y="10" fill="#9CA3AF" font-size="9">{l}</text>
              </g>
            ))}
          </g>
        </>}

        {/* Zoom indicator */}
        {d() && <text x={600 - 5} y={15} text-anchor="end" fill="#4B5563" font-size="8">
          {(zoom() * 100).toFixed(0)}%
        </text>}
      </svg>
    </div>
  );
};

// ============================================================
// Stress Chart
// ============================================================
const StressChart: Component<{ s: FlywheelSimulation }> = (props) => {
  const data = () => {
    const st = props.s.stress_rated;
    if (!st || !st.r || st.r.length === 0) return null;
    const xMin = 0;
    const xMax = Math.max(...st.r);
    const yMax = Math.max(...st.sigma_vm) * 1.1 || 1;
    const yMin = 0;
    const xRange = 600 - 2 * PAD;
    const yRange = 300 - 2 * PAD;
    const sx = (x: number) => PAD + (x / xMax) * xRange;
    const sy = (y: number) => 300 - PAD - (y / yMax) * yRange;
    const xVal = (svx: number) => ((svx - PAD) / xRange) * xMax;
    const yVal = (svy: number) => (1 - (svy - PAD) / yRange) * yMax;

    // Find special points: max stress radius
    let maxIdx = 0, maxV = 0;
    st.sigma_vm.forEach((v, i) => { if (v > maxV) { maxV = v; maxIdx = i; } });
    const specialX = [st.r[maxIdx]];
    const specialY = [maxV].filter(v => v > 0 && v < yMax);

    const xTicks = niceTicks(xMin, xMax, 6);
    const yTicks = niceTicks(yMin, yMax, 6);

    return { xMin, xMax, yMin, yMax,
      xLabel: "半径", yLabel: "应力",
      xTicks, yTicks, specialX, specialY,
      xFormat: (v: number) => v.toFixed(0) + "mm",
      yFormat: (v: number) => v.toFixed(0) + "MPa",
      xVal, yVal, sx, sy };
  };

  const curveColors = ["#EF4444", "#3B82F6", "#10B981"];
  const curveLabels = ["von Mises", "周向应力", "径向应力"];

  const renderLines = (sx: (x: number) => number, sy: (y: number) => number) => {
    const st = props.s.stress_rated;
    if (!st) return null;
    const paths = [
      st.sigma_vm.map((_: number, i: number) => `${i === 0 ? "M" : "L"}${sx(st.r[i])},${sy(st.sigma_vm[i])}`).join(" "),
      st.sigma_h.map((_: number, i: number) => `${i === 0 ? "M" : "L"}${sx(st.r[i])},${sy(st.sigma_h[i])}`).join(" "),
      st.sigma_r.map((_: number, i: number) => `${i === 0 ? "M" : "L"}${sx(st.r[i])},${sy(st.sigma_r[i])}`).join(" "),
    ];
    return paths.map((p, i) => <path d={p} fill="none" stroke={curveColors[i]} stroke-width="1.5" />);
  };

  const renderValues = (x: number, y: number[], labels: string[], colors: string[]) => {
    const st = props.s.stress_rated;
    if (!st) return null;
    // Interpolate each curve at x
    const interp = (arr: number[]) => {
      if (x <= st.r[0]) return arr[0];
      for (let i = 1; i < st.r.length; i++) {
        if (x <= st.r[i]) {
          const t = (x - st.r[i - 1]) / (st.r[i] - st.r[i - 1]);
          return arr[i - 1] + t * (arr[i] - arr[i - 1]);
        }
      }
      return arr[arr.length - 1];
    };
    return [st.sigma_vm, st.sigma_h, st.sigma_r].map((arr, i) => {
      const v = interp(arr);
      return <text x="-140" y={16 + i * 14} fill={curveColors[i]} font-size="9">
        {labels[i]}: {v.toFixed(1)} MPa
      </text>;
    });
  };

  return <InteractiveChart data={data} renderLines={renderLines} renderValues={renderValues}
    curveCount={1} curveLabels={curveLabels} curveColors={curveColors} />;
};

// ============================================================
// RPM Chart
// ============================================================
const RpmChart: Component<{ s: FlywheelSimulation }> = (props) => {
  const data = () => {
    const t = props.s.time_curve;
    const r = props.s.rpm_curve;
    if (!t || t.length === 0) return null;
    const xMax = Math.max(...t);
    const yMax = Math.max(...r);
    const yMin = Math.min(...r);
    const pad = 0.05 * (yMax - yMin || 1);
    const xRange = 600 - 2 * PAD;
    const yRange = 300 - 2 * PAD;
    const sx = (x: number) => PAD + (x / xMax) * xRange;
    const sy = (y: number) => 300 - PAD - ((y - yMin + pad) / (yMax - yMin + 2 * pad)) * yRange;
    const xVal = (svx: number) => ((svx - PAD) / xRange) * xMax;
    const yVal = (svy: number) => yMin - pad + (1 - (svy - PAD) / yRange) * (yMax - yMin + 2 * pad);

    const rated = props.s.params?.rpm_rated || 0;
    const specialX: number[] = [];
    const specialY: number[] = [];
    if (rated > yMin && rated < yMax) specialY.push(rated);

    return {
      xMin: 0, xMax, yMin: yMin - pad, yMax: yMax + pad,
      xLabel: "时间", yLabel: "转速",
      xTicks: niceTicks(0, xMax, 6),
      yTicks: niceTicks(yMin - pad, yMax + pad, 6),
      specialX, specialY,
      xFormat: (v: number) => v.toFixed(1) + "s",
      yFormat: (v: number) => v.toFixed(0) + "rpm",
      xVal, yVal, sx, sy,
    };
  };

  const curveColors = ["#3B82F6"];
  const curveLabels = ["转速"];

  const renderLines = (sx: (x: number) => number, sy: (y: number) => number) => {
    const t = props.s.time_curve, r = props.s.rpm_curve;
    const path = t.map((tv: number, i: number) =>
      `${i === 0 ? "M" : "L"}${sx(tv)},${sy(r[i])}`).join(" ");
    return <path d={path} fill="none" stroke={curveColors[0]} stroke-width="1.5" />;
  };

  const renderValues = (x: number, _y: number[], labels: string[], colors: string[]) => {
    const t = props.s.time_curve, r = props.s.rpm_curve;
    if (x <= t[0]) return <text x="-140" y={16} fill="#3B82F6" font-size="9">转速: {r[0].toFixed(0)} rpm</text>;
    for (let i = 1; i < t.length; i++) {
      if (x <= t[i]) {
        const frac = (x - t[i - 1]) / (t[i] - t[i - 1]);
        const v = r[i - 1] + frac * (r[i] - r[i - 1]);
        return <text x="-140" y={16} fill="#3B82F6" font-size="9">转速: {v.toFixed(0)} rpm</text>;
      }
    }
    return null;
  };

  return <InteractiveChart data={data} renderLines={renderLines} renderValues={renderValues}
    curveCount={1} curveLabels={curveLabels} curveColors={curveColors} />;
};

// ============================================================
// Energy Chart (Bar chart)
// ============================================================
const EnergyChart: Component<{ s: FlywheelSimulation }> = (props) => {
  const bars = () => [
    { label: "额定", value: props.s.energy_rated, color: "#3B82F6" },
    { label: "最大", value: props.s.energy_max, color: "#10B981" },
    { label: "可用", value: props.s.energy_usable, color: "#F59E0B" },
  ];

  const data = () => {
    const vals = bars().map(b => b.value);
    const yMax = Math.max(...vals) * 1.2 || 1;
    const yMin = 0;
    const barCount = 3;
    const barW = 80, gap = 40;
    const totalW = barW * barCount + gap * (barCount - 1);
    const xMin = PAD + (600 - 2 * PAD - totalW) / 2;
    const xRange = 600 - 2 * PAD;
    const yRange = 300 - 2 * PAD;
    const sx = (x: number) => PAD + ((x - xMin) / totalW) * 1500;
    const sy = (y: number) => 300 - PAD - (y / yMax) * yRange;
    const xVal = (svx: number) => ((svx - PAD) / xRange) * 6000;
    const yVal = (svy: number) => (1 - (svy - PAD) / yRange) * yMax;

    return {
      xMin: 0, xMax: 6000, yMin, yMax,
      xLabel: "", yLabel: "能量",
      xTicks: [], // bar chart hides x ticks (use bar labels)
      yTicks: niceTicks(0, yMax, 5),
      specialX: [], specialY: [],
      xFormat: (_: number) => "",
      yFormat: (v: number) => v.toFixed(1) + "kJ",
      xVal, yVal, sx, sy,
    };
  };

  const curveColors = ["#3B82F6", "#10B981", "#F59E0B"];
  const curveLabels = ["额定", "最大", "可用"];

  const BARS_DATA = bars();

  const renderLines = (sx: (x: number) => number, sy: (y: number) => number) => {
    const data = BARS_DATA;
    const totalW = 300;
    const xStart = (600 - totalW) / 2;
    return data.map((b, i) => {
      const bx = xStart + i * 110;
      return <g>
        <rect x={bx} y={sy(b.value)} width="80" height={300 - PAD - sy(b.value)} fill={b.color} rx="3" />
        <text x={bx + 40} y={300 - PAD + 13} text-anchor="middle" fill="#9CA3AF" font-size="9">{b.label}</text>
        <text x={bx + 40} y={sy(b.value) - 4} text-anchor="middle" fill={b.color} font-size="9">{b.value.toFixed(1)}</text>
      </g>;
    });
  };

  const renderValues = (_x: number, _y: number[], _labels: string[], _colors: string[]) => {
    return null; // Bar chart uses bar labels
  };

  return (
    <div class="w-full h-48 select-none">
      <svg width="100%" height="100%" viewBox={`0 0 600 300`} style={{ display: "block" }}>
        {data() && <>
          {/* Y grid */}
          {data()!.yTicks.map(t => (
            <line x1={PAD} y1={data()!.sy(t)} x2={600 - PAD} y2={data()!.sy(t)} stroke="#1e293b" stroke-width="0.5" />
          ))}
          <line x1={PAD} y1={PAD} x2={PAD} y2={300 - PAD} stroke="#475569" stroke-width="1" />
          <line x1={PAD} y1={300 - PAD} x2={600 - PAD} y2={300 - PAD} stroke="#475569" stroke-width="1" />
          {data()!.yTicks.map(t => (
            <text x={PAD - 4} y={data()!.sy(t) + 3} text-anchor="end" fill="#6B7280" font-size="9">{data()!.yFormat(t)}</text>
          ))}
          {renderLines(data()!.sx, data()!.sy)}
        </>}
      </svg>
    </div>
  );
};

// ============================================================
// Main Panel
// ============================================================
const VisualizationPanel: Component = () => {
  const ctx = useAppContext();
  const sim = () => ctx.state().simulation;
  const [activeChart, setActiveChart] = createSignal<"stress" | "rpm" | "energy">("stress");

  const chartBtn = (id: "stress" | "rpm" | "energy", label: string) => (
    <button onClick={() => setActiveChart(id)}
      class={`px-2.5 py-1 text-xs rounded transition-colors ${
        activeChart() === id ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-400 hover:bg-gray-600"
      }`}>{label}</button>
  );

  return (
    <div class="space-y-3 h-full flex flex-col">
      <div class="flex items-center justify-between flex-shrink-0">
        <h2 class="text-xs font-semibold text-gray-400">可视化</h2>
        <div class="flex space-x-1">
          {chartBtn("stress", "应力")}
          {chartBtn("rpm", "转速")}
          {chartBtn("energy", "能量")}
        </div>
      </div>
      <Show when={sim()} fallback={
        <div class="text-center py-16 text-gray-500">
          <svg class="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          <p class="text-sm">修改参数后自动计算</p>
        </div>
      }>
        <div class="bg-gray-800 rounded p-3 border border-gray-700 flex-1 min-h-0 flex flex-col">
          <h3 class="text-[10px] font-medium text-gray-400 mb-1 flex-shrink-0">
            {activeChart() === "stress" && "径向应力分布"}
            {activeChart() === "rpm" && "转速-时间曲线"}
            {activeChart() === "energy" && "能量特性"}
          </h3>
          <div class="flex-1 min-h-0">
            {activeChart() === "stress" && <StressChart s={sim()!} />}
            {activeChart() === "rpm" && <RpmChart s={sim()!} />}
            {activeChart() === "energy" && <EnergyChart s={sim()!} />}
          </div>
        </div>
      </Show>
    </div>
  );
};

export default VisualizationPanel;
