import { Component } from "solid-js";
import { useAppContext } from "../../store";

interface InputFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit: string;
  min?: number;
  max?: number;
  step?: number;
}

const InputField: Component<InputFieldProps> = (props) => {
  return (
    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-300 mb-1">
        {props.label}{" "}
        <span class="text-gray-500 text-xs">({props.unit})</span>
      </label>
      <div class="flex items-center space-x-2">
        <input
          type="range"
          min={props.min || 0}
          max={props.max || 1000}
          step={props.step || 1}
          value={props.value}
          onInput={(e) => props.onChange(parseFloat(e.target.value))}
          class="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
        />
        <input
          type="number"
          value={props.value}
          onInput={(e) => props.onChange(parseFloat(e.target.value) || 0)}
          min={props.min}
          max={props.max}
          step={props.step}
          class="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    </div>
  );
};

const GeometryTab: Component = () => {
  const context = useAppContext();
  const params = () => context.state().params;

  return (
    <div>
      <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
        几何尺寸参数
      </h3>

      <InputField
        label="外径 (R_o)"
        value={params().r_o}
        onChange={(v) => context.setParams({ r_o: v })}
        unit="mm"
        min={10}
        max={1000}
        step={1}
      />

      <InputField
        label="内径 (R_i)"
        value={params().r_i}
        onChange={(v) => context.setParams({ r_i: v })}
        unit="mm"
        min={0}
        max={500}
        step={1}
      />

      <InputField
        label="轮缘厚度"
        value={params().thickness}
        onChange={(v) => context.setParams({ thickness: v })}
        unit="mm"
        min={1}
        max={200}
        step={1}
      />

      <InputField
        label="轮毂外径"
        value={params().r_hub}
        onChange={(v) => context.setParams({ r_hub: v })}
        unit="mm"
        min={0}
        max={500}
        step={1}
      />

      <InputField
        label="轮毂厚度"
        value={params().hub_thickness}
        onChange={(v) => context.setParams({ hub_thickness: v })}
        unit="mm"
        min={1}
        max={200}
        step={1}
      />

      {/* Visual preview */}
      <div class="mt-6 p-4 bg-gray-700 rounded-lg">
        <h4 class="text-sm font-medium text-gray-300 mb-3">截面预览</h4>
        <div class="flex items-center justify-center">
          <svg width="200" height="120" viewBox="0 0 200 120">
            {/* Outer circle */}
            <circle
              cx="100"
              cy="60"
              r="50"
              fill="none"
              stroke="#3B82F6"
              stroke-width="2"
            />
            {/* Inner circle */}
            <circle
              cx="100"
              cy="60"
              r={50 * (params().r_i / params().r_o)}
              fill="none"
              stroke="#10B981"
              stroke-width="2"
            />
            {/* Center point */}
            <circle cx="100" cy="60" r="2" fill="#9CA3AF" />
            {/* Dimension lines */}
            <line
              x1="50"
              y1="110"
              x2="150"
              y2="110"
              stroke="#6B7280"
              stroke-width="1"
            />
            <text x="100" y="108" text-anchor="middle" fill="#9CA3AF" font-size="10">
              R_o = {params().r_o} mm
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default GeometryTab;
