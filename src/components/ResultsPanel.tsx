import { Component, Show, For, createResource, createSignal } from "solid-js";
import { useAppContext } from "../store";
import ExportPanel from "./ExportPanel";
import { getFatigueEstimate } from "../services/api";

interface MiniCardProps {
  label: string;
  value: string;
  unit: string;
  warn?: boolean;
}

const MiniCard: Component<MiniCardProps> = (props) => (
  <div class={`border rounded px-2 py-1.5 ${props.warn ? "bg-red-900/20 border-red-800/50" : "bg-[#111a22]/60 border-[#1a2e22]"}`}>
    <p class="text-[10px] text-gray-500 truncate leading-none mb-0.5">{props.label}</p>
    <p class="text-xs font-bold text-white leading-none">
      {props.value}
      <span class="text-[9px] font-normal text-gray-400 ml-0.5">{props.unit}</span>
    </p>
  </div>
);

const CRITERIA = [
  { value: "Goodman", label: "Goodman (保守)" },
  { value: "Gerber", label: "Gerber (抛物线)" },
  { value: "Soderberg", label: "Soderberg (最保守)" },
];

const ResultsPanel: Component = () => {
  const ctx = useAppContext();
  const sim = () => ctx.state().simulation;
  const [criterion, setCriterion] = createSignal("Goodman");

  // Fatigue estimation — re-fetches when simulation or criterion changes
  const [fatigue] = createResource(
    () => ({ sim: sim(), crit: criterion() }),
    async ({ sim: s, crit }) => {
      if (!s) return null;
      try {
        return await getFatigueEstimate(s, crit);
      } catch {
        return null;
      }
    }
  );

  return (
    <div class="space-y-3">
      {/* Title */}
      <div class="flex items-center space-x-2">
        <h3 class="text-xs font-semibold text-gray-400">计算结果</h3>
      </div>

      {/* Error */}
      <Show when={ctx.state().error && !ctx.state().isLoading}>
        <div class="bg-red-900/20 border border-red-800/50 rounded px-2 py-1.5">
          <p class="text-[10px] text-red-400">{ctx.state().error}</p>
        </div>
      </Show>

      <Show
        when={sim()}
        fallback={
          <div class="text-center py-8 text-gray-500 text-[10px]">
            <p>修改参数后自动计算</p>
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

            {/* Fatigue estimation */}
            <Show when={fatigue()}>
              {(f) => (
                <div class={`rounded px-2 py-1.5 border ${
                  f().infinite_life ? "bg-[#0f2a1a]/60 border-[#1a4a2e]" : f().years > 5
                    ? "bg-[#1a2e22]/60 border-[#1a4a2e]" : "bg-red-900/20 border-red-800/50"
                }`}>
                  <div class="flex items-center justify-between mb-0.5">
                    <p class="text-[9px] text-gray-500">疲劳寿命估算</p>
                    <select value={criterion()} onChange={(e) => setCriterion(e.target.value)}
                      class="bg-[#0d1419] border border-[#1a2e22] rounded px-1 py-0 text-[8px] text-gray-400 focus:outline-none">
                      {CRITERIA.map(c => <option value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <p class={`text-[10px] font-medium leading-relaxed ${
                    f().infinite_life ? "text-green-400" : f().years > 5 ? "text-gray-300" : "text-red-400"
                  }`}>
                    {f().life_description}
                  </p>
                  <p class="text-[8px] text-gray-500 mt-0.5">
                    σ_a={f().stress_amplitude.toFixed(1)}MPa · 安全裕度={f().safety_margin > 0 ? "+" : ""}{f().safety_margin.toFixed(2)}
                  </p>
                </div>
              )}
            </Show>

            {/* Status */}
            <div class={`rounded px-2 py-1.5 flex items-center space-x-1.5 ${
              s().safety_passed ? "bg-[#0f2a1a]/60 border border-[#1a4a2e]" : "bg-red-900/20 border border-red-800/50"
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
