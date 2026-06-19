import { Component, Show, createSignal, createResource } from "solid-js";
import { useAppContext } from "../store";
import { FlywheelSimulation } from "../types";
import { runSensitivitySweep, computeThermalStress, getSNCurve } from "../services/api";

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
  for (let t = t0; t <= max + step * 0.5; t += step)
    ticks.push(Math.round(t * 1e10) / 1e10);
  return ticks;
}

// ============================================================
// Shared InteractiveChart — zoom + pan + cursor-as-crosshair
// ============================================================
const W = 800, H = 400, PAD = 50;

interface ChartData {
  xMin: number; xMax: number; yMin: number; yMax: number;
  xLabel: string; yLabel: string;
  xTicks: number[]; yTicks: number[];
  xFormat: (v: number) => string;
  yFormat: (v: number) => string;
  specialX: number[]; specialY: number[];
  xVal: (sx: number) => number; yVal: (sy: number) => number;
  sx: (x: number) => number; sy: (y: number) => number;
}

interface InteractiveChartProps {
  data: () => ChartData | null;
  renderLines: (sx: (x: number) => number, sy: (y: number) => number) => any;
  renderValues: (ox: number, oy: number, x: number, labels: string[], colors: string[]) => any;
  curveCount: number;
  curveLabels: string[];
  curveColors: string[];
}

