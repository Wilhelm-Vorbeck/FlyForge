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
        max={props.max ?? 500}
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
      <span class="text-[10px] text-gray-500 w-6">{props.unit}</span>
    </div>
  </div>
);

const GeometryTab: Component = () => {
  const ctx = useAppContext();
  const p = () => ctx.state().params;

  return (
    <div class="space-y-2.5">
      <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">几何尺寸</h3>
      <div class="space-y-2">
        <CompactInput label="外径 Ro" value={p().r_o} onChange={(v) => ctx.setParams({ r_o: v })} unit="mm" min={10} max={1000} />
        <CompactInput label="内径 Ri" value={p().r_i} onChange={(v) => ctx.setParams({ r_i: v })} unit="mm" min={0} max={500} />
        <CompactInput label="轮缘厚" value={p().thickness} onChange={(v) => ctx.setParams({ thickness: v })} unit="mm" min={1} max={200} />
        <CompactInput label="轮毂径" value={p().r_hub} onChange={(v) => ctx.setParams({ r_hub: v })} unit="mm" min={0} max={500} />
        <CompactInput label="轮毂厚" value={p().hub_thickness} onChange={(v) => ctx.setParams({ hub_thickness: v })} unit="mm" min={1} max={200} />
      </div>

      {/* Mini section preview */}
      <div class="bg-gray-700/50 rounded p-2 flex items-center justify-center">
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#3B82F6" stroke-width="1.5" />
          {p().r_i > 0 && (
            <circle cx="50" cy="50" r={45 * (p().r_i / p().r_o)} fill="none" stroke="#10B981" stroke-width="1.5" />
          )}
          {p().r_hub > 0 && p().r_hub < p().r_o && (
            <circle cx="50" cy="50" r={45 * (p().r_hub / p().r_o)} fill="none" stroke="#8B5CF6" stroke-width="0.8" stroke-dasharray="3 3" />
          )}
          <circle cx="50" cy="50" r="1.5" fill="#9CA3AF" />
          <line x1="50" y1="5" x2="50" y2="95" stroke="#374151" stroke-width="0.3" />
          <line x1="5" y1="50" x2="95" y2="50" stroke="#374151" stroke-width="0.3" />
        </svg>
      </div>
    </div>
  );
};

export default GeometryTab;
