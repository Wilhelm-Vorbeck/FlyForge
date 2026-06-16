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
          max={props.max || 10000}
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

const OperatingTab: Component = () => {
  const context = useAppContext();
  const params = () => context.state().params;

  return (
    <div>
      <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
        运行工况参数
      </h3>

      {/* Speed parameters */}
      <div class="mb-6">
        <h4 class="text-xs font-medium text-gray-500 uppercase mb-3">转速设置</h4>
        
        <InputField
          label="额定转速"
          value={params().rpm_rated}
          onChange={(v) => context.setParams({ rpm_rated: v })}
          unit="rpm"
          min={100}
          max={50000}
          step={100}
        />

        <InputField
          label="最大转速"
          value={params().rpm_max}
          onChange={(v) => context.setParams({ rpm_max: v })}
          unit="rpm"
          min={100}
          max={100000}
          step={100}
        />

        <InputField
          label="最小转速"
          value={params().rpm_min}
          onChange={(v) => context.setParams({ rpm_min: v })}
          unit="rpm"
          min={0}
          max={50000}
          step={100}
        />
      </div>

      {/* Safety factors */}
      <div class="mb-6">
        <h4 class="text-xs font-medium text-gray-500 uppercase mb-3">安全系数</h4>
        
        <InputField
          label="屈服安全系数"
          value={params().safety_factor_yield}
          onChange={(v) => context.setParams({ safety_factor_yield: v })}
          unit="-"
          min={1.0}
          max={5.0}
          step={0.1}
        />

        <InputField
          label="疲劳安全系数"
          value={params().safety_factor_fatigue}
          onChange={(v) => context.setParams({ safety_factor_fatigue: v })}
          unit="-"
          min={1.0}
          max={5.0}
          step={0.1}
        />

        <InputField
          label="破裂安全系数"
          value={params().safety_factor_burst}
          onChange={(v) => context.setParams({ safety_factor_burst: v })}
          unit="-"
          min={1.0}
          max={10.0}
          step={0.1}
        />
      </div>

      {/* Discretization */}
      <div>
        <h4 class="text-xs font-medium text-gray-500 uppercase mb-3">计算设置</h4>
        
        <InputField
          label="径向离散点数"
          value={params().n_points}
          onChange={(v) => context.setParams({ n_points: v })}
          unit="点"
          min={20}
          max={500}
          step={10}
        />
      </div>

      {/* Speed range visualization */}
      <div class="mt-6 p-4 bg-gray-700 rounded-lg">
        <h4 class="text-sm font-medium text-gray-300 mb-3">转速范围</h4>
        <div class="relative h-8 bg-gray-600 rounded-full overflow-hidden">
          {/* Min speed marker */}
          <div
            class="absolute top-0 bottom-0 left-0 bg-green-500 opacity-50"
            style={{
              width: `${(params().rpm_min / params().rpm_max) * 100}%`,
            }}
          />
          {/* Rated speed marker */}
          <div
            class="absolute top-0 bottom-0 bg-blue-500 opacity-50"
            style={{
              left: `${(params().rpm_min / params().rpm_max) * 100}%`,
              width: `${((params().rpm_rated - params().rpm_min) / params().rpm_max) * 100}%`,
            }}
          />
          {/* Max speed marker */}
          <div
            class="absolute top-0 bottom-0 right-0 bg-red-500 opacity-50"
            style={{
              width: `${((params().rpm_max - params().rpm_rated) / params().rpm_max) * 100}%`,
            }}
          />
        </div>
        <div class="flex justify-between mt-2 text-xs text-gray-400">
          <span>0</span>
          <span>{params().rpm_min.toLocaleString()} rpm</span>
          <span>{params().rpm_rated.toLocaleString()} rpm</span>
          <span>{params().rpm_max.toLocaleString()} rpm</span>
        </div>
      </div>
    </div>
  );
};

export default OperatingTab;