const InteractiveChart: Component<InteractiveChartProps> = (props) => {
  const [zoom, setZoom] = createSignal(1);
  const [panX, setPanX] = createSignal(0);
  const [panY, setPanY] = createSignal(0);
  const [drag, setDrag] = createSignal(false);
  const [mx, setMx] = createSignal(400);
  const [my, setMy] = createSignal(200);
  const [inChart, setInChart] = createSignal(false);
  let svgRef: SVGSVGElement | undefined;
  let lastX = 0, lastY = 0;

  const reset = () => { setZoom(1); setPanX(0); setPanY(0); };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (!inChart()) return;
    // Forward scroll (deltaY < 0) = zoom OUT, backward = zoom IN
    const f = e.deltaY < 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.3, Math.min(6, z * f)));
  };

  const onDn = (e: MouseEvent) => {
    if (e.button !== 0) return;
    setDrag(true);
    lastX = e.clientX; lastY = e.clientY;
  };

  const onMv = (e: MouseEvent) => {
    if (!svgRef) return;
    // Drag
    if (drag()) {
      setPanX(px => px + (e.clientX - lastX) / zoom());
      setPanY(py => py + (e.clientY - lastY) / zoom());
      lastX = e.clientX; lastY = e.clientY;
    }
    // Crosshair
    const r = svgRef.getBoundingClientRect();
    const rawX = (e.clientX - r.left) * (W / r.width);
    const rawY = (e.clientY - r.top) * (H / r.height);
    setMx(-panX() * zoom() + rawX);
    setMy(-panY() * zoom() + rawY);
  };

  const onUp = () => setDrag(false);

  const viewBox = () =>
    `${-panX() * zoom()} ${-panY() * zoom()} ${W * zoom()} ${H * zoom()}`;

  const d = () => props.data();

  const isInPlot = () => {
    const dd = d(); if (!dd) return false;
    const xx = xVal(mx()), yy = yVal(my());
    return xx >= dd.xMin && xx <= dd.xMax && yy >= dd.yMin && yy <= dd.yMax;
  };

  const sx = (x: number) => d() ? d()!.sx(x) : PAD;
  const sy = (y: number) => d() ? d()!.sy(y) : H - PAD;
  const xVal = (svx: number) => d() ? d()!.xVal(svx) : 0;
  const yVal = (svy: number) => d() ? d()!.yVal(svy) : 0;
  const crossValX = () => xVal(mx());
  const crossValY = () => yVal(my());

  // Floating label position: follow mouse but stay inside chart
  const labelX = () => Math.min(mx() + 10, W - 160);
  const labelY = () => Math.max(PAD + 2, my() - (12 + props.curveLabels.length * 14) - 4);

  return (
    <div class="w-full h-full flex flex-col min-h-0 select-none">
      {/* Top bar: reset + zoom% */}
      <div class="flex-shrink-0 flex justify-end items-center mb-1 space-x-2">
        <span class="text-[9px] text-gray-500 bg-[#0d1419]/80 px-1.5 py-0.5 rounded">
          {(zoom() * 100).toFixed(0)}% | 滚轮缩放·拖拽
        </span>
        <button onClick={reset}
          class="text-[9px] px-2 py-0.5 rounded bg-[#1a2e22] text-emerald-400 hover:bg-[#2a4a32] transition-colors">
          ⟲ 重置
        </button>
      </div>

      {/* Chart */}
      <div class="flex-1 min-h-0 overflow-hidden"
        onWheel={onWheel}
        onMouseDown={onDn} onMouseMove={onMv} onMouseUp={onUp}
        onMouseEnter={() => setInChart(true)}
        onMouseLeave={() => { onUp(); setInChart(false); }}
        style={{ cursor: inChart() ? (drag() ? "grabbing" : "none") : "crosshair" }}>
        <svg ref={svgRef} width="100%" height="100%" viewBox={viewBox()}
          preserveAspectRatio="xMidYMid meet"
          style={{ display: "block" }}>
          {d() && <>
            {/* Grid */}
            {d()!.xTicks.map(t => (
              <line x1={sx(t)} y1={PAD} x2={sx(t)} y2={H - PAD} stroke="#1e293b" stroke-width="0.5" />
            ))}
            {d()!.yTicks.map(t => (
              <line x1={PAD} y1={sy(t)} x2={W - PAD} y2={sy(t)} stroke="#1e293b" stroke-width="0.5" />
            ))}

            {/* Axes */}
            <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#334155" stroke-width="1" />
            <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#334155" stroke-width="1" />

            {/* Tick labels */}
            {d()!.xTicks.map(t => (
              <text x={sx(t)} y={H - PAD + 13} text-anchor="middle" fill="#9CA3AF" font-size="9">{d()!.xFormat(t)}</text>
            ))}
            {d()!.yTicks.map(t => (
              <text x={PAD - 4} y={sy(t) + 3} text-anchor="end" fill="#9CA3AF" font-size="9">{d()!.yFormat(t)}</text>
            ))}

            {/* Special points — dashed lines + offset text labels */}
            {d()!.specialX.map((sp, i) => (
              <g>
                <line x1={sx(sp)} y1={PAD} x2={sx(sp)} y2={H - PAD} stroke="#34D399" stroke-width="0.5" stroke-dasharray="3 3" />
                <text x={sx(sp)} y={PAD - 4} text-anchor="middle" fill="#34D399" font-size="8">{d()!.xFormat(sp)}</text>
              </g>
            ))}
            {d()!.specialY.map((sp, i) => (
              <g>
                <line x1={PAD} y1={sy(sp)} x2={W - PAD} y2={sy(sp)} stroke="#34D399" stroke-width="0.5" stroke-dasharray="3 3" />
                <text x={W - PAD + 4} y={sy(sp) + 3} text-anchor="start" fill="#34D399" font-size="8">{d()!.yFormat(sp)}</text>
              </g>
            ))}

            {/* Data lines */}
            {props.renderLines(sx, sy)}

            {/* Legend */}
            <g transform={`translate(${W - 140}, ${PAD + 4})`}>
              {props.curveLabels.map((l, i) => (
                <g transform={`translate(0, ${i * 14})`}>
                  <line x1="0" y1="6" x2="16" y2="6" stroke={props.curveColors[i]} stroke-width="2" />
                  <text x="20" y="10" fill="#9CA3AF" font-size="9">{l}</text>
                </g>
              ))}
            </g>

            {/* Crosshair lines — after data, on top */}
            {inChart() && isInPlot() && <>
              <line x1={mx()} y1={PAD} x2={mx()} y2={H - PAD} stroke="#F59E0B" stroke-width="0.8" stroke-dasharray="4 2" />
              <line x1={PAD} y1={my()} x2={W - PAD} y2={my()} stroke="#F59E0B" stroke-width="0.8" stroke-dasharray="4 2" />
            </>}

            {/* Floating value box — moves with crosshair, rendered LAST (topmost) */}
            {inChart() && isInPlot() && <>
              <rect x={labelX()} y={labelY()} width="150"
                height={12 + props.curveLabels.length * 14}
                rx="3" fill="#0f172a" stroke="#1e293b" stroke-width="0.5" />
              <text x={labelX() + 5} y={labelY() + 11}
                fill="#F59E0B" font-size="9">{d()!.xLabel}: {d()!.xFormat(crossValX())}</text>
              {props.renderValues(labelX() + 5, labelY() + 11, crossValX(), props.curveLabels, props.curveColors)}
            </>}
          </>}
        </svg>
      </div>
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
    const xMin = 0, xMax = Math.max(...st.r);
    const dataMax = Math.max(...st.sigma_vm) || 1;
    // Scale to data range; yield line is drawn separately if it exceeds the chart
    const yMax = dataMax * 1.15, yMin = 0;
    const xRange = W - 2 * PAD, yRange = H - 2 * PAD;
    const sx = (x: number) => PAD + (x / xMax) * xRange;
    const sy = (y: number) => H - PAD - (y / yMax) * yRange;
    const xVal = (svx: number) => ((svx - PAD) / xRange) * xMax;
    const yVal = (svy: number) => (1 - (svy - PAD) / yRange) * yMax;

    let maxIdx = 0, maxV = 0;
    st.sigma_vm.forEach((v, i) => { if (v > maxV) { maxV = v; maxIdx = i; } });
    const specialX = [st.r[maxIdx]];
    const specialY = [maxV].filter(v => v > 0 && v < yMax);

    return { xMin, xMax, yMin, yMax, xLabel: "半径", yLabel: "应力",
      xTicks: niceTicks(xMin, xMax, 6), yTicks: niceTicks(yMin, yMax, 6),
      specialX, specialY,
      xFormat: (v: number) => v.toFixed(0) + "mm",
      yFormat: (v: number) => v.toFixed(0) + "MPa",
      xVal, yVal, sx, sy };
  };

  const cc = ["#EF4444", "#3B82F6", "#10B981"];
  const cl = ["等效应力", "周向应力", "径向应力", "屈服强度"];

  const renderLines = (sx: (x: number) => number, sy: (y: number) => number) => {
    const st = props.s.stress_rated;
    if (!st) return null;
    const yieldLine = props.s.material.yield_strength;
    const chartYMax = data()?.yMax ?? 100;
    const yieldInChart = yieldLine <= chartYMax;
    const yy = yieldInChart ? sy(yieldLine) : PAD; // clamp to top if out of range
    return <>
      {[st.sigma_vm, st.sigma_h, st.sigma_r].map((arr, i) => (
        <path d={arr.map((_: number, j: number) => `${j === 0 ? "M" : "L"}${sx(st.r[j])},${sy(arr[j])}`).join(" ")}
          fill="none" stroke={cc[i]} stroke-width="1.5" />
      ))}
      {/* Yield strength reference line */}
      <line x1={PAD} y1={yy} x2={W - PAD} y2={yy}
        stroke="#F59E0B" stroke-width="1" stroke-dasharray={yieldInChart ? "6 3" : "3 2"} opacity="0.8" />
      <text x={W - PAD - 2} y={yy - 4} text-anchor="end" fill="#F59E0B" font-size="8" opacity="0.9">
        σ_y = {yieldLine.toFixed(0)} MPa{yieldInChart ? "" : " ↑"}
      </text>
    </>;
  };

  const renderValues = (ox: number, oy: number, x: number, labels: string[], colors: string[]) => {
    const st = props.s.stress_rated;
    if (!st) return null;
    const interp = (arr: number[]) => {
      if (x <= st.r[0]) return arr[0];
      for (let i = 1; i < st.r.length; i++)
        if (x <= st.r[i]) { const t = (x - st.r[i - 1]) / (st.r[i] - st.r[i - 1]); return arr[i - 1] + t * (arr[i] - arr[i - 1]); }
      return arr[arr.length - 1];
    };
    return [st.sigma_vm, st.sigma_h, st.sigma_r].map((arr, i) => {
      const v = interp(arr);
      return <text x={ox} y={oy + (i + 1) * 14} fill={cc[i]} font-size="9">{labels[i]}: {v.toFixed(1)} MPa</text>;
    });
  };

  return <InteractiveChart data={data} renderLines={renderLines} renderValues={renderValues}
    curveCount={1} curveLabels={cl} curveColors={cc} />;
};

