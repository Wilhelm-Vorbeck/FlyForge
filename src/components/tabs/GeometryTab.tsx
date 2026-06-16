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

  const increment = () => {
    const next = Math.min(props.value + step, max);
    props.onChange(next);
  };

  const decrement = () => {
    const next = Math.max(props.value - step, min);
    props.onChange(next);
  };

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
          <button
            onClick={increment}
            class="px-1.5 py-0 text-[9px] bg-gray-600 hover:bg-gray-500 text-gray-300 rounded-t transition-colors"
          >
            ▲
          </button>
          <button
            onClick={decrement}
            class="px-1.5 py-0 text-[9px] bg-gray-600 hover:bg-gray-500 text-gray-300 rounded-b transition-colors"
          >
            ▼
          </button>
        </div>
        <span class="text-[9px] text-gray-500 w-6 ml-1">{props.unit}</span>
      </div>
    </div>
  );
};

const GeometryTab: Component = () => {
  const ctx = useAppContext();
  const p = () => ctx.state().params;

  return (
    <div class="space-y-2">
      <h3 class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">几何尺寸</h3>
      <div class="space-y-1.5">
        <NumberInput label="外径 Ro" value={p().r_o} onChange={(v) => ctx.setParams({ r_o: v })} unit="mm" min={10} max={1000} step={1} />
        <NumberInput label="内径 Ri" value={p().r_i} onChange={(v) => ctx.setParams({ r_i: v })} unit="mm" min={0} max={500} step={1} />
        <NumberInput label="轮缘厚" value={p().thickness} onChange={(v) => ctx.setParams({ thickness: v })} unit="mm" min={1} max={200} step={1} />
        <NumberInput label="轮毂径" value={p().r_hub} onChange={(v) => ctx.setParams({ r_hub: v })} unit="mm" min={0} max={500} step={1} />
        <NumberInput label="轮毂厚" value={p().hub_thickness} onChange={(v) => ctx.setParams({ hub_thickness: v })} unit="mm" min={1} max={200} step={1} />
      </div>
    </div>
  );
};

export default GeometryTab;
