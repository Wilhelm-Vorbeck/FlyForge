import { Component } from "solid-js";
import { useAppContext } from "../../store";

interface CompactInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit: string;
  min?: number;
  max?: number;
  step?: number;
}

const CompactInput: Component<CompactInputProps> = (props) => (
  <div class="flex items-center justify-between">
    <label class="text-xs text-gray-400 w-16 flex-shrink-0">{props.label}</label>
    <div class="flex items-center space-x-1 flex-1 ml-2">
      <input
        type="range"
        min={props.min ?? 0}
        max={props.max ?? 10000}
        step={props.step ?? 1}
        value={props.value}
        onInput={(e) => props.onChange(parseFloat(e.target.value))}
        class="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
      <input
        type="number"
        value={props.value}
        onInput={(e) => props.onChange(parseFloat(e.target.value) || 0)}
        min={props.min}
        max={props.max}
        step={props.step}
        class="w-16 bg-gray-700 border border-gray-600 rounded px-1.5 py-0.5 text-white text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <span class="text-[10px] text-gray-500 w-8">{props.unit}</span>
    </div>
  </div>
);

const OperatingTab: Component = () => {
  const ctx = useAppContext();
  const p = () => ctx.state().params;

  return (
    <div class="space-y-2.5">
      {/* Speed */}
      <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">转速</h3>
      <div class="space-y-2">
        <CompactInput label="额定" value={p().rpm_rated} onChange={(v) => ctx.setParams({ rpm_rated: v })} unit="rpm" min={100} max={50000} step={100} />
        <CompactInput label="最大" value={p().rpm_max} onChange={(v) => ctx.setParams({ rpm_max: v })} unit="rpm" min={100} max={100000} step={100} />
        <CompactInput label="最小" value={p().rpm_min} onChange={(v) => ctx.setParams({ rpm_min: v })} unit="rpm" min={0} max={50000} step={100} />
      </div>

      {/* Safety factors */}
      <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-1">安全系数</h3>
      <div class="space-y-2">
        <CompactInput label="屈服" value={p().safety_factor_yield} onChange={(v) => ctx.setParams({ safety_factor_yield: v })} unit="-" min={1.0} max={5.0} step={0.1} />
        <CompactInput label="疲劳" value={p().safety_factor_fatigue} onChange={(v) => ctx.setParams({ safety_factor_fatigue: v })} unit="-" min={1.0} max={5.0} step={0.1} />
        <CompactInput label="破裂" value={p().safety_factor_burst} onChange={(v) => ctx.setParams({ safety_factor_burst: v })} unit="-" min={1.0} max={10.0} step={0.1} />
      </div>

      {/* Discretization */}
      <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-1">计算</h3>
      <div class="space-y-2">
        <CompactInput label="离散点" value={p().n_points} onChange={(v) => ctx.setParams({ n_points: v })} unit="点" min={20} max={500} step={10} />
      </div>

      {/* Speed range bar */}
      <div class="bg-gray-700/50 rounded p-2 mt-2">
        <div class="relative h-4 bg-gray-600 rounded-full overflow-hidden">
          <div class="absolute top-0 bottom-0 left-0 bg-green-500/40"
            style={{ width: `${(p().rpm_min / p().rpm_max) * 100}%` }} />
          <div class="absolute top-0 bottom-0 bg-blue-500/40"
            style={{ left: `${(p().rpm_min / p().rpm_max) * 100}%`, width: `${((p().rpm_rated - p().rpm_min) / p().rpm_max) * 100}%` }} />
          <div class="absolute top-0 bottom-0 right-0 bg-red-500/40"
            style={{ width: `${((p().rpm_max - p().rpm_rated) / p().rpm_max) * 100}%` }} />
        </div>
        <div class="flex justify-between mt-1 text-[10px] text-gray-500">
          <span>{p().rpm_min.toLocaleString()}</span>
          <span>{p().rpm_rated.toLocaleString()}</span>
          <span>{p().rpm_max.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export default OperatingTab;