// ============================================================
// RPM Chart
// ============================================================
const RpmChart: Component<{ s: FlywheelSimulation }> = (props) => {
  const data = () => {
    const t = props.s.time_curve, r = props.s.rpm_curve;
    if (!t || t.length === 0) return null;
    const xMax = Math.max(...t), yMax = Math.max(...r, props.s.params.rpm_max) * 1.05, yMin = Math.min(...r, props.s.params.rpm_min) * 0.95;
    const pad = 0.05 * (yMax - yMin || 1);
    const xRange = W - 2 * PAD, yRange = H - 2 * PAD;
    const sx = (x: number) => PAD + (x / xMax) * xRange;
    const sy = (y: number) => H - PAD - ((y - yMin + pad) / (yMax - yMin + 2 * pad)) * yRange;
    const xVal = (svx: number) => ((svx - PAD) / xRange) * xMax;
    const yVal = (svy: number) => yMin - pad + (1 - (svy - PAD) / yRange) * (yMax - yMin + 2 * pad);

    return { xMin: 0, xMax, yMin: yMin - pad, yMax: yMax + pad,
      xLabel: "时间", yLabel: "转速",
      xTicks: niceTicks(0, xMax, 6), yTicks: niceTicks(yMin - pad, yMax + pad, 6),
      specialX: [], specialY: [],
      xFormat: (v: number) => v.toFixed(1) + "s",
      yFormat: (v: number) => v.toFixed(0) + "rpm",
      xVal, yVal, sx, sy };
  };

  const renderLines = (sx: (x: number) => number, sy: (y: number) => number) => {
    const t = props.s.time_curve, r = props.s.rpm_curve;
    const p = props.s.params;
    return <>
      <path d={t.map((tv: number, i: number) => `${i === 0 ? "M" : "L"}${sx(tv)},${sy(r[i])}`).join(" ")}
        fill="none" stroke="#3B82F6" stroke-width="1.5" />
      {/* Rated RPM reference line */}
      <line x1={PAD} y1={sy(p.rpm_rated)} x2={W - PAD} y2={sy(p.rpm_rated)}
        stroke="#10B981" stroke-width="1" stroke-dasharray="6 3" opacity="0.7" />
      <text x={W - PAD - 2} y={sy(p.rpm_rated) - 4} text-anchor="end" fill="#10B981" font-size="8" opacity="0.8">
        额定 {p.rpm_rated.toFixed(0)} rpm
      </text>
      {/* Max RPM reference line */}
      <line x1={PAD} y1={sy(p.rpm_max)} x2={W - PAD} y2={sy(p.rpm_max)}
        stroke="#EF4444" stroke-width="1" stroke-dasharray="6 3" opacity="0.7" />
      <text x={W - PAD - 2} y={sy(p.rpm_max) - 4} text-anchor="end" fill="#EF4444" font-size="8" opacity="0.8">
        最大 {p.rpm_max.toFixed(0)} rpm
      </text>
    </>;
  };

  const renderValues = (ox: number, oy: number, x: number, _l: string[], _c: string[]) => {
    const t = props.s.time_curve, r = props.s.rpm_curve;
    const interp = () => {
      if (x <= t[0]) return r[0];
      for (let i = 1; i < t.length; i++)
        if (x <= t[i]) { const f = (x - t[i - 1]) / (t[i] - t[i - 1]); return r[i - 1] + f * (r[i] - r[i - 1]); }
      return r[r.length - 1];
    };
    return <text x={ox} y={oy + 14} fill="#3B82F6" font-size="9">转速: {interp().toFixed(0)} rpm</text>;
  };

  return <InteractiveChart data={data} renderLines={renderLines} renderValues={renderValues}
    curveCount={1} curveLabels={["转速"]} curveColors={["#3B82F6"]} />;
};

