import { Component, Show, For } from "solid-js";
import { useAppContext } from "../store";
import { runSimulationWithState } from "../services/api";
import ExportPanel from "./ExportPanel";

interface MiniCardProps {
  label: string;
  value: string;
  unit: string;
  color?: string;
  warn?: boolean;
}

const MiniCard: Component<MiniCardProps> = (props) => (
  <div class={`bg-gray-800 border rounded px-3 py-2 ${props.warn ? "border-red-700/60" : "border-gray-700"}`}>
    <p class="text-[10px] text-gray-500 truncate">{props.label}</p>
    <p class="text-sm font-bold text-white">
      {props.value}
      <span class="text-[10px] font-normal text-gray-400 ml-0.5">{props.unit}</span>
    </p>
  </div>
);

const ResultsPanel: Component = () => {
  const ctx = useAppContext();
  const sim = () => ctx.state().simulation;

  return (
    <div class="space-y-4">
      {/* Header + Run button */}
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold text-gray-300">计算结果</h2>
        <button
          onClick={() => {
            runSimulationWithState(ctx.state().params, ctx.setLoading, ctx.setError, ctx.setSimulation);
          }}
          disabled={ctx.state().isLoading}
          class="btn-primary py-1.5 px-3"
        >
          {ctx.state().isLoading ? "计算中..." : "运行仿真"}
        </button>
      </div>

      <Show
        when={sim()}
        fallback={
          <div class="text-center py-16 text-gray-500">
            <svg class="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p class="text-sm">配置参数并运行仿真</p>
          </div>
        }
      >
        {(simulation) => (
          <div class="space-y-4">
            {/* Basic properties - 4 column */}
            <div class="grid grid-cols-4 gap-2">
              <MiniCard label="质量" value={simulation().mass.toFixed(2)} unit="kg" />
              <MiniCard label="惯量" value={simulation().moment_of_inertia.toFixed(4)} unit="kg·m²" />
              <MiniCard label="最大应力" value={simulation().max_stress_rated.toFixed(1)} unit="MPa" />
              <MiniCard label="应力位置" value={simulation().max_stress_location.toFixed(1)} unit="mm" />
            </div>

            {/* Safety - 3 column */}
            <div class="grid grid-cols-3 gap-2">
              <MiniCard
                label="屈服安全系数"
                value={simulation().actual_safety_yield.toFixed(2)}
                unit="-"
                warn={simulation().actual_safety_yield < 1.5}
              />
              <MiniCard
                label="疲劳安全系数"
                value={simulation().actual_safety_fatigue.toFixed(2)}
                unit="-"
                warn={simulation().actual_safety_fatigue < 1.5}
              />
              <MiniCard label="安全破裂转速" value={simulation().rpm_burst_safe.toFixed(0)} unit="rpm" />
            </div>

            {/* Energy - 4 column */}
            <div class="grid grid-cols-4 gap-2">
              <MiniCard label="额定储能" value={simulation().energy_rated.toFixed(2)} unit="kJ" />
              <MiniCard label="最大储能" value={simulation().energy_max.toFixed(2)} unit="kJ" />
              <MiniCard label="可用能量" value={simulation().energy_usable.toFixed(2)} unit="kJ" />
              <MiniCard label="比能量" value={simulation().specific_energy.toFixed(2)} unit="Wh/kg" />
            </div>

            {/* Safety warnings */}
            <Show when={simulation().safety_warnings.length > 0}>
              <div class="bg-red-900/20 border border-red-800/50 rounded px-3 py-2">
                <ul class="space-y-0.5">
                  <For each={simulation().safety_warnings}>
                    {(w) => <li class="text-xs text-red-400">⚠ {w}</li>}
                  </For>
                </ul>
              </div>
            </Show>

            {/* Safety status */}
            <div class={`rounded px-3 py-2 flex items-center space-x-2 ${
              simulation().safety_passed ? "bg-green-900/20 border border-green-800/50" : "bg-red-900/20 border border-red-800/50"
            }`}>
              <div class={`w-2.5 h-2.5 rounded-full ${simulation().safety_passed ? "bg-green-500" : "bg-red-500"}`} />
              <span class={`text-xs font-medium ${simulation().safety_passed ? "text-green-400" : "text-red-400"}`}>
                {simulation().safety_passed ? "安全评估通过" : "安全评估未通过"}
              </span>
            </div>

            {/* Export - inline row */}
            <ExportPanel />
          </div>
        )}
      </Show>
    </div>
  );
};

export default ResultsPanel;
