import { Component, Show, createSignal, createMemo } from "solid-js";
import { useAppContext } from "../store";
import { FlywheelSimulation } from "../types";

const VisualizationPanel: Component = () => {
  const ctx = useAppContext();
  const sim = () => ctx.state().simulation;
  const [activeChart, setActiveChart] = createSignal<"stress" | "rpm" | "energy">("stress");

  const chartBtn = (id: "stress" | "rpm" | "energy", label: string) => (
    <button
      onClick={() => setActiveChart(id)}
      class={`px-2.5 py-1 text-xs rounded transition-colors ${
        activeChart() === id ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-400 hover:bg-gray-600"
      }`}
    >
      {label}
    </button>
  );

  const StressChart: Component<{ s: FlywheelSimulation }> = (props) => {
    const width = 600;
    const height = 250;
    const padding = 40;
    const stress = () => {
      const st = props.s.stress_rated;
      if (!st || !st.r || st.r.length === 0) return null;
      const maxR = Math.max(...st.r);
      const maxStress = Math.max(...st.sigma_vm);
      if (maxR === 0 || maxStress === 0) return null;
      const xScale = (r: number) => padding + (r / maxR) * (width - 2 * padding);
      const yScale = (s: number) => height - padding - (s / maxStress) * (height - 2 * padding);
      const vmPath = st.r.map((r: number, i: number) => `${i === 0 ? "M" : "L"}${xScale(r)},${yScale(st.sigma_vm[i])}`).join(" ");
      const hoopPath = st.r.map((r: number, i: number) => `${i === 0 ? "M" : "L"}${xScale(r)},${yScale(st.sigma_h[i])}`).join(" ");
      const radialPath = st.r.map((r: number, i: number) => `${i === 0 ? "M" : "L"}${xScale(r)},${yScale(st.sigma_r[i])}`).join(" ");
      return { maxR, maxStress, vmPath, hoopPath, radialPath };
    };

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#374151" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#374151" />
        {stress() && <>
          <text x={padding - 5} y={padding + 5} fill="#9CA3AF" font-size="10" text-anchor="end">{stress()!.maxStress.toFixed(0)} MPa</text>
          <text x={padding - 5} y={height - padding + 5} fill="#9CA3AF" font-size="10" text-anchor="end">0</text>
          <text x={padding} y={height - padding + 15} fill="#9CA3AF" font-size="10" text-anchor="middle">0</text>
          <text x={width - padding} y={height - padding + 15} fill="#9CA3AF" font-size="10" text-anchor="middle">{stress()!.maxR.toFixed(0)} mm</text>
          <path d={stress()!.vmPath} fill="none" stroke="#EF4444" stroke-width="2" />
          <path d={stress()!.hoopPath} fill="none" stroke="#3B82F6" stroke-width="2" />
          <path d={stress()!.radialPath} fill="none" stroke="#10B981" stroke-width="2" />
          <g transform={`translate(${width - 150}, ${padding})`}>
            <line x1="0" y1="0" x2="20" y2="0" stroke="#EF4444" stroke-width="2" />
            <text x="25" y="4" fill="#9CA3AF" font-size="10">von Mises</text>
            <line x1="0" y1="15" x2="20" y2="15" stroke="#3B82F6" stroke-width="2" />
            <text x="25" y="19" fill="#9CA3AF" font-size="10">周向应力</text>
            <line x1="0" y1="30" x2="20" y2="30" stroke="#10B981" stroke-width="2" />
            <text x="25" y="34" fill="#9CA3AF" font-size="10">径向应力</text>
          </g>
        </>}
      </svg>
    );
  };

  const RpmChart: Component<{ s: FlywheelSimulation }> = (props) => {
    const width = 600;
    const height = 250;
    const padding = 40;
    const data = () => {
      const t = props.s.time_curve;
      const r = props.s.rpm_curve;
      if (!t || t.length === 0) return null;
      const maxTime = Math.max(...t);
      const maxRpm = Math.max(...r);
      const minRpm = Math.min(...r);
      const range = maxRpm - minRpm || 1;
      const xScale = (tv: number) => padding + (tv / maxTime) * (width - 2 * padding);
      const yScale = (rv: number) => height - padding - ((rv - minRpm) / range) * (height - 2 * padding);
      const path = t.map((tv: number, i: number) => `${i === 0 ? "M" : "L"}${xScale(tv)},${yScale(r[i])}`).join(" ");
      return { maxTime, maxRpm, minRpm, path };
    };
    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#374151" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#374151" />
        {data() && <>
          <text x={padding - 5} y={padding + 5} fill="#9CA3AF" font-size="10" text-anchor="end">{data()!.maxRpm.toFixed(0)} rpm</text>
          <text x={padding - 5} y={height - padding + 5} fill="#9CA3AF" font-size="10" text-anchor="end">{data()!.minRpm.toFixed(0)} rpm</text>
          <text x={padding} y={height - padding + 15} fill="#9CA3AF" font-size="10" text-anchor="middle">0 s</text>
          <text x={width - padding} y={height - padding + 15} fill="#9CA3AF" font-size="10" text-anchor="middle">{data()!.maxTime.toFixed(1)} s</text>
          <path d={data()!.path} fill="none" stroke="#3B82F6" stroke-width="2" />
        </>}
      </svg>
    );
  };

  const EnergyChart: Component<{ s: FlywheelSimulation }> = (props) => {
    const width = 600;
    const height = 250;
    const padding = 40;
    const d = () => {
      const rated = props.s.energy_rated;
      const max = props.s.energy_max;
      const usable = props.s.energy_usable;
      const maxEnergy = Math.max(rated, max, usable) || 1;
      const barWidth = 80;
      const gap = 60;
      const yScale = (e: number) => (e / maxEnergy) * (height - 2 * padding);
      return { rated, max, usable, maxEnergy, barWidth, gap, yScale };
    };
    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#374151" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#374151" />
        <text x={padding - 5} y={padding + 5} fill="#9CA3AF" font-size="10" text-anchor="end">{d().maxEnergy.toFixed(1)} kJ</text>
        <rect x={padding + d().gap} y={height - padding - d().yScale(d().rated)} width={d().barWidth} height={d().yScale(d().rated)} fill="#3B82F6" rx="4" />
        <text x={padding + d().gap + d().barWidth / 2} y={height - padding + 15} fill="#9CA3AF" font-size="10" text-anchor="middle">额定</text>
        <text x={padding + d().gap + d().barWidth / 2} y={height - padding - d().yScale(d().rated) - 5} fill="#3B82F6" font-size="10" text-anchor="middle">{d().rated.toFixed(1)}</text>
        <rect x={padding + d().gap * 2 + d().barWidth} y={height - padding - d().yScale(d().max)} width={d().barWidth} height={d().yScale(d().max)} fill="#10B981" rx="4" />
        <text x={padding + d().gap * 2 + d().barWidth + d().barWidth / 2} y={height - padding + 15} fill="#9CA3AF" font-size="10" text-anchor="middle">最大</text>
        <text x={padding + d().gap * 2 + d().barWidth + d().barWidth / 2} y={height - padding - d().yScale(d().max) - 5} fill="#10B981" font-size="10" text-anchor="middle">{d().max.toFixed(1)}</text>
        <rect x={padding + d().gap * 3 + d().barWidth * 2} y={height - padding - d().yScale(d().usable)} width={d().barWidth} height={d().yScale(d().usable)} fill="#F59E0B" rx="4" />
        <text x={padding + d().gap * 3 + d().barWidth * 2 + d().barWidth / 2} y={height - padding + 15} fill="#9CA3AF" font-size="10" text-anchor="middle">可用</text>
        <text x={padding + d().gap * 3 + d().barWidth * 2 + d().barWidth / 2} y={height - padding - d().yScale(d().usable) - 5} fill="#F59E0B" font-size="10" text-anchor="middle">{d().usable.toFixed(1)}</text>
      </svg>
    );
  };

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

      <Show
        when={sim()}
        fallback={
          <div class="text-center py-16 text-gray-500">
            <svg class="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            <p class="text-sm">修改参数后自动计算</p>
          </div>
        }
      >
        <div class="bg-gray-800 rounded p-3 border border-gray-700 flex-1 min-h-0">
          <h3 class="text-[10px] font-medium text-gray-400 mb-1">
            {activeChart() === "stress" && "径向应力分布"}
            {activeChart() === "rpm" && "转速-时间曲线"}
            {activeChart() === "energy" && "能量特性"}
          </h3>
          <div class="w-full h-48 overflow-hidden">
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