// ============================================================
// Energy Chart (Bar chart)
// ============================================================
const EnergyChart: Component<{ s: FlywheelSimulation }> = (props) => {
  const BH = 320, BPAD = 50;
  const bars = () => [
    { label: "额定", value: props.s.energy_rated, color: "#3B82F6" },
    { label: "最大", value: props.s.energy_max, color: "#10B981" },
    { label: "可用", value: props.s.energy_usable, color: "#F59E0B" },
  ];

  return (
    <div class="w-full h-full flex flex-col min-h-0 select-none">
      <div class="flex-1 min-h-0 overflow-hidden">
        <svg width="100%" height="100%" viewBox={`0 0 ${W} ${BH}`}
          preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
          {(() => {
            const data = bars(), yMax = Math.max(...data.map(b => b.value)) * 1.25 || 1;
            const yRange = BH - 2 * BPAD;
            const sy = (y: number) => BH - BPAD - (y / yMax) * yRange;
            const yTicks = niceTicks(0, yMax, 5);
            const barW = 100, gap = 50, xStart = 100;

            return <>
              {yTicks.map(t => <line x1={BPAD} y1={sy(t)} x2={W - BPAD} y2={sy(t)} stroke="#1e293b" stroke-width="0.5" />)}
              <line x1={BPAD} y1={BPAD} x2={BPAD} y2={BH - BPAD} stroke="#334155" stroke-width="1" />
              <line x1={BPAD} y1={BH - BPAD} x2={W - BPAD} y2={BH - BPAD} stroke="#334155" stroke-width="1" />
              {yTicks.map(t => <text x={BPAD - 4} y={sy(t) + 3} text-anchor="end" fill="#9CA3AF" font-size="9">{t.toFixed(1)} kJ</text>)}

              {data.map((b, i) => {
                const bx = xStart + i * (barW + gap);
                return <g>
                  <rect x={bx} y={sy(b.value)} width={barW} height={BH - BPAD - sy(b.value)} fill={b.color} rx="3" />
                  <text x={bx + barW / 2} y={BH - BPAD + 15} text-anchor="middle" fill="#9CA3AF" font-size="10">{b.label}</text>
                  <text x={bx + barW / 2} y={sy(b.value) - 5} text-anchor="middle" fill={b.color} font-size="10" font-weight="bold">{b.value.toFixed(1)}</text>
                </g>;
              })}
            </>;
          })()}
        </svg>
      </div>
    </div>
  );
};

