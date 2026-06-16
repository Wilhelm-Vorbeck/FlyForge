import { Component, Show, For } from "solid-js";
import { useAppContext } from "../store";
import { runSimulationWithState } from "../services/api";
import ExportPanel from "./ExportPanel";

interface MiniCardProps {
  label: string;
  value: string;
  unit: string;
  warn?: boolean;
}

const MiniCard: Component<MiniCardProps> = (props) => (
  <div class={`border rounded px-2 py-1.5 ${props.warn ? "bg-red-900/20 border-red-800/50" : "bg-gray-700/50 border-gray-700"}`}>
    <p class="text-[10px] text-gray-500 truncate leading-none mb-0.5">{props.label}</p>
    <p class="text-xs font-bold text-white leading-none">
      {props.value}
      <span class="text-[9px] font-normal text-gray-400 ml-0.5">{props.unit}</span>
    </p>
  </div>
);

const ResultsPanel: Component = () => {
  const ctx = useAppContext();
  const sim = () => ctx.state().simulation;

  return (
    <div class="space-y-3">
      {/* Run button */}
      <button
        onClick={() => runSimulationWithState(ctx.state().params, ctx.setLoading, ctx.setError, ctx.setSimulation)}
        disabled={ctx.state().isLoading}
        class="w-full btn-primary py-1.5 text-xs"
      >
        {ctx.state().isLoading ? "计算中..." : "▶ 运行仿真"}
      </button>

      <Show
        when={sim()}
        fallback={
          <div class="text-center py-8 text-gray-500 text-xs">
            <p>配置参数后点击运行</p>
          </div>
        }
      >
        {(s) => (
          <div class="space-y-2.5">
            {/* Basic */}
            <div class="grid grid-cols-2 gap-1.5">
              <MiniCard label="质量" value={s().mass.toFixed(2)} unit="kg" />
              <MiniCard label="惯量" value={s().moment_of_inertia.toFixed(4)} unit="kg·m²" />
              <MiniCard label="最大应力" value={s().max_stress_rated.toFixed(1)} unit="MPa" />
              <MiniCard label="应力位置" value={s().max_stress_location.toFixed(1)} unit="mm" />
            </div>

            {/* Safety */}
            <div class="grid grid-cols-1 gap-1.5">
              <MiniCard label="屈服安全系数" value={s().actual_safety_yield.toFixed(2)} unit="-" warn={s().actual_safety_yield < 1.5} />
              <MiniCard label="疲劳安全系数" value={s().actual_safety_fatigue.toFixed(2)} unit="-" warn={s().actual_safety_fatigue < 1.5} />
              <MiniCard label="安全破裂转速" value={s().rpm_burst_safe.toFixed(0)} unit="rpm" />
            </div>

            {/* Energy */}
            <div class="grid grid-cols-2 gap-1.5">
              <MiniCard label="额定储能" value={s().energy_rated.toFixed(2)} unit="kJ" />
              <MiniCard label="可用能量" value={s().energy_usable.toFixed(2)} unit="kJ" />
              <MiniCard label="比能量" value={s().specific_energy.toFixed(2)} unit="Wh/kg" />
              <MiniCard label="最大储能" value={s().energy_max.toFixed(2)} unit="kJ" />
            </div>

            {/* Safety warnings */}
            <Show when={s().safety_warnings.length > 0}>
              <div class="bg-red-900/20 border border-red-800/50 rounded px-2 py-1.5">
                <For each={s().safety_warnings}>
                  {(w) => <p class="text-[10px] text-red-400">⚠ {w}</p>}
                </For>
              </div>
            </Show>

            {/* Status */}
            <div class={`rounded px-2 py-1.5 flex items-center space-x-1.5 ${
              s().safety_passed ? "bg-green-900/20 border border-green-800/50" : "bg-red-900/20 border border-red-800/50"
            }`}>
              <div class={`w-2 h-2 rounded-full ${s().safety_passed ? "bg-green-500" : "bg-red-500"}`} />
              <span class={`text-[10px] font-medium ${s().safety_passed ? "text-green-400" : "text-red-400"}`}>
                {s().safety_passed ? "安全评估通过" : "安全评估未通过"}
              </span>
            </div>

            {/* Export */}
            <ExportPanel />
          </div>
        )}
      </Show>
    </div>
  );
};

export default ResultsPanel;
