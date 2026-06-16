import { Component, Show, createEffect, createSignal } from "solid-js";
import { useAppContext } from "../store";

const VisualizationPanel: Component = () => {
  const context = useAppContext();
  const sim = () => context.state().simulation;
  const [activeChart, setActiveChart] = createSignal<"stress" | "rpm" | "energy">("stress");

  return (
    <div>
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-lg font-semibold text-white">可视化</h2>
        <div class="flex space-x-2">
          <button
            onClick={() => setActiveChart("stress")}
            class={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              activeChart() === "stress"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            应力分布
          </button>
          <button
            onClick={() => setActiveChart("rpm")}
            class={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              activeChart() === "rpm"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            转速曲线
          </button>
          <button
            onClick={() => setActiveChart("energy")}
            class={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              activeChart() === "energy"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            能量分布
          </button>
        </div>
      </div>

      <Show
        when={sim()}
        fallback={
          <div class="text-center py-12 text-gray-400">
            <svg
              class="w-16 h-16 mx-auto mb-4 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
              />
            </svg>
            <p class="text-lg">运行仿真以查看可视化</p>
            <p class="text-sm mt-2">图表将显示在此处</p>
          </div>
        }
      >
        {(simulation) => (
          <div>
            {/* Chart area */}
            <div class="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
              <h3 class="text-sm font-medium text-gray-300 mb-4">
                {activeChart() === "stress" && "径向应力分布"}
                {activeChart() === "rpm" && "转速-时间曲线"}
                {activeChart() === "energy" && "能量特性"}
              </h3>

              {/* SVG Chart */}
              <div class="w-full h-64">
                {activeChart() === "stress" && <StressChart sim={simulation()} />}
                {activeChart() === "rpm" && <RpmChart sim={simulation()} />}
                {activeChart() === "energy" && <EnergyChart sim={simulation()} />}
              </div>
            </div>

            {/* Flywheel section visualization */}
            <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 class="text-sm font-medium text-gray-300 mb-4">飞轮截面</h3>
              <div class="flex items-center justify-center">
                <FlywheelSectionViz params={context.state().params} />
              </div>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
};

// Stress distribution chart
const StressChart: Component<{ sim: any }> = (props) => {
  const stress = props.sim.stress_rated;
  const width = 600;
  const height = 250;
  const padding = 40;

  if (!stress || stress.r.length === 0) return <div class="text-gray-400">无数据</div>;

  const maxR = Math.max(...stress.r);
  const maxStress = Math.max(...stress.sigma_vm);

  const xScale = (r: number) => padding + (r / maxR) * (width - 2 * padding);
  const yScale = (s: number) => height - padding - (s / maxStress) * (height - 2 * padding);

  const vmPath = stress.r
    .map((r: number, i: number) => `${i === 0 ? "M" : "L"}${xScale(r)},${yScale(stress.sigma_vm[i])}`)
    .join(" ");

  const hoopPath = stress.r
    .map((r: number, i: number) => `${i === 0 ? "M" : "L"}${xScale(r)},${yScale(stress.sigma_h[i])}`)
    .join(" ");

  const radialPath = stress.r
    .map((r: number, i: number) => `${i === 0 ? "M" : "L"}${xScale(r)},${yScale(stress.sigma_r[i])}`)
    .join(" ");

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
      {/* Grid */}
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#374151" />
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#374151" />

      {/* Y-axis labels */}
      <text x={padding - 5} y={padding + 5} fill="#9CA3AF" font-size="10" text-anchor="end">
        {maxStress.toFixed(0)} MPa
      </text>
      <text x={padding - 5} y={height - padding + 5} fill="#9CA3AF" font-size="10" text-anchor="end">
        0
      </text>

      {/* X-axis labels */}
      <text x={padding} y={height - padding + 15} fill="#9CA3AF" font-size="10" text-anchor="middle">
        0
      </text>
      <text x={width - padding} y={height - padding + 15} fill="#9CA3AF" font-size="10" text-anchor="middle">
        {maxR.toFixed(0)} mm
      </text>

      {/* Lines */}
      <path d={vmPath} fill="none" stroke="#EF4444" stroke-width="2" />
      <path d={hoopPath} fill="none" stroke="#3B82F6" stroke-width="2" />
      <path d={radialPath} fill="none" stroke="#10B981" stroke-width="2" />

      {/* Legend */}
      <g transform={`translate(${width - 150}, ${padding})`}>
        <line x1="0" y1="0" x2="20" y2="0" stroke="#EF4444" stroke-width="2" />
        <text x="25" y="4" fill="#9CA3AF" font-size="10">von Mises</text>
        <line x1="0" y1="15" x2="20" y2="15" stroke="#3B82F6" stroke-width="2" />
        <text x="25" y="19" fill="#9CA3AF" font-size="10">周向应力</text>
        <line x1="0" y1="30" x2="20" y2="30" stroke="#10B981" stroke-width="2" />
        <text x="25" y="34" fill="#9CA3AF" font-size="10">径向应力</text>
      </g>
    </svg>
  );
};

// RPM-time curve chart
const RpmChart: Component<{ sim: any }> = (props) => {
  const width = 600;
  const height = 250;
  const padding = 40;

  const time = props.sim.time_curve;
  const rpm = props.sim.rpm_curve;

  if (!time || time.length === 0) return <div class="text-gray-400">无数据</div>;

  const maxTime = Math.max(...time);
  const maxRpm = Math.max(...rpm);
  const minRpm = Math.min(...rpm);

  const xScale = (t: number) => padding + (t / maxTime) * (width - 2 * padding);
  const yScale = (r: number) => height - padding - ((r - minRpm) / (maxRpm - minRpm)) * (height - 2 * padding);

  const path = time
    .map((t: number, i: number) => `${i === 0 ? "M" : "L"}${xScale(t)},${yScale(rpm[i])}`)
    .join(" ");

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
      {/* Grid */}
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#374151" />
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#374151" />

      {/* Y-axis labels */}
      <text x={padding - 5} y={padding + 5} fill="#9CA3AF" font-size="10" text-anchor="end">
        {maxRpm.toFixed(0)} rpm
      </text>
      <text x={padding - 5} y={height - padding + 5} fill="#9CA3AF" font-size="10" text-anchor="end">
        {minRpm.toFixed(0)} rpm
      </text>

      {/* X-axis labels */}
      <text x={padding} y={height - padding + 15} fill="#9CA3AF" font-size="10" text-anchor="middle">
        0 s
      </text>
      <text x={width - padding} y={height - padding + 15} fill="#9CA3AF" font-size="10" text-anchor="middle">
        {maxTime.toFixed(1)} s
      </text>

      {/* Line */}
      <path d={path} fill="none" stroke="#3B82F6" stroke-width="2" />
    </svg>
  );
};

// Energy distribution chart (simple bar chart)
const EnergyChart: Component<{ sim: any }> = (props) => {
  const sim = props.sim;
  const width = 600;
  const height = 250;
  const padding = 40;

  const maxEnergy = Math.max(sim.energy_rated, sim.energy_max, sim.energy_usable);
  const barWidth = 80;
  const gap = 60;

  const yScale = (e: number) => (e / maxEnergy) * (height - 2 * padding);

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
      {/* Grid */}
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#374151" />
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#374151" />

      {/* Y-axis label */}
      <text x={padding - 5} y={padding + 5} fill="#9CA3AF" font-size="10" text-anchor="end">
        {maxEnergy.toFixed(1)} kJ
      </text>

      {/* Rated Energy */}
      <rect
        x={padding + gap}
        y={height - padding - yScale(sim.energy_rated)}
        width={barWidth}
        height={yScale(sim.energy_rated)}
        fill="#3B82F6"
        rx="4"
      />
      <text x={padding + gap + barWidth / 2} y={height - padding + 15} fill="#9CA3AF" font-size="10" text-anchor="middle">
        额定
      </text>
      <text x={padding + gap + barWidth / 2} y={height - padding - yScale(sim.energy_rated) - 5} fill="#3B82F6" font-size="10" text-anchor="middle">
        {sim.energy_rated.toFixed(1)}
      </text>

      {/* Max Energy */}
      <rect
        x={padding + gap * 2 + barWidth}
        y={height - padding - yScale(sim.energy_max)}
        width={barWidth}
        height={yScale(sim.energy_max)}
        fill="#10B981"
        rx="4"
      />
      <text x={padding + gap * 2 + barWidth + barWidth / 2} y={height - padding + 15} fill="#9CA3AF" font-size="10" text-anchor="middle">
        最大
      </text>
      <text x={padding + gap * 2 + barWidth + barWidth / 2} y={height - padding - yScale(sim.energy_max) - 5} fill="#10B981" font-size="10" text-anchor="middle">
        {sim.energy_max.toFixed(1)}
      </text>

      {/* Usable Energy */}
      <rect
        x={padding + gap * 3 + barWidth * 2}
        y={height - padding - yScale(sim.energy_usable)}
        width={barWidth}
        height={yScale(sim.energy_usable)}
        fill="#F59E0B"
        rx="4"
      />
      <text x={padding + gap * 3 + barWidth * 2 + barWidth / 2} y={height - padding + 15} fill="#9CA3AF" font-size="10" text-anchor="middle">
        可用
      </text>
      <text x={padding + gap * 3 + barWidth * 2 + barWidth / 2} y={height - padding - yScale(sim.energy_usable) - 5} fill="#F59E0B" font-size="10" text-anchor="middle">
        {sim.energy_usable.toFixed(1)}
      </text>
    </svg>
  );
};

// Flywheel section visualization
const FlywheelSectionViz: Component<{ params: any }> = (props) => {
  const p = props.params;
  const maxR = p.r_o;
  const scale = 100 / maxR;

  return (
    <svg width="240" height="240" viewBox="0 0 240 240">
      {/* Outer circle */}
      <circle
        cx="120"
        cy="120"
        r={p.r_o * scale}
        fill="none"
        stroke="#3B82F6"
        stroke-width="2"
      />
      {/* Inner circle (if has bore) */}
      {p.r_i > 0 && (
        <circle
          cx="120"
          cy="120"
          r={p.r_i * scale}
          fill="none"
          stroke="#10B981"
          stroke-width="2"
        />
      )}
      {/* Hub circle */}
      {p.r_hub > 0 && p.r_hub < p.r_o && (
        <circle
          cx="120"
          cy="120"
          r={p.r_hub * scale}
          fill="none"
          stroke="#8B5CF6"
          stroke-width="1"
          stroke-dasharray="4 4"
        />
      )}
      {/* Center point */}
      <circle cx="120" cy="120" r="3" fill="#9CA3AF" />
      {/* Crosshair */}
      <line x1="20" y1="120" x2="220" y2="120" stroke="#374151" stroke-width="0.5" />
      <line x1="120" y1="20" x2="120" y2="220" stroke="#374151" stroke-width="0.5" />
      {/* Dimension line */}
      <line x1="120" y1="120" x2={120 + p.r_o * scale} y2="120" stroke="#EF4444" stroke-width="1" />
      <text x={120 + p.r_o * scale / 2} y="115" fill="#EF4444" font-size="10" text-anchor="middle">
        R_o = {p.r_o} mm
      </text>
      {p.r_i > 0 && (
        <>
          <line x1="120" y1="120" x2={120 + p.r_i * scale} y2="120" stroke="#10B981" stroke-width="1" />
          <text x={120 + p.r_i * scale / 2} y="130" fill="#10B981" font-size="10" text-anchor="middle">
            R_i = {p.r_i} mm
          </text>
        </>
      )}
    </svg>
  );
};

export default VisualizationPanel;