// ============================================================
// Sensitivity Chart
// ============================================================
const SWEEP_PARAMS = [
  { id: "r_o", label: "外径 Ro", unit: "mm", get: (p: any) => p.r_o, range: (v: number) => [Math.max(10, v * 0.5), v * 1.5] as [number, number] },
  { id: "r_i", label: "内径 Ri", unit: "mm", get: (p: any) => p.r_i, range: (v: number) => [0, v * 1.5] as [number, number] },
  { id: "thickness", label: "厚度", unit: "mm", get: (p: any) => p.thickness, range: (v: number) => [Math.max(1, v * 0.5), v * 1.5] as [number, number] },
  { id: "r_hub", label: "轮毂径", unit: "mm", get: (p: any) => p.r_hub, range: (v: number) => [0, v * 1.5] as [number, number] },
  { id: "hub_thickness", label: "轮毂厚", unit: "mm", get: (p: any) => p.hub_thickness, range: (v: number) => [Math.max(1, v * 0.5), v * 1.5] as [number, number] },
  { id: "rpm_rated", label: "额定转速", unit: "rpm", get: (p: any) => p.rpm_rated, range: (v: number) => [Math.max(100, v * 0.3), v * 1.7] as [number, number] },
  { id: "rpm_max", label: "最大转速", unit: "rpm", get: (p: any) => p.rpm_max, range: (v: number) => [Math.max(500, v * 0.5), v * 1.5] as [number, number] },
];

const SWEEP_METRICS = [
  { id: "max_stress", label: "最大应力", unit: "MPa" },
  { id: "mass", label: "质量", unit: "kg" },
  { id: "inertia", label: "转动惯量", unit: "kg·m²" },
  { id: "energy_rated", label: "额定储能", unit: "kJ" },
  { id: "energy_usable", label: "可用能量", unit: "kJ" },
  { id: "specific_energy", label: "比能量", unit: "Wh/kg" },
  { id: "safety_yield", label: "屈服安全系数", unit: "" },
  { id: "safety_fatigue", label: "疲劳安全系数", unit: "" },
];

