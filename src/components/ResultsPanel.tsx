import { Component, Show, For } from "solid-js";
import { useAppContext } from "../store";
import { runSimulationWithState } from "../services/api";
import ExportPanel from "./ExportPanel";

interface ResultCardProps {
  title: string;
  value: string;
  unit: string;
  icon: string;
  color?: string;
}

const ResultCard: Component<ResultCardProps> = (props) => {
  return (
    <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-gray-400">{props.title}</span>
        <div
          class="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: `${props.color || "#3B82F6"}20` }}
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke={props.color || "#3B82F6"}
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d={props.icon}
            />
          </svg>
        </div>
      </div>
      <div class="flex items-baseline space-x-2">
        <span class="text-2xl font-bold text-white">{props.value}</span>
        <span class="text-sm text-gray-400">{props.unit}</span>
      </div>
    </div>
  );
};

const ResultsPanel: Component = () => {
  const context = useAppContext();
  const sim = () => context.state().simulation;

  return (
    <div>
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-lg font-semibold text-white">计算结果</h2>
        <button
          onClick={() => {
            runSimulationWithState(
              context.state().params,
              context.setLoading,
              context.setError,
              context.setSimulation
            );
          }}
          disabled={context.state().isLoading}
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center space-x-2"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>运行仿真</span>
        </button>
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
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p class="text-lg">配置参数并运行仿真</p>
            <p class="text-sm mt-2">结果将显示在此处</p>
          </div>
        }
      >
        {(simulation) => (
          <div>
            {/* Mass and Inertia */}
            <div class="grid grid-cols-2 gap-4 mb-6">
              <ResultCard
                title="飞轮质量"
                value={simulation().mass.toFixed(2)}
                unit="kg"
                icon="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                color="#10B981"
              />
              <ResultCard
                title="转动惯量"
                value={simulation().moment_of_inertia.toFixed(4)}
                unit="kg·m²"
                icon="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                color="#8B5CF6"
              />
            </div>

            {/* Stress Analysis */}
            <div class="grid grid-cols-2 gap-4 mb-6">
              <ResultCard
                title="最大等效应力"
                value={simulation().max_stress_rated.toFixed(2)}
                unit="MPa"
                icon="M13 10V3L4 14h7v7l9-11h-7z"
                color="#EF4444"
              />
              <ResultCard
                title="应力位置"
                value={simulation().max_stress_location.toFixed(1)}
                unit="mm"
                icon="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                color="#F59E0B"
              />
            </div>

            {/* Safety Factors */}
            <div class="grid grid-cols-3 gap-4 mb-6">
              <ResultCard
                title="屈服安全系数"
                value={simulation().actual_safety_yield.toFixed(2)}
                unit="-"
                icon="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                color={simulation().actual_safety_yield >= 1.5 ? "#10B981" : "#EF4444"}
              />
              <ResultCard
                title="疲劳安全系数"
                value={simulation().actual_safety_fatigue.toFixed(2)}
                unit="-"
                icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                color={simulation().actual_safety_fatigue >= 1.5 ? "#10B981" : "#EF4444"}
              />
              <ResultCard
                title="破裂转速"
                value={simulation().rpm_burst_safe.toFixed(0)}
                unit="rpm"
                icon="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                color="#F59E0B"
              />
            </div>

            {/* Energy */}
            <div class="grid grid-cols-3 gap-4 mb-6">
              <ResultCard
                title="额定储能"
                value={simulation().energy_rated.toFixed(2)}
                unit="kJ"
                icon="M13 10V3L4 14h7v7l9-11h-7z"
                color="#3B82F6"
              />
              <ResultCard
                title="可用能量"
                value={simulation().energy_usable.toFixed(2)}
                unit="kJ"
                icon="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                color="#10B981"
              />
              <ResultCard
                title="比能量"
                value={simulation().specific_energy.toFixed(2)}
                unit="Wh/kg"
                icon="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
                color="#8B5CF6"
              />
            </div>

            {/* Safety Warnings */}
            <Show when={simulation().safety_warnings.length > 0}>
              <div class="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6">
                <h3 class="text-sm font-medium text-red-400 mb-2">安全警告</h3>
                <ul class="space-y-1">
                  <For each={simulation().safety_warnings}>
                    {(warning) => (
                      <li class="text-sm text-red-300">⚠️ {warning}</li>
                    )}
                  </For>
                </ul>
              </div>
            </Show>

            {/* Safety Status */}
            <div
              class={`rounded-lg p-4 mb-6 ${
                simulation().safety_passed
                  ? "bg-green-900/30 border border-green-700"
                  : "bg-red-900/30 border border-red-700"
              }`}
            >
              <div class="flex items-center space-x-2">
                <div
                  class={`w-4 h-4 rounded-full ${
                    simulation().safety_passed ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span
                  class={`font-medium ${
                    simulation().safety_passed ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {simulation().safety_passed ? "安全评估通过" : "安全评估未通过"}
                </span>
              </div>
            </div>

            {/* Export Panel */}
            <ExportPanel />
          </div>
        )}
      </Show>
    </div>
  );
};

export default ResultsPanel;
