import { Component, For } from "solid-js";
import { useAppContext } from "../store";
import { PRESETS, Preset } from "../presets";
import { FlywheelTypeNames } from "../types";

const PresetSelector: Component = () => {
  const context = useAppContext();

  const loadPreset = (preset: Preset) => {
    context.setParams(preset.params);
  };

  return (
    <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 class="text-sm font-medium text-gray-300 mb-3">预设配置</h3>
      <div class="space-y-2 max-h-60 overflow-auto">
        <For each={PRESETS}>
          {(preset) => {
            const isActive = JSON.stringify(preset.params) === JSON.stringify(context.state().params);
            return (
              <button
                onClick={() => loadPreset(preset)}
                class={`w-full text-left p-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-blue-900/50 border border-blue-700"
                    : "bg-gray-700 hover:bg-gray-600 border border-transparent"
                }`}
              >
                <div class="flex items-start justify-between">
                  <div>
                    <p class="text-sm font-medium text-white">{preset.name_zh}</p>
                    <p class="text-xs text-gray-400 mt-0.5">{preset.description}</p>
                  </div>
                  {isActive && (
                    <span class="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                      当前
                    </span>
                  )}
                </div>
                <div class="flex items-center space-x-3 mt-2 text-xs text-gray-400">
                  <span>R{o}={preset.params.r_o}mm</span>
                  <span>{preset.params.rpm_rated}rpm</span>
                  <span>{FlywheelTypeNames[preset.params.flywheel_type]?.zh || ""}</span>
                </div>
              </button>
            );
          }}
        </For>
      </div>
    </div>
  );
};

export default PresetSelector;