const SensitivityChart: Component<{ s: FlywheelSimulation }> = (props) => {
  const [swParam, setSwParam] = createSignal("r_o");
  const [swMetric, setSwMetric] = createSignal("max_stress");

  const paramDef = () => SWEEP_PARAMS.find(p => p.id === swParam())!;
  const metricDef = () => SWEEP_METRICS.find(m => m.id === swMetric())!;
  const baseVal = () => paramDef().get(props.s.params);
  const range = () => paramDef().range(baseVal());

  const numPoints = 20;

  const [swData] = createResource(
    () => ({ param: swParam(), metric: swMetric() }),
    async ({ param, metric }) => {
      return await runSensitivitySweep(
        props.s.params, props.s.material,
        param, metric, range()[0], range()[1], numPoints,
      );
    },
  );

  const data = () => {
    const sd = swData();
    if (!sd) return null;
    const valid = sd.points.filter(p => isFinite(p.param_value) && isFinite(p.metric_value));
    if (valid.length < 2) return null;
    const xMin = Math.min(...valid.map(p => p.param_value));
    const xMax = Math.max(...valid.map(p => p.param_value));
    const yMin = Math.min(...valid.map(p => p.metric_value));
    const yMax = Math.max(...valid.map(p => p.metric_value));
    const yPad = (yMax - yMin) * 0.1 || 1;
    const xRange = W - 2 * PAD, yRange = H - 2 * PAD;
    const sx = (x: number) => PAD + ((x - xMin) / (xMax - xMin || 1)) * xRange;
    const sy = (y: number) => H - PAD - ((y - yMin + yPad) / (yMax - yMin + 2 * yPad)) * yRange;
    const xVal = (svx: number) => xMin + ((svx - PAD) / xRange) * (xMax - xMin);
    const yVal = (svy: number) => (yMin - yPad) + (1 - (svy - PAD) / yRange) * (yMax - yMin + 2 * yPad);

    return {
      xMin, xMax, yMin: yMin - yPad, yMax: yMax + yPad,
      xLabel: sd.param_name, yLabel: sd.metric_name,
      xTicks: niceTicks(xMin, xMax, 6), yTicks: niceTicks(yMin - yPad, yMax + yPad, 6),
      specialX: [baseVal()], specialY: [],
      xFormat: (v: number) => v.toFixed(0) + sd.param_unit,
      yFormat: (v: number) => v.toFixed(1) + sd.metric_unit,
      xVal, yVal, sx, sy,
    };
  };

  const renderLines = (sx: (x: number) => number, sy: (y: number) => number) => {
    const sd = swData();
    if (!sd) return null;
    const valid = sd.points.filter(p => isFinite(p.param_value) && isFinite(p.metric_value));
    if (valid.length < 2) return null;
    const d = valid.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.param_value)},${sy(p.metric_value)}`);
    return <path d={d.join(" ")} fill="none" stroke="#3B82F6" stroke-width="2" />;
  };

  const renderValues = (ox: number, oy: number, x: number, _l: string[], _c: string[]) => {
    const sd = swData();
    if (!sd) return null;
    const valid = sd.points.filter(p => isFinite(p.param_value) && isFinite(p.metric_value));
    const interp = () => {
      if (x <= valid[0].param_value) return valid[0].metric_value;
      for (let i = 1; i < valid.length; i++)
        if (x <= valid[i].param_value) {
          const f = (x - valid[i-1].param_value) / (valid[i].param_value - valid[i-1].param_value);
          return valid[i-1].metric_value + f * (valid[i].metric_value - valid[i-1].metric_value);
        }
      return valid[valid.length-1].metric_value;
    };
    const mv = interp();
    const un = metricDef().unit ? " " + metricDef().unit : "";
    return <text x={ox} y={oy + 14} fill="#3B82F6" font-size="9">≈ {mv.toFixed(2)}{un}</text>;
  };

  return (
    <div class="w-full h-full flex flex-col min-h-0 select-none">
      {/* Controls */}
      <div class="flex-shrink-0 flex items-center space-x-2 mb-1">
        <span class="text-[9px] text-gray-500">扫描</span>
        <select value={swParam()} onChange={(e) => setSwParam(e.currentTarget.value)}
          class="bg-[#111a22] border border-[#1a2e22] rounded px-1.5 py-0.5 text-[10px] text-white" style={{"-webkit-appearance":"none"}}>
          {SWEEP_PARAMS.map(p => <option value={p.id}>{p.label}</option>)}
        </select>
        <span class="text-[9px] text-gray-500">→</span>
        <select value={swMetric()} onChange={(e) => setSwMetric(e.currentTarget.value)}
          class="bg-[#111a22] border border-[#1a2e22] rounded px-1.5 py-0.5 text-[10px] text-white" style={{"-webkit-appearance":"none"}}>
          {SWEEP_METRICS.map(m => <option value={m.id}>{m.label}</option>)}
        </select>
        <span class="text-[9px] text-gray-500">{range()[0].toFixed(0)}~{range()[1].toFixed(0)}{paramDef().unit}</span>
      </div>

      {/* Chart */}
      <Show when={swData() && swData()!.points.filter(p => isFinite(p.metric_value)).length >= 2}
        fallback={
          swData.loading
            ? <div class="flex-1 flex items-center justify-center text-gray-500 text-[10px]">扫描中...</div>
            : <div class="flex-1 flex items-center justify-center text-gray-500 text-[10px]">自动扫描中...</div>
        }>
        <div class="flex-1 min-h-0">
          <InteractiveChart data={data} renderLines={renderLines} renderValues={renderValues}
            curveCount={1} curveLabels={[metricDef().label]} curveColors={["#3B82F6"]} />
        </div>
      </Show>
    </div>
  );
};

// ============================================================
// Thermal Stress Chart
// ============================================================
const ThermalChart: Component<{ s: FlywheelSimulation }> = (props) => {
  const [thermData] = createResource(
    () => props.s,
    async (s) => {
      return await computeThermalStress(s.params, s.material);
    },
  );

  const data = () => {
    const td = thermData();
    if (!td || !td.r || td.r.length === 0) return null;
    const xMin = 0, xMax = Math.max(...td.r);
    const allVals = [...td.sigma_vm, ...td.sigma_vm_cent, ...td.sigma_vm_therm].filter(v => isFinite(v));
    const yMax = Math.max(...allVals, td.corrected_yield) * 1.15, yMin = 0;
    const xRange = W - 2 * PAD, yRange = H - 2 * PAD;
    const sx = (x: number) => PAD + (x / xMax) * xRange;
    const sy = (y: number) => H - PAD - (y / yMax) * yRange;
    const xVal = (svx: number) => ((svx - PAD) / xRange) * xMax;
    const yVal = (svy: number) => (1 - (svy - PAD) / yRange) * yMax;

    let maxIdx = 0, maxV = 0;
    td.sigma_vm.forEach((v, i) => { if (v > maxV) { maxV = v; maxIdx = i; } });
    const specialX = [td.r[maxIdx]];
    const specialY = [maxV].filter(v => v > 0 && v < yMax);

    return { xMin, xMax, yMin, yMax, xLabel: "半径", yLabel: "应力",
      xTicks: niceTicks(xMin, xMax, 6), yTicks: niceTicks(yMin, yMax, 6),
      specialX, specialY,
      xFormat: (v: number) => v.toFixed(0) + "mm",
      yFormat: (v: number) => v.toFixed(0) + "MPa",
      xVal, yVal, sx, sy };
  };

  const cc = ["#EF4444", "#3B82F6", "#F59E0B"];
  const cl = ["合成应力(离心+热)", "纯离心应力", "纯热应力", "修正屈服"];

  const renderLines = (sx: (x: number) => number, sy: (y: number) => number) => {
    const td = thermData();
    if (!td) return null;
    const yieldLine = td.corrected_yield;
    const chartYMax = data()?.yMax ?? 100;
    const yieldInChart = yieldLine <= chartYMax;
    const yy = yieldInChart ? sy(yieldLine) : PAD;
    return <>
      {[td.sigma_vm, td.sigma_vm_cent, td.sigma_vm_therm].map((arr, i) => (
        <path d={arr.map((_: number, j: number) => `${j===0?"M":"L"}${sx(td.r[j])},${sy(arr[j])}`).join(" ")}
          fill="none" stroke={cc[i]} stroke-width={i === 0 ? "2" : "1"} stroke-dasharray={i === 2 ? "5 3" : ""} />
      ))}
      <line x1={PAD} y1={yy} x2={W - PAD} y2={yy}
        stroke="#10B981" stroke-width="1" stroke-dasharray="6 3" opacity="0.8" />
      <text x={W - PAD - 2} y={yy - 4} text-anchor="end" fill="#10B981" font-size="8" opacity="0.9">
        σ_y = {yieldLine.toFixed(0)} MPa{yieldInChart ? "" : " ↑"}
      </text>
    </>;
  };

  const renderValues = (ox: number, oy: number, x: number, labels: string[], colors: string[]) => {
    const td = thermData();
    if (!td) return null;
    const interp = (arr: number[]) => {
      if (x <= td.r[0]) return arr[0];
      for (let i = 1; i < td.r.length; i++)
        if (x <= td.r[i]) { const f = (x - td.r[i-1]) / (td.r[i] - td.r[i-1]); return arr[i-1] + f * (arr[i] - arr[i-1]); }
      return arr[arr.length-1];
    };
    return [td.sigma_vm, td.sigma_vm_cent, td.sigma_vm_therm].map((arr, i) => {
      const v = interp(arr);
      return <text x={ox} y={oy + (i + 1) * 14} fill={cc[i]} font-size="9">{labels[i]}: {v.toFixed(1)} MPa</text>;
    });
  };

  return (
    <Show when={thermData()}
      fallback={<div class="flex-1 flex items-center justify-center text-gray-500 text-[10px]">计算中...</div>}>
      <InteractiveChart data={data} renderLines={renderLines} renderValues={renderValues}
        curveCount={3} curveLabels={cl} curveColors={cc} />
    </Show>
  );
};

// ============================================================
// S-N Curve Chart
// ============================================================
const SNChart: Component<{ s: FlywheelSimulation }> = (props) => {
  const [snData] = createResource(
    () => ({ mat: props.s.material, stress: props.s.max_stress_rated }),
    async ({ mat, stress }) => {
      return await getSNCurve(mat, stress);
    },
  );

  const data = () => {
    const sd = snData();
    if (!sd || sd.curve.length === 0) return null;

    // Use linear cycles for domain (so isInPlot/crosshair work), log-scale for display
    const xMin = sd.curve[0].cycles;
    const xMax = sd.curve[sd.curve.length - 1].cycles;
    if (!isFinite(xMin) || !isFinite(xMax) || xMax <= xMin) return null;
    const logMin = Math.log10(xMin);
    const logMax = Math.log10(xMax);
    const yMax = Math.max(sd.fatigue_limit, sd.operating_stress !== Infinity ? sd.operating_stress : 0, ...sd.curve.map(p => p.stress_amplitude)) * 1.2;
    const yMin = 0;

    const xRange = W - 2 * PAD, yRange = H - 2 * PAD;
    const toScreenX = (cycles: number) => PAD + ((Math.log10(cycles) - logMin) / (logMax - logMin)) * xRange;
    const sy = (y: number) => H - PAD - (y / yMax) * yRange;
    const xVal = (svx: number) => 10.0 ** (logMin + ((svx - PAD) / xRange) * (logMax - logMin));
    const yVal = (svy: number) => (1 - (svy - PAD) / yRange) * yMax;

    let specialX: number[] = [];
    let specialY: number[] = [sd.fatigue_limit];
    if (sd.operating_stress > 0 && sd.operating_cycles !== Infinity) {
      specialX.push(sd.operating_cycles);
      specialY.push(sd.operating_stress);
    }

    return { xMin, xMax, yMin, yMax, xLabel: "循环次数 N", yLabel: "应力幅",
      xTicks: [3,4,5,6,7,8,9].filter(t => t >= logMin && t <= logMax),
      yTicks: niceTicks(yMin, yMax, 6),
      specialX, specialY,
      xFormat: (v: number) => {
        if (v == null || !isFinite(v)) return "—";
        return v >= 100 ? `10^{${Math.log10(v).toFixed(0)}}` : `10^{${v.toFixed(0)}}`;
      },
      yFormat: (v: number) => v != null && isFinite(v) ? v.toFixed(0) + "MPa" : "—",
      xVal,
      yVal,
      sx: toScreenX,
      sy };
  };

  const cc = ["#3B82F6", "#F59E0B", "#EF4444"];
  const cl = ["S-N曲线", "疲劳极限", "工作点"];

  const renderLines = (sx: (x: number) => number, sy: (y: number) => number) => {
    const sd = snData();
    if (!sd || !sd.curve.length) return null;

    // Filter out any invalid points
    const valid = sd.curve.filter(p => isFinite(p.cycles) && isFinite(p.stress_amplitude));
    if (valid.length < 2) return null;
    const first = valid[0];
    const last = valid[valid.length-1];
    const cycleAt10 = valid[Math.min(10, valid.length-1)];

    const curvePath = valid.map((p, i) =>
      `${i === 0 ? "M" : "L"}${sx(p.cycles)},${sy(p.stress_amplitude)}`).join(" ");

    return <>
      <path d={curvePath} fill="none" stroke="#3B82F6" stroke-width="2" />
      {/* Fatigue limit horizontal line */}
      <line x1={sx(first.cycles)} y1={sy(sd.fatigue_limit)} x2={sx(last.cycles)} y2={sy(sd.fatigue_limit)}
        stroke="#F59E0B" stroke-width="1.5" stroke-dasharray="6 3" opacity="0.8" />
      <text x={sx(cycleAt10.cycles)} y={sy(sd.fatigue_limit) - 4} fill="#F59E0B" font-size="9" text-anchor="middle">
        σ_f = {sd.fatigue_limit.toFixed(0)} MPa
      </text>
      {/* Operating point */}
      {sd.operating_stress > 0 && sd.operating_cycles !== Infinity && (
        <circle cx={sx(sd.operating_cycles)} cy={sy(sd.operating_stress)} r="5" fill="#EF4444" stroke="#fff" stroke-width="1" />
      )}
    </>;
  };

  const renderValues = (ox: number, oy: number, x: number, _l: string[], _c: string[]) => {
    const sd = snData();
    if (!sd || x == null || !isFinite(x)) return null;
    const interp = () => {
      const valid = sd.curve.filter(p => isFinite(p.cycles) && isFinite(p.stress_amplitude));
      if (valid.length < 2) return 0;
      if (x <= valid[0].cycles) return valid[0].stress_amplitude;
      for (let i = 1; i < valid.length; i++)
        if (x <= valid[i].cycles) {
          const f = Math.log(x / valid[i-1].cycles) / Math.log(valid[i].cycles / valid[i-1].cycles);
          return valid[i-1].stress_amplitude + f * (valid[i].stress_amplitude - valid[i-1].stress_amplitude);
        }
      return valid[valid.length-1].stress_amplitude;
    };
    const v = interp();
    const exp = Math.floor(Math.log10(x));
    return <text x={ox} y={oy + 14} fill="#3B82F6" font-size="9">σ_a = {v.toFixed(0)} MPa @ N≈10^{exp}</text>;
  };

  return (
    <Show when={snData()}
      fallback={<div class="flex-1 flex items-center justify-center text-gray-500 text-[10px]">生成中...</div>}>
      <InteractiveChart data={data} renderLines={renderLines} renderValues={renderValues}
        curveCount={1} curveLabels={cl} curveColors={cc} />
    </Show>
  );
};

// ============================================================
// Main Panel
// ============================================================
const VisualizationPanel: Component = () => {
  const ctx = useAppContext();
  const sim = () => ctx.state().simulation;
  const [activeChart, setActiveChart] = createSignal<"stress" | "rpm" | "energy" | "sensitivity" | "thermal" | "sn">("stress");

  const chartBtn = (id: "stress" | "rpm" | "energy" | "sensitivity" | "thermal" | "sn", label: string) => (
    <button onClick={() => setActiveChart(id)}
      class={`px-2.5 py-1 text-xs rounded transition-colors ${
        activeChart() === id ? "bg-emerald-600 text-white" : "bg-gray-700 text-gray-400 hover:bg-gray-600"
      }`}>{label}</button>
  );

  return (
    <div class="h-full flex flex-col min-h-0">
      <div class="flex items-center justify-between flex-shrink-0 mb-1">
        <h2 class="text-xs font-semibold text-gray-400">可视化</h2>
        <div class="flex space-x-1">
          {chartBtn("stress", "应力")}
          {chartBtn("rpm", "转速")}
          {chartBtn("energy", "能量")}
          {chartBtn("sensitivity", "灵敏度")}
          {chartBtn("thermal", "热应力")}
          {chartBtn("sn", "疲劳S-N")}
        </div>
      </div>
      <Show when={sim()} fallback={
        <div class="flex-1 flex items-center justify-center text-gray-500">
          <div class="text-center">
            <svg class="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            <p class="text-sm">修改参数后自动计算</p>
          </div>
        </div>
      }>
        <div class="bg-[#0d1419] rounded p-3 pb-1.5 border border-[#1a2e22] flex-1 min-h-0 flex flex-col">
          <div class="flex-1 min-h-0">
            {activeChart() === "stress" && <StressChart s={sim()!} />}
            {activeChart() === "rpm" && <RpmChart s={sim()!} />}
            {activeChart() === "energy" && <EnergyChart s={sim()!} />}
            {activeChart() === "sensitivity" && <SensitivityChart s={sim()!} />}
            {activeChart() === "thermal" && <ThermalChart s={sim()!} />}
            {activeChart() === "sn" && <SNChart s={sim()!} />}
          </div>
        </div>
      </Show>
    </div>
  );
};

export default VisualizationPanel;
