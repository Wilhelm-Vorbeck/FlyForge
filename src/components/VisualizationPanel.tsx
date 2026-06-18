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
    const yMax = Math.max(...st.sigma_vm) * 1.1 || 1, yMin = 0;
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
  const cl = ["von Mises", "周向应力", "径向应力"];

  const renderLines = (sx: (x: number) => number, sy: (y: number) => number) => {
    const st = props.s.stress_rated;
    if (!st) return null;
    return [st.sigma_vm, st.sigma_h, st.sigma_r].map((arr, i) => (
      <path d={arr.map((_: number, j: number) => `${j === 0 ? "M" : "L"}${sx(st.r[j])},${sy(arr[j])}`).join(" ")}
        fill="none" stroke={cc[i]} stroke-width="1.5" />
    ));
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
    const xMax = Math.max(...t), yMax = Math.max(...r), yMin = Math.min(...r);
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
    return <path d={t.map((tv: number, i: number) => `${i === 0 ? "M" : "L"}${sx(tv)},${sy(r[i])}`).join(" ")}
      fill="none" stroke="#3B82F6" stroke-width="1.5" />;
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
// Main Panel
// ============================================================
const VisualizationPanel: Component = () => {
  const ctx = useAppContext();
  const sim = () => ctx.state().simulation;
  const [activeChart, setActiveChart] = createSignal<"stress" | "rpm" | "energy">("stress");

  const chartBtn = (id: "stress" | "rpm" | "energy", label: string) => (
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
          </div>
        </div>
      </Show>
    </div>
  );
};

export default VisualizationPanel;
