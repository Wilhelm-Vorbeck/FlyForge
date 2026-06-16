import { Component } from "solid-js";
import { useAppContext } from "../../store";

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit: string;
  min?: number;
  max?: number;
  step?: number;
}

const NumberInput: Component<NumberInputProps> = (props) => {
  const step = props.step ?? 1;
  const min = props.min ?? -Infinity;
  const max = props.max ?? Infinity;

  const increment = () => props.onChange(Math.min(props.value + step, max));
  const decrement = () => props.onChange(Math.max(props.value - step, min));

  return (
    <div class="flex items-center justify-between">
      <label class="text-[10px] text-gray-400 w-12 flex-shrink-0">{props.label}</label>
      <div class="flex items-center flex-1 ml-2">
        <input
          type="number"
          value={props.value}
          onInput={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) props.onChange(Math.min(Math.max(v, min), max));
          }}
          min={min}
          max={max}
          step={step}
          class="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <div class="flex flex-col ml-1">
          <button onClick={increment} class="px-1.5 py-0 text-[9px] bg-gray-600 hover:bg-gray-500 text-gray-300 rounded-t transition-colors">▲</button>
          <button onClick={decrement} class="px-1.5 py-0 text-[9px] bg-gray-600 hover:bg-gray-500 text-gray-300 rounded-b transition-colors">▼</button>
        </div>
        <span class="text-[9px] text-gray-500 w-8 ml-1">{props.unit}</span>
      </div>
    </div>
  );
};

const OperatingTab: Component = () => {
  const ctx = useAppContext();
  const p = () => ctx.state().params;

  return (
    <div class="space-y-3">
      {/* Speed */}
      <h3 class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">转速</h3>
      <div class="space-y-1.5">
        <NumberInput label="额定" value={p().rpm_rated} onChange={(v) => ctx.setParams({ rpm_rated: v })} unit="rpm" min={100} max={50000} step={100} />
        <NumberInput label="最大" value={p().rpm_max} onChange={(v) => ctx.setParams({ rpm_max: v })} unit="rpm" min={100} max={100000} step={100} />
        <NumberInput label="最小" value={p().rpm_min} onChange={(v) => ctx.setParams({ rpm_min: v })} unit="rpm" min={0} max={50000} step={100} />
      </div>

      {/* Safety factors */}
      <h3 class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider pt-1">安全系数</h3>
      <div class="space-y-1.5">
        <NumberInput label="屈服" value={p().safety_factor_yield} onChange={(v) => ctx.setParams({ safety_factor_yield: v })} unit="-" min={1.0} max={5.0} step={0.1} />
        <NumberInput label="疲劳" value={p().safety_factor_fatigue} onChange={(v) => ctx.setParams({ safety_factor_fatigue: v })} unit="-" min={1.0} max={5.0} step={0.1} />
        <NumberInput label="破裂" value={p().safety_factor_burst} onChange={(v) => ctx.setParams({ safety_factor_burst: v })} unit="-" min={1.0} max={10.0} step={0.1} />
      </div>

      {/* Discretization */}
      <h3 class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider pt-1">计算</h3>
      <div class="space-y-1.5">
        <NumberInput label="离散点" value={p().n_points} onChange={(v) => ctx.setParams({ n_points: v })} unit="点" min={20} max={500} step={10} />
      </div>

      {/* Speed range bar */}
      <div class="bg-gray-700/50 rounded p-2 mt-2">
        <div class="relative h-4 bg-gray-600 rounded-full overflow-hidden">
          <div class="absolute top-0 bottom-0 left-0 bg-green-500/40" style={{ width: `${(p().rpm_min / p().rpm_max) * 100}%` }} />
          <div class="absolute top-0 bottom-0 bg-blue-500/40" style={{ left: `${(p().rpm_min / p().rpm_max) * 100}%`, width: `${((p().rpm_rated - p().rpm_min) / p().rpm_max) * 100}%` }} />
          <div class="absolute top-0 bottom-0 right-0 bg-red-500/40" style={{ width: `${((p().rpm_max - p().rpm_rated) / p().rpm_max) * 100}%` }} />
        </div>
        <div class="flex justify-between mt-1 text-[9px] text-gray-500">
          <span>{p().rpm_min.toLocaleString()}</span>
          <span>{p().rpm_rated.toLocaleString()}</span>
          <span>{p().rpm_max.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export default OperatingTab;
